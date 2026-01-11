"""
API Routes Registration

Defines all API endpoints and registers route blueprints.
"""
from flask import Flask
from api.pdf_routes import pdf_bp

def register_routes(app: Flask):
    """
    Register all route blueprints with the Flask app.
    
    Args:
        app: Flask application instance
    """
    # Register PDF routes under /api/pdf prefix
    app.register_blueprint(pdf_bp, url_prefix='/api/pdf')
