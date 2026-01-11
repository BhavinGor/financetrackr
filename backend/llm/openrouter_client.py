
import os
import requests
import logging
import json
from typing import Dict, Any

from .model_registry import MODEL_PRIORITY
from .retry_handler import execute_with_retry, MaxRetriesExceededError
from .response_validator import validate_json_response

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# System prompt for strict JSON
SYSTEM_PROMPT = """
You are a specialized data extraction assistant.
Your task is to extract structured financial transaction data from the provided text.
output must be strict JSON only.
Do not include any markdown formatting (like ```json ... ```).
Do not include any explanations or conversational text.
Respond with valid JSON only.

The JSON structure should be:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number,
      "type": "DEBIT" or "CREDIT"
    }
  ],
  "accountInfo": {
    "accountNumber": "string or null",
    "bankName": "string or null"
  },
  "summary": {
    "totalDebits": number,
    "totalCredits": number
  }
}
"""

def extract_structured_data(extracted_text: str, max_retries_per_model: int = 3) -> Dict[str, Any]:
    """
    Orchestrates the extraction process using OpenRouter models with fallback.
    
    Args:
        extracted_text: The text extracted from the PDF.
        max_retries_per_model: Number of retries per model.
        
    Returns:
        Structured JSON data.
        
    Raises:
        Exception: If all models fail.
    """
    
    if not OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY not found in environment.")
        # Could raise error here, but maybe caller handles it or user forgot to set it.
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://financetrackr.app", # Required by OpenRouter
        "X-Title": "FinanceTrackr",
        "Content-Type": "application/json"
    }
    
    errors = []

    for model in MODEL_PRIORITY:
        logger.info(f"Attempting extraction with model: {model}")
        
        def attempt_extraction():
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Extract transaction data from this text:\n\n{extracted_text}"}
                ],
                "temperature": 0.1, # Low temp for deterministic output
                "response_format": {"type": "json_object"} # Try to enforce JSON mode if supported
            }
            
            response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60)
            
            if response.status_code != 200:
                raise Exception(f"API Error {response.status_code}: {response.text}")
                
            resp_json = response.json()
            if "choices" not in resp_json or not resp_json["choices"]:
                 raise Exception("Invalid API response format: missing choices")
            
            content = resp_json["choices"][0]["message"]["content"]
            
            # Validate JSON
            return validate_json_response(content)

        try:
            result = execute_with_retry(
                attempt_extraction, 
                max_retries=max_retries_per_model,
                allowed_exceptions=(Exception, ValueError)
            )
            logger.info(f"Successfully extracted data using {model}")
            return result
            
        except MaxRetriesExceededError as e:
            logger.warning(f"All retries failed for model {model}: {e}")
            errors.append(f"{model}: {str(e)}")
            continue # Try next model
            
    # If we get here, all models failed
    error_summary = "; ".join(errors)
    logger.error(f"All models failed to extract data. Errors: {error_summary}")
    raise Exception(f"All extraction attempts failed. Details: {error_summary}")
