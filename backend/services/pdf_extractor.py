"""
PDF Text Extraction Service

Handles PDF text extraction using pdfplumber and PyPDF2.
Supports password-protected PDFs and multi-page documents.

This service is responsible for:
- Detecting encrypted PDFs
- Decrypting password-protected PDFs
- Extracting text content from all pages
- Handling extraction errors gracefully
"""
import PyPDF2
import pdfplumber
import io
from utils.logger import setup_logger

logger = setup_logger(__name__)

class PDFExtractionError(Exception):
    """Base exception for PDF extraction errors"""
    pass

class PDFPasswordRequiredError(PDFExtractionError):
    """Raised when PDF is encrypted and no password provided"""
    pass

class PDFInvalidPasswordError(PDFExtractionError):
    """Raised when provided password is incorrect"""
    pass

def extract_pdf_text(pdf_bytes: bytes, password: str = None) -> str:
    """
    Extract text from PDF file.
    
    Workflow:
    1. Check if PDF is encrypted using PyPDF2
    2. If encrypted, decrypt with provided password
    3. Extract text from all pages using pdfplumber
    4. Return concatenated text with page breaks
    
    Args:
        pdf_bytes: PDF file content as bytes
        password: Optional password for encrypted PDFs
        
    Returns:
        Extracted text content with page breaks
        
    Raises:
        PDFPasswordRequiredError: If PDF is encrypted and no password provided
        PDFInvalidPasswordError: If provided password is incorrect
        PDFExtractionError: If text extraction fails
    """
    logger.info('📄 STEP 1: EXTRACTING TEXT FROM PDF')
    logger.info('-' * 70)
    
    try:
        logger.info(f'   File size: {len(pdf_bytes):,} bytes')
        
        # STEP 1: Check if PDF is encrypted using PyPDF2
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        if pdf_reader.is_encrypted:
            logger.info('   PDF is encrypted')
            if not password:
                logger.info('   No password provided - returning error')
                raise PDFPasswordRequiredError('PDF is password-protected')
            
            # Try to decrypt with provided password
            logger.info('   Attempting decryption with password...')
            decrypt_result = pdf_reader.decrypt(password)
            if not decrypt_result:
                logger.error('   ❌ Decryption failed - invalid password')
                raise PDFInvalidPasswordError('Invalid password')
            logger.info('   ✅ Decryption successful')
        
        # STEP 2: Extract text using pdfplumber
        pdf_file = io.BytesIO(pdf_bytes)
        
        # Try without password first (for non-encrypted PDFs)
        if not pdf_reader.is_encrypted:
            result = _try_extract_without_password(pdf_file)
            if result:
                return result
        
        # For encrypted PDFs, use password
        if password:
            result = _try_extract_with_password(pdf_bytes, password)
            if result:
                return result
        
        raise PDFExtractionError('Failed to extract text from PDF')
            
    except (PDFPasswordRequiredError, PDFInvalidPasswordError):
        # Re-raise password errors as-is
        raise
    except Exception as e:
        logger.error(f'❌ Error extracting text: {type(e).__name__}')
        logger.error(f'   Message: {str(e)[:300]}')
        raise PDFExtractionError(f'Extraction failed: {str(e)}')


def _try_extract_without_password(pdf_file) -> str:
    """
    Try to extract text without password.
    
    Args:
        pdf_file: BytesIO object containing PDF data
        
    Returns:
        Extracted text or None if extraction fails
    """
    try:
        with pdfplumber.open(pdf_file) as pdf:
            total_pages = len(pdf.pages)
            logger.info(f'   Pages: {total_pages}')
            
            full_text = ""
            for idx, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    full_text += text
                full_text += "\n--- PAGE BREAK ---\n"
                char_count = len(text) if text else 0
                logger.info(f'   Page {idx}: {char_count:,} characters')
            
            total_chars = len(full_text)
            logger.info(f'✅ Total text extracted: {total_chars:,} characters')
            return full_text
    except Exception as e:
        error_msg = str(e).lower()
        if 'encrypted' in error_msg or 'password' in error_msg or 'not decrypted' in error_msg:
            logger.info('   File is encrypted - will need password')
            return None
        else:
            raise


def _try_extract_with_password(pdf_bytes: bytes, password: str) -> str:
    """
    Try to extract text with password using PyPDF2 for decryption.
    
    Args:
        pdf_bytes: PDF file content as bytes
        password: Password for decryption
        
    Returns:
        Extracted text or None if extraction fails
    """
    logger.info('   Attempting extraction with password...')
    try:
        # First, decrypt using PyPDF2
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        if not pdf_reader.is_encrypted:
            logger.info('   PDF is not encrypted')
            return None
        
        # Try to decrypt
        decrypt_result = pdf_reader.decrypt(password)
        if not decrypt_result:
            logger.info('   Decryption failed - invalid password')
            return None
        
        logger.info('   Decryption successful')
        
        # Now use pdfplumber on the decrypted bytes
        pdf_file = io.BytesIO(pdf_bytes)
        with pdfplumber.open(pdf_file, password=password) as pdf:
            total_pages = len(pdf.pages)
            logger.info(f'   Pages: {total_pages}')
            
            full_text = ""
            for idx, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    full_text += text
                full_text += "\n--- PAGE BREAK ---\n"
                char_count = len(text) if text else 0
                logger.info(f'   Page {idx}: {char_count:,} characters')
            
            total_chars = len(full_text)
            logger.info(f'✅ Total text extracted: {total_chars:,} characters')
            return full_text
    except Exception as pwd_error:
        logger.error(f'   Password extraction failed: {str(pwd_error)[:200]}')
        return None
