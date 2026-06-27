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
    SQLITE_DB_PATH = os.getenv('SQLITE_DB_PATH', os.path.join(os.path.dirname(__file__), 'data', 'financetrackr.db'))
    
    # AWS Bedrock Configuration
    AWS_ACCESS_KEY_ID = os.getenv('VITE_AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('VITE_AWS_SECRET_ACCESS_KEY')
    AWS_REGION = os.getenv('VITE_AWS_REGION', 'us-east-1')
    USE_OLLAMA = os.getenv('USE_OLLAMA', 'true').lower() == 'true'
    OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')
    OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.2:latest')
    OCR_PROVIDER = os.getenv('OCR_PROVIDER', 'legacy').lower()  # legacy | docling | lighton_hf | ollama_lighton
    OCR_MODEL_ID = os.getenv('OCR_MODEL_ID', 'lightonai/LightOnOCR-2-1B')  # for lighton_hf
    OCR_OLLAMA_URL = os.getenv('OCR_OLLAMA_URL', OLLAMA_URL)
    OCR_OLLAMA_MODEL = os.getenv('OCR_OLLAMA_MODEL', 'maternion/LightOnOCR-2')
    JSON_PROVIDER = os.getenv('JSON_PROVIDER', 'ollama' if USE_OLLAMA else 'bedrock').lower()  # ollama | bedrock | openrouter
    
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
        if cls.JSON_PROVIDER == 'bedrock' and (not cls.AWS_ACCESS_KEY_ID or not cls.AWS_SECRET_ACCESS_KEY):
            raise ValueError(
                "AWS credentials not found. Either set JSON_PROVIDER=ollama/openrouter "
                "or configure VITE_AWS_ACCESS_KEY_ID and VITE_AWS_SECRET_ACCESS_KEY."
            )
