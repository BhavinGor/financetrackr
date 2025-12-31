"""
Input Validation Utilities

Provides validation functions for API inputs.
"""
from flask import Request

def validate_pdf_file(request: Request) -> tuple[bool, str]:
    """
    Validate PDF file upload request.
    
    Args:
        request: Flask request object
        
    Returns:
        Tuple of (is_valid, error_message)
        If valid, error_message is empty string
        
    Checks:
    - File is present in request
    - File has a filename
    - File is a PDF (by extension)
    """
    if 'file' not in request.files:
        return False, 'No file provided'
    
    file = request.files['file']
    
    if file.filename == '':
        return False, 'No file selected'
    
    if not file.filename.lower().endswith('.pdf'):
        return False, 'File must be a PDF'
    
    return True, ''

def validate_password(password: str | None) -> bool:
    """
    Validate password string.
    
    Args:
        password: Password string or None
        
    Returns:
        True if password is valid (non-empty string), False otherwise
    """
    return password is not None and len(password.strip()) > 0
