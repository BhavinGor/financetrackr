"""OCR extraction through Ollama-hosted vision model.

Default target model: maternion/LightOnOCR-2
"""

import base64
from typing import List

import requests


def extract_pdf_text_with_ollama(file_path: str, model: str, api_url: str) -> str:
    try:
        import fitz  # pymupdf
    except Exception as exc:
        raise ImportError('pymupdf is required for OCR_PROVIDER=ollama_lighton') from exc

    doc = fitz.open(file_path)
    pages_text: List[str] = []

    try:
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            pix = page.get_pixmap(dpi=220)
            img_bytes = pix.tobytes('png')
            img_b64 = base64.b64encode(img_bytes).decode('utf-8')

            payload = {
                'model': model,
                'prompt': (
                    'Extract all visible text from this bank statement page. '
                    'Keep original ordering and line breaks where possible. '
                    'Return plain text only.'
                ),
                'images': [img_b64],
                'stream': False,
                'options': {'temperature': 0},
            }

            response = requests.post(api_url, json=payload, timeout=180)
            response.raise_for_status()
            body = response.json()
            text = (body.get('response') or '').strip()

            pages_text.append(text)
            pages_text.append('\n--- PAGE BREAK ---\n')
    finally:
        doc.close()

    return ''.join(pages_text).strip()
