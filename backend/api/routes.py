"""
API Routes Registration

Defines all API endpoints and registers route blueprints.
"""
from flask import Flask
from api.pdf_routes import pdf_bp
from api.localdb_routes import localdb_bp
from api.ai_routes import ai_bp

def register_routes(app: Flask):
    """
    Register all route blueprints with the Flask app.
    
    Args:
        app: Flask application instance
    """
    # Register PDF routes under /api/pdf prefix
    app.register_blueprint(pdf_bp, url_prefix='/api/pdf')
    app.register_blueprint(localdb_bp, url_prefix='/api/localdb')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
