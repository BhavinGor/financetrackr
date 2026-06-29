"""OpenRouter API client for transaction extraction.

Iterates through MODEL_PRIORITY. On 429, respects the retry_after_seconds
from the error body before retrying the same model once. On 404 (deprecated /
unavailable model), skips immediately.
"""
import os
import time
import logging
import requests
from typing import Dict, Any

from .model_registry import MODEL_PRIORITY
from .response_validator import validate_json_response
from .prompts import EXTRACTION_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def extract_structured_data(extracted_text: str) -> Dict[str, Any]:
    """
    Extract transaction data using OpenRouter with smart retry/fallback.

    Raises:
        Exception: If all models fail.
    """
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY not configured")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://financetrackr.app",
        "X-Title": "FinanceTrackr",
        "Content-Type": "application/json",
    }

    errors = []
    total_rate_limited = 0

    for model in MODEL_PRIORITY:
        logger.info(f"Attempting extraction with OpenRouter model: {model}")
        model_rate_limited = False

        for attempt in range(2):
            try:
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                        {"role": "user", "content": f"Extract transaction data from this text:\n\n{extracted_text}"},
                    ],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                }

                response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)

                if response.status_code == 404:
                    logger.warning(f"OpenRouter model {model} not available (404), skipping")
                    errors.append(f"{model}: not available")
                    break

                if response.status_code == 429:
                    err_body = response.json()
                    retry_after = (
                        err_body.get("error", {})
                        .get("metadata", {})
                        .get("retry_after_seconds", 10)
                    )
                    # Cap wait at 10s — if still rate-limited, account is globally limited
                    wait = min(float(retry_after), 10) + 1
                    logger.warning(f"OpenRouter rate limited on {model}, retry_after={retry_after}s (waiting {wait}s)")
                    if attempt == 0:
                        time.sleep(wait)
                        continue
                    model_rate_limited = True
                    errors.append(f"{model}: rate limited")
                    break

                if response.status_code != 200:
                    logger.warning(f"OpenRouter {model} HTTP {response.status_code}: {response.text[:300]}")
                    errors.append(f"{model}: HTTP {response.status_code}")
                    break

                resp_json = response.json()
                choices = resp_json.get("choices", [])
                if not choices:
                    errors.append(f"{model}: empty choices")
                    break

                content = choices[0]["message"].get("content")
                if not content:
                    errors.append(f"{model}: empty content")
                    break
                result = validate_json_response(content)
                logger.info(f"Successfully extracted data using OpenRouter/{model}")
                return result

            except Exception as e:
                logger.warning(f"OpenRouter {model} attempt {attempt + 1} failed: {e}")
                if attempt == 1:
                    errors.append(f"{model}: {e}")

        if model_rate_limited:
            total_rate_limited += 1

        # If 2 models are rate-limited (not necessarily consecutive), bail — account-wide limit
        if total_rate_limited >= 2:
            logger.warning("OpenRouter appears globally rate-limited (2 models hit 429). Bailing out.")
            break

    raise Exception(f"All OpenRouter models failed. Errors: {'; '.join(errors)}")
