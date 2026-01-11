"""
PDF API Routes

Handles PDF upload, parsing, and transaction extraction endpoints.

This module defines the API routes for PDF processing.
It acts as a thin controller layer, delegating business logic to services.
"""
import os
from flask import Blueprint, request, jsonify
from services.pdf_extractor import (
    extract_pdf_text,
    PDFPasswordRequiredError,
    PDFInvalidPasswordError,
    PDFExtractionError
)
from services.docling_extractor import extract_pdf_content
from llm.openrouter_client import extract_structured_data
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
        use_docling = os.getenv('USE_DOCLING', 'false').lower() == 'true'
        use_openrouter = os.getenv('USE_OPENROUTER', 'false').lower() == 'true'
        
        logger.info('='*70)
        logger.info(f'📄 PDF PARSING STARTED (Docling={use_docling}, OpenRouter={use_openrouter})')
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
        extracted_text = None
        
        # Save file temporarily for Docling if needed (Docling often requires a path)
        # Using a temp file is safer for libraries that act on paths
        import tempfile
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_pdf:
            file.save(temp_pdf.name)
            temp_pdf_path = temp_pdf.name
            
        try:
            if use_docling:
                try:
                    logger.info("Attempting extraction with Docling...")
                    docling_result = extract_pdf_content(temp_pdf_path)
                    extracted_text = docling_result['raw_text']
                    # Could also use 'tables' if we want to enhance the prompt later
                except Exception as e:
                    logger.error(f"Docling extraction failed: {e}")
                    # Fallback to legacy if configured or just fail? 
                    # Requirement says "Allow fallback to old Bedrock pipeline if disabled"
                    # It doesn't explicitly say fallback on error, but it's good practice.
                    # For now, let's fall back to legacy extraction if Docling fails
                    logger.info("Falling back to legacy PDF extraction...")
                    file.seek(0) # Reset file pointer for legacy read
                    extracted_text = extract_pdf_text(file.read(), password)
            else:
                layout = False # Default legacy behavior
                file.seek(0)
                extracted_text = extract_pdf_text(file.read(), password)
                
        except (PDFPasswordRequiredError, PDFInvalidPasswordError, PDFExtractionError) as e:
            # Clean up temp file
            if os.path.exists(temp_pdf_path):
                os.unlink(temp_pdf_path)
            
            error_map = {
                PDFPasswordRequiredError: ('PDF_PASSWORD_REQUIRED', 'This PDF is password-protected. Please provide a password.', 401),
                PDFInvalidPasswordError: ('PDF_INVALID_PASSWORD', 'Invalid password. Please try again.', 401),
                PDFExtractionError: ('EXTRACTION_FAILED', str(e), 500)
            }
            err_code, err_msg, status = error_map.get(type(e), ('EXTRACTION_FAILED', str(e), 500))
            return jsonify({'error': err_code, 'message': err_msg}), status
            
        finally:
            if os.path.exists(temp_pdf_path):
                os.unlink(temp_pdf_path)
        
        if not extracted_text:
            return jsonify({
                'error': 'EXTRACTION_FAILED',
                'message': 'Could not extract text from PDF'
            }), 500
            
        # STEP 3 & 4: Format and Parse
        extracted_data = None
        
        if use_openrouter:
            try:
                logger.info("Processing with OpenRouter...")
                extracted_data = extract_structured_data(extracted_text)
            except Exception as e:
                logger.error(f"OpenRouter processing failed: {e}")
                # Fallback to Bedrock if OpenRouter fails?
                # User said: "If all models fail -> return a hard failure with logs"
                # But also "Allow fallback to old Bedrock pipeline if disabled"
                # It's safer to fail hard here as requested for Part 3 Fallback Rules.
                return jsonify({
                    'error': 'PROCESSING_FAILED',
                    'message': f'AI processing failed: {str(e)}'
                }), 500
        else:
            # Legacy Bedrock Flow
            try:
                response_text = ai_formatter.format_transactions(extracted_text)
                extracted_data = parse_ai_response(response_text)
            except Exception as e:
                logger.error(f'Legacy processing failed: {str(e)}')
                return jsonify({
                    'error': 'PROCESSING_FAILED',
                    'message': str(e)
                }), 500
        
        transactions_count = len(extracted_data.get('transactions', []))
        logger.info('='*70)
        logger.info(f'✅ PDF PARSING COMPLETE - {transactions_count} transactions extracted')
        logger.info('='*70)
        
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
