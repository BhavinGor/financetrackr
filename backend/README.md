# FinanceTrackr Backend

Python Flask backend for PDF processing and AI-powered transaction extraction.

## Architecture

### Directory Structure

```
backend/
├── main.py                 # Application entry point
├── config.py              # Configuration management
├── api/                   # API routes (thin controllers)
│   ├── routes.py         # Route registration
│   └── pdf_routes.py     # PDF endpoints
├── services/             # Business logic layer
│   ├── pdf_extractor.py  # PDF text extraction
│   ├── ai_formatter.py   # AI formatting (Amazon Nova Pro)
│   └── transaction_parser.py  # JSON parsing
├── middleware/           # Middleware (future)
└── utils/                # Utilities
    ├── logger.py         # Logging configuration
    └── validators.py     # Input validation
```

## Layers

### 1. API Layer (`api/`)

Thin controllers that:
- Validate requests
- Call service layer
- Format responses
- Handle HTTP errors

**Example**: `pdf_routes.py` handles PDF upload and delegates to services.

### 2. Service Layer (`services/`)

Business logic:

- **PDF Extractor** (`pdf_extractor.py`)
  - Extracts text from PDFs using pdfplumber
  - Supports password-protected PDFs
  - Handles multi-page documents

- **AI Formatter** (`ai_formatter.py`)
  - Sends text to Amazon Nova Pro
  - Manages prompts for transaction extraction
  - Handles AI API errors

- **Transaction Parser** (`transaction_parser.py`)
  - Parses AI JSON response
  - Validates structure
  - Handles parse errors

### 3. Utils Layer (`utils/`)

- **Logger**: Structured logging to stdout
- **Validators**: Input validation functions

## API Endpoints

### `POST /api/pdf/parse`

Parse PDF and extract transactions.

**Request**:
```
Content-Type: multipart/form-data

file: PDF file
password: (optional) Password for encrypted PDFs
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "accountInfo": {...},
    "summary": {...}
  }
}
```

**Errors**:
- `400`: Invalid request
- `401`: Password required/invalid
- `500`: Extraction/processing error

### `GET /api/pdf/health`

Health check endpoint.

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Start server
python main.py
```

Server runs on `http://localhost:5000`

## Environment Variables

Create `.env.local` in project root:

```env
VITE_AWS_ACCESS_KEY_ID=your-aws-key
VITE_AWS_SECRET_ACCESS_KEY=your-aws-secret
VITE_AWS_REGION=us-east-1
FLASK_DEBUG=True
FLASK_PORT=5000
ALLOWED_ORIGINS=http://localhost:5173
```

## Configuration

See `config.py` for all configuration options:

- AWS Bedrock credentials
- Flask settings (debug, port)
- CORS origins
- PDF processing limits

## Error Handling

Custom exceptions:
- `PDFPasswordRequiredError`: PDF is encrypted
- `PDFInvalidPasswordError`: Wrong password
- `PDFExtractionError`: Text extraction failed

All errors are logged and returned as JSON responses.

## Logging

Structured logging via `utils/logger.py`:

```python
from utils.logger import setup_logger

logger = setup_logger(__name__)
logger.info('Processing started')
logger.error('Error occurred')
```

## Code Style

- **Naming**: snake_case for variables/functions
- **Docstrings**: Google-style docstrings for all functions
- **Type Hints**: Use type hints where applicable
- **Imports**: Absolute imports from project root
