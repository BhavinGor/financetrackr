"""
AI Formatting Service

Formats extracted PDF text into structured JSON using either:
- Local Ollama model (default)
- AWS Bedrock (fallback)
"""
import requests
import boto3
from config import Config
from utils.logger import setup_logger

logger = setup_logger(__name__)


class AIFormatterService:
    """Service for AI-powered transaction extraction."""

    def __init__(self):
        self.use_ollama = Config.USE_OLLAMA
        self.model_id = Config.BEDROCK_MODEL_ID
        self.ollama_model = Config.OLLAMA_MODEL
        self.ollama_url = Config.OLLAMA_URL

        self.client = None

    def _ensure_bedrock_client(self):
        if self.client is None:
            self.client = boto3.client(
                'bedrock-runtime',
                region_name=Config.AWS_REGION,
                aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY
            )

    def format_transactions(self, extracted_text: str, provider: str | None = None) -> str:
        if len(extracted_text) > Config.MAX_TEXT_LENGTH:
            logger.warning(
                f'Text too long ({len(extracted_text)} chars), '
                f'truncating to {Config.MAX_TEXT_LENGTH}'
            )
            extracted_text = extracted_text[:Config.MAX_TEXT_LENGTH]

        prompt = self._create_formatting_prompt(extracted_text)

        resolved_provider = (provider or ('ollama' if self.use_ollama else 'bedrock')).lower()

        if resolved_provider == 'ollama':
            logger.info(f'🤖 Processing with Ollama model: {self.ollama_model}')
            return self._format_with_ollama(prompt)

        if resolved_provider != 'bedrock':
            raise ValueError(f'Unsupported formatter provider: {resolved_provider}')

        logger.info(f'🤖 Processing with Bedrock model: {self.model_id}')
        return self._format_with_bedrock(prompt)

    def _format_with_ollama(self, prompt: str) -> str:
        payload = {
            'model': self.ollama_model,
            'prompt': prompt,
            'stream': False,
            'options': {
                'temperature': 0.1,
            }
        }

        response = requests.post(self.ollama_url, json=payload, timeout=180)
        response.raise_for_status()
        body = response.json()
        text = body.get('response', '')

        if not text:
            raise Exception('Empty response from Ollama')

        return text

    def _format_with_bedrock(self, prompt: str) -> str:
        self._ensure_bedrock_client()
        response = self.client.converse(
            modelId=self.model_id,
            messages=[
                {
                    'role': 'user',
                    'content': [{'text': prompt}],
                }
            ],
        )

        content_blocks = response.get('output', {}).get('message', {}).get('content', [])
        if not content_blocks:
            raise Exception('Empty response from Bedrock')

        text = content_blocks[0].get('text', '')
        if not text:
            raise Exception('Empty response from Bedrock')

        return text

    def _create_formatting_prompt(self, extracted_text: str) -> str:
        return """You are a financial data extraction expert.

Task:
1. Read the statement text.
2. Extract transactions and account metadata.
3. Return strict JSON only (no markdown, no commentary).

Rules:
- Exclude opening/closing balance markers such as B/F, Balance Forward, Opening Balance, Closing Balance.
- Include only real transactions.
- Preserve amount formatting when possible.
- Use consistent date strings.

Output schema:
{
  "accountInfo": {
    "accountNumber": "string",
    "bankName": "string",
    "statementPeriod": "string",
    "primaryBalance": "string",
    "linkedAccounts": [
      {
        "name": "string",
        "accountNumber": "string",
        "balance": "string",
        "status": "string"
      }
    ]
  },
  "statementPeriod": "string",
  "transactions": [
    {
      "date": "string",
      "description": "string",
      "amount": "string",
      "type": "Deposit or Withdrawal"
    }
  ],
  "summary": {
    "totalCredits": "string",
    "totalDebits": "string",
    "closingBalance": "string",
    "transactionCount": "string"
  },
  "extractionQuality": {
    "confidence": "high/medium/low",
    "notes": "string"
  }
}

STATEMENT TEXT:
---BEGIN TEXT---
""" + extracted_text + """
---END TEXT---

Return valid JSON only."""
