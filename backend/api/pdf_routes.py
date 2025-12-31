"""
PDF API Routes

Handles PDF upload, parsing, and transaction extraction endpoints.

This module defines the API routes for PDF processing.
It acts as a thin controller layer, delegating business logic to services.
"""
from flask import Blueprint, request, jsonify
from services.pdf_extractor import (
    extract_pdf_text,
    PDFPasswordRequiredError,
    PDFInvalidPasswordError,
    PDFExtractionError
)
from services.ai_formatter import AIFormatterService
from services.transaction_parser import parse_ai_response
from utils.validators import validate_pdf_file
from utils.logger import setup_logger

logger = setup_logger(__name__)

# Create Blueprint
pdf_bp = Blueprint('pdf', __name__)

# Initialize AI formatter service
ai_formatter = AIFormatterService()

@pdf_bp.route('/parse', methods=['POST'])
def parse_pdf():
    """
    Parse PDF file and extract transaction data.
    
    Workflow:
    1. Validate PDF file
    2. Extract text using pdfplumber (with password support)
    3. Format with Amazon Nova Pro
    4. Parse structured JSON response
    
    Request:
        - file: PDF file (multipart/form-data)
        - password: Optional password for encrypted PDFs
    
    Returns:
        JSON response with extracted transactions and account info:
        {
            "success": true,
            "data": {
                "transactions": [...],
                "accountInfo": {...},
                "summary": {...}
            }
        }
    
    Error Responses:
        - 400: Invalid request (no file, wrong file type)
        - 401: PDF password required or invalid
        - 500: Extraction or processing error
    """
    try:
        logger.info('='*70)
        logger.info('📄 PDF PARSING WITH PDFPLUMBER + NOVA PRO')
        logger.info('='*70)
        
        # STEP 1: Validate request
        is_valid, error_message = validate_pdf_file(request)
        if not is_valid:
            logger.error(f'❌ ERROR: {error_message}')
            return jsonify({'error': error_message}), 400
        
        file = request.files['file']
        password = request.form.get('password', None)
        
        logger.info(f'File name: {file.filename}')
        if password:
            logger.info('Password provided for encrypted PDF')
        
        # STEP 2: Extract text from PDF
        pdf_bytes = file.read()
        
        try:
            extracted_text = extract_pdf_text(pdf_bytes, password)
        except PDFPasswordRequiredError:
            return jsonify({
                'error': 'PDF_PASSWORD_REQUIRED',
                'message': 'This PDF is password-protected. Please provide a password.'
            }), 401
        except PDFInvalidPasswordError:
            return jsonify({
                'error': 'PDF_INVALID_PASSWORD',
                'message': 'Invalid password. Please try again.'
            }), 401
        except PDFExtractionError as e:
            return jsonify({
                'error': 'EXTRACTION_FAILED',
                'message': str(e)
            }), 500
        
        if not extracted_text:
            return jsonify({
                'error': 'EXTRACTION_FAILED',
                'message': 'Could not extract text from PDF'
            }), 500
        
        # STEP 3: Format with Nova Pro
        try:
            response_text = ai_formatter.format_transactions(extracted_text)
        except Exception as e:
            logger.error(f'AI formatting failed: {str(e)}')
            return jsonify({
                'error': 'FORMAT_FAILED',
                'message': 'Could not format extracted text with AI'
            }), 500
        
        # STEP 4: Parse JSON response
        try:
            extracted_data = parse_ai_response(response_text)
        except ValueError as e:
            logger.error(f'JSON parsing failed: {str(e)}')
            return jsonify({
                'error': 'PARSE_FAILED',
                'message': 'Could not parse AI response as JSON'
            }), 500
        
        transactions_count = len(extracted_data.get('transactions', []))
        logger.info('='*70)
        logger.info(f'✅ PDF PARSING COMPLETE - {transactions_count} transactions extracted')
        logger.info('='*70)
        
        # Return in the format expected by frontend
        return jsonify({
            'success': True,
            'data': extracted_data
        }), 200
        
    except Exception as e:
        logger.error('='*70)
        logger.error('❌ ERROR IN parse_pdf')
        logger.error('='*70)
        logger.error(f'Error type: {type(e).__name__}')
        logger.error(f'Error message: {str(e)}')
        import traceback
        traceback.print_exc()
        logger.error('='*70)
        return jsonify({
            'error': 'PARSE_ERROR',
            'message': str(e)
        }), 500


@pdf_bp.route('/health', methods=['GET'])
def health():
    """
    Health check endpoint.
    
    Returns:
        JSON response indicating service status
    """
    return jsonify({'status': 'ok', 'service': 'pdf-parser'}), 200
