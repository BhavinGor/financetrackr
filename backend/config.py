"""
Configuration Management

Loads environment variables and provides configuration for the application.
Supports multiple environments (development, production).

Environment Variables:
- VITE_AWS_ACCESS_KEY_ID: AWS access key for Bedrock API
- VITE_AWS_SECRET_ACCESS_KEY: AWS secret key for Bedrock API
- VITE_AWS_REGION: AWS region (default: us-east-1)
- FLASK_DEBUG: Enable debug mode (default: True)
- FLASK_PORT: Port to run the server (default: 5000)
- ALLOWED_ORIGINS: Comma-separated list of allowed CORS origins
"""
import os
from dotenv import load_dotenv

# Load environment variables from multiple possible locations
env_paths = [
    '.env.local',
    '../.env.local',
    '../../.env.local'
]

for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

class Config:
    """Application configuration class"""
    
    # Flask Configuration
    DEBUG = os.getenv('FLASK_DEBUG', 'True') == 'True'
    PORT = int(os.getenv('FLASK_PORT', 5000))
    
    # AWS Bedrock Configuration
    AWS_ACCESS_KEY_ID = os.getenv('VITE_AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('VITE_AWS_SECRET_ACCESS_KEY')
    AWS_REGION = os.getenv('VITE_AWS_REGION', 'us-east-1')
    
    # CORS Configuration
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
    
    # PDF Processing Configuration
    MAX_PDF_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_TEXT_LENGTH = 50000  # Maximum characters to send to AI
    
    # Bedrock Model Configuration
    BEDROCK_MODEL_ID = 'us.amazon.nova-pro-v1:0'
    
    @classmethod
    def validate(cls):
        """Validate that required configuration is present"""
        if not cls.AWS_ACCESS_KEY_ID or not cls.AWS_SECRET_ACCESS_KEY:
            raise ValueError(
                "AWS credentials not found. Please set VITE_AWS_ACCESS_KEY_ID "
                "and VITE_AWS_SECRET_ACCESS_KEY in your .env.local file"
            )
