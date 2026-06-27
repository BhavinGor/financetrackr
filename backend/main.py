"""
FinanceTrackr Backend API

Main application entry point. Initializes Flask app, registers routes,
and configures middleware.

This is the entry point for the PDF processing backend service.
It provides endpoints for:
- PDF parsing and transaction extraction
- Health checks

Architecture:
- Flask web framework
- Blueprint-based routing
- Service layer for business logic
- AWS Bedrock for AI-powered extraction
"""
from flask import Flask
from flask_cors import CORS
from api.routes import register_routes
from config import Config
from utils.logger import setup_logger
from db_store import init_db

logger = setup_logger(__name__)

def create_app():
    """
    Application factory pattern.
    
    Creates and configures the Flask application instance.
    
    Returns:
        Configured Flask app
    """
    app = Flask(__name__)
    
    # Validate configuration
    try:
        Config.validate()
    except ValueError as e:
        logger.error(f'Configuration error: {str(e)}')
        raise
    
    # Configure CORS
    CORS(app, origins=Config.ALLOWED_ORIGINS)
    logger.info(f'CORS enabled for origins: {Config.ALLOWED_ORIGINS}')
    
    # Register routes
    register_routes(app)
    logger.info('Routes registered')

    # Initialize local SQLite store
    init_db()
    logger.info(f'SQLite initialized at: {Config.SQLITE_DB_PATH}')
    
    return app

if __name__ == '__main__':
    logger.info('🚀 Starting FinanceTrackr PDF Parser API...')
    logger.info(f'📍 Endpoint: http://localhost:{Config.PORT}/api/pdf/parse')
    logger.info(f'🔧 Debug mode: {Config.DEBUG}')
    
    app = create_app()
    app.run(debug=Config.DEBUG, port=Config.PORT)
