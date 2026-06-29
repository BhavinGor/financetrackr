"""
PDF API Routes

Handles PDF upload, parsing, and transaction extraction endpoints.

Extraction fallback chain (when JSON_PROVIDER=openrouter):
  1. OpenRouter  — primary
  2. Groq        — fallback if OpenRouter is down / rate-limited
  3. Ollama      — local fallback of last resort
"""
from flask import Blueprint, request, jsonify
from services.ocr_provider import extract_text
from services.ai_formatter import AIFormatterService
from services.transaction_parser import parse_ai_response
from services.description_enricher import enrich_description
from services.statement_scanner import build_particulars_map
from llm.openrouter_client import extract_structured_data as openrouter_extract
from llm.groq_client import extract_structured_data_groq
from utils.validators import validate_pdf_file
from utils.logger import setup_logger
from config import Config

logger = setup_logger(__name__)

pdf_bp = Blueprint('pdf', __name__)
ai_formatter = AIFormatterService()


@pdf_bp.route('/parse', methods=['POST'])
def parse_pdf():
    """Parse PDF file and extract transaction data."""
    try:
        json_provider = Config.JSON_PROVIDER
        logger.info(f'PDF PARSING STARTED (JSON={json_provider})')

        is_valid, error_message = validate_pdf_file(request)
        if not is_valid:
            return jsonify({'error': error_message}), 400

        file = request.files['file']
        password = request.form.get('password', None)
        pdf_bytes = file.read()

        extracted_text, error_code = extract_text(pdf_bytes, password)
        if error_code:
            status = 401 if 'PASSWORD' in error_code else 500
            return jsonify({'error': error_code, 'message': error_message_for(error_code)}), status

        if not extracted_text:
            return jsonify({'error': 'EXTRACTION_FAILED', 'message': 'Could not extract text from PDF'}), 500

        extracted_data = _extract_with_fallback(extracted_text, json_provider)
        particulars_map = build_particulars_map(extracted_text)
        extracted_data = _enrich_descriptions(extracted_data, particulars_map)

        count = len(extracted_data.get('transactions', []))
        logger.info(f'PDF PARSING COMPLETE — {count} transactions extracted')
        return jsonify({'success': True, 'data': extracted_data}), 200

    except Exception as e:
        logger.exception('ERROR IN parse_pdf')
        return jsonify({'error': 'PARSE_ERROR', 'message': str(e)}), 500


def _extract_with_fallback(extracted_text: str, json_provider: str) -> dict:
    """
    Try providers in order: OpenRouter → Groq → Ollama.
    For non-openrouter providers, use the configured provider directly (no fallback).
    """
    if json_provider != 'openrouter':
        response_text = ai_formatter.format_transactions(extracted_text, provider=json_provider)
        return parse_ai_response(response_text)

    # --- OpenRouter (primary) ---
    try:
        return openrouter_extract(extracted_text)
    except Exception as e:
        logger.warning(f'OpenRouter failed, trying Groq. Reason: {e}')

    # --- Groq (first fallback) ---
    if Config.GROQ_API_KEY:
        try:
            return extract_structured_data_groq(extracted_text)
        except Exception as e:
            logger.warning(f'Groq failed, trying Ollama. Reason: {e}')
    else:
        logger.warning('GROQ_API_KEY not set, skipping Groq fallback')

    # --- Ollama (last resort) ---
    logger.info('Falling back to local Ollama')
    response_text = ai_formatter.format_transactions(extracted_text, provider='ollama')
    return parse_ai_response(response_text)


def _enrich_descriptions(data: dict, particulars_map: dict) -> dict:
    """
    Post-process transactions using the Python description enricher.

    Priority for raw particulars (what to enrich from):
      1. rawParticulars from LLM response (if the model included it)
      2. Matched entry from the statement scanner (date+amount → raw text)
      3. LLM description as last-resort fallback (often too generic to match)

    rawParticulars is stripped from the final output.
    """
    holder = data.get('accountInfo', {}).get('holderName', '')
    transactions = data.get('transactions', [])
    logger.info(f"Enriching {len(transactions)} transactions (holder={holder!r})")
    enriched = []
    for tx in transactions:
        # Scanner has the full raw text (pre+mid+post); LLM only sees the middle
        # of a wrapped table cell.  Always try scanner first.
        amount_key = f"{float(tx.get('amount', 0)):.2f}"
        tx_date = tx.get('date', '')
        scanner_raw = particulars_map.get((tx_date, amount_key))
        scanner_direction = particulars_map.get((tx_date, amount_key, 'direction'))

        if scanner_raw is not None:
            raw = scanner_raw
        else:
            # Ambiguous key or no scanner match → fall back to LLM rawParticulars
            raw = tx.get('rawParticulars', '') or tx.get('description', '')

        # Use scanner-detected direction when unambiguous (overrides LLM)
        tx_type = tx.get('type', '')
        if scanner_direction:
            tx_type = scanner_direction

        enriched_desc = enrich_description(raw, tx_type, holder)
        logger.info(f"  [{tx_date}] raw={raw[:60]!r} dir={tx_type} → {enriched_desc or '(kept LLM desc)'}")
        tx = {k: v for k, v in tx.items() if k != 'rawParticulars'}
        tx['type'] = tx_type
        if enriched_desc:
            tx['description'] = enriched_desc
        enriched.append(tx)
    data['transactions'] = enriched
    return data


@pdf_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'pdf-parser'}), 200


def error_message_for(code: str) -> str:
    messages = {
        'PDF_PASSWORD_REQUIRED': 'This PDF is password-protected. Please provide a password.',
        'PDF_INVALID_PASSWORD': 'Invalid password. Please try again.',
        'EXTRACTION_FAILED': 'Failed to extract text from PDF.',
    }
    return messages.get(code, 'An error occurred processing the PDF.')
