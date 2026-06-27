"""
PDF API Routes

Handles PDF upload, parsing, and transaction extraction endpoints.
"""
from flask import Blueprint, request, jsonify
from services.ocr_provider import extract_text
from services.ai_formatter import AIFormatterService
from services.transaction_parser import parse_ai_response
from llm.openrouter_client import extract_structured_data
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

        extracted_data = None
        if json_provider == 'openrouter':
            extracted_data = extract_structured_data(extracted_text)
        else:
            response_text = ai_formatter.format_transactions(extracted_text, provider=json_provider)
            extracted_data = parse_ai_response(response_text)

        count = len(extracted_data.get('transactions', []))
        logger.info(f'PDF PARSING COMPLETE - {count} transactions extracted')
        return jsonify({'success': True, 'data': extracted_data}), 200

    except Exception as e:
        logger.exception('ERROR IN parse_pdf')
        return jsonify({'error': 'PARSE_ERROR', 'message': str(e)}), 500


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
