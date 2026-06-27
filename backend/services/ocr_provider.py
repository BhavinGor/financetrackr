"""OCR Provider Strategy

Centralizes OCR provider dispatch to eliminate duplicated logic
in encrypted vs non-encrypted PDF paths.
"""
import os
import tempfile
import PyPDF2
from typing import Optional, Tuple

from services.pdf_extractor import extract_pdf_text, PDFPasswordRequiredError, PDFInvalidPasswordError, PDFExtractionError
from services.docling_extractor import extract_pdf_content
from services.ocr_lighton import extract_pdf_text_with_lighton
from services.ocr_ollama import extract_pdf_text_with_ollama
from config import Config
from utils.logger import setup_logger

logger = setup_logger(__name__)


def check_encryption(pdf_bytes: bytes) -> bool:
    """Check if PDF is encrypted using PyPDF2."""
    try:
        pdf_reader = PyPDF2.PdfReader(__import__('io').BytesIO(pdf_bytes))
        return pdf_reader.is_encrypted
    except Exception as e:
        logger.warning(f"Could not check encryption status: {e}")
        return False


def decrypt_pdf(pdf_bytes: bytes, password: str) -> Optional[str]:
    """
    Decrypt PDF and save to temp file.
    Returns temp file path on success, None on failure.
    """
    pdf_reader = PyPDF2.PdfReader(__import__('io').BytesIO(pdf_bytes))
    if not pdf_reader.decrypt(password):
        return None

    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp:
        writer = PyPDF2.PdfWriter()
        for page in pdf_reader.pages:
            writer.add_page(page)
        writer.write(temp)
        temp_path = temp.name
    return temp_path


def extract_text(
    pdf_bytes: bytes,
    password: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract text from PDF using the configured OCR provider.

    Returns:
        (extracted_text, error_code) - one will be None.
        error_code can be: 'PDF_PASSWORD_REQUIRED', 'PDF_INVALID_PASSWORD', 'EXTRACTION_FAILED'
    """
    ocr_provider = Config.OCR_PROVIDER
    is_encrypted = check_encryption(pdf_bytes)

    if is_encrypted:
        if not password:
            return None, 'PDF_PASSWORD_REQUIRED'

        if ocr_provider in ('docling', 'lighton_hf', 'ollama_lighton'):
            temp_path = decrypt_pdf(pdf_bytes, password)
            if temp_path is None:
                return None, 'PDF_INVALID_PASSWORD'
            try:
                text = _extract_with_ocr(temp_path)
                return text, None
            except Exception as e:
                logger.error(f"Advanced encrypted extraction failed ({ocr_provider}): {e}")
                logger.info("Falling back to legacy PDF extraction...")
                return extract_pdf_text(pdf_bytes, password), None
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
        else:
            return extract_pdf_text(pdf_bytes, password), None

    else:
        if ocr_provider in ('docling', 'lighton_hf', 'ollama_lighton'):
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp:
                temp.write(pdf_bytes)
                temp_path = temp.name
            try:
                text = _extract_with_ocr(temp_path)
                return text, None
            except Exception as e:
                logger.error(f"Advanced extraction failed ({ocr_provider}): {e}")
                logger.info("Falling back to legacy PDF extraction...")
                return extract_pdf_text(pdf_bytes, password), None
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
        else:
            return extract_pdf_text(pdf_bytes, password), None


def _extract_with_ocr(temp_path: str) -> Optional[str]:
    """Dispatch to the configured OCR provider."""
    ocr_provider = Config.OCR_PROVIDER

    if ocr_provider == 'docling':
        logger.info(f"Attempting extraction with Docling on: {temp_path}")
        result = extract_pdf_content(temp_path)
        return result['raw_text']

    elif ocr_provider == 'lighton_hf':
        logger.info(f"Attempting extraction with LightOn OCR model {Config.OCR_MODEL_ID}...")
        return extract_pdf_text_with_lighton(temp_path, Config.OCR_MODEL_ID)

    elif ocr_provider == 'ollama_lighton':
        logger.info(f"Attempting extraction with Ollama OCR model {Config.OCR_OLLAMA_MODEL}...")
        return extract_pdf_text_with_ollama(
            temp_path,
            Config.OCR_OLLAMA_MODEL,
            Config.OCR_OLLAMA_URL,
        )

    else:
        raise ValueError(f"Unsupported OCR provider for OCR dispatch: {ocr_provider}")
