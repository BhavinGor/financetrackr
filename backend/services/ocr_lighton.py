"""Optional OCR extractor using Hugging Face model lightonai/LightOnOCR-2-1B.

This path is optional and controlled via OCR_PROVIDER=lighton.
It requires extra dependencies (`transformers`, `torch`, `pymupdf`, `Pillow`).
"""

from typing import List


def extract_pdf_text_with_lighton(file_path: str, model_id: str) -> str:
    try:
        import fitz  # pymupdf
        from PIL import Image
        from transformers import pipeline
    except Exception as exc:
        raise ImportError(
            'LightOn OCR dependencies missing. Install: transformers torch pymupdf Pillow'
        ) from exc

    ocr = pipeline('image-to-text', model=model_id)

    doc = fitz.open(file_path)
    pages_text: List[str] = []

    try:
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            pix = page.get_pixmap(dpi=200)
            image = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
            result = ocr(image)

            if isinstance(result, list) and result:
                text = result[0].get('generated_text', '')
            else:
                text = ''

            pages_text.append(text)
            pages_text.append('\n--- PAGE BREAK ---\n')
    finally:
        doc.close()

    return ''.join(pages_text).strip()
