"""Groq API client for transaction extraction.

Used as fallback when OpenRouter is rate-limited or unavailable.
Groq exposes retry-after header on 429 responses — we honour it.
"""
import os
import time
import logging
import requests
from typing import Dict, Any

from .response_validator import validate_json_response
from .prompts import EXTRACTION_SYSTEM_PROMPT

import sys as _sys
logger = logging.getLogger(__name__)
if not logger.handlers:
    _h = logging.StreamHandler(_sys.stdout)
    _h.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s', '%Y-%m-%d %H:%M:%S'))
    logger.addHandler(_h)
    logger.setLevel(logging.INFO)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Ordered by capability / token limits; all verified free-tier as of 2026-06
GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "qwen/qwen3-32b",
    "openai/gpt-oss-120b",
    "llama-3.1-8b-instant",
]


def extract_structured_data_groq(extracted_text: str) -> Dict[str, Any]:
    """
    Extract transaction data using Groq API with retry-after respect.

    Raises:
        ValueError: If GROQ_API_KEY is not set.
        Exception: If all models fail.
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not configured")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    errors = []

    for model in GROQ_MODELS:
        logger.info(f"Attempting extraction with Groq model: {model}")

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

                response = requests.post(GROQ_URL, headers=headers, json=payload, timeout=60)

                if response.status_code == 429:
                    retry_after = int(response.headers.get("retry-after", 15))
                    logger.warning(f"Groq rate limited on {model}, retry_after={retry_after}s")
                    if attempt == 0:
                        time.sleep(retry_after + 1)
                        continue
                    errors.append(f"{model}: rate limited")
                    break

                if response.status_code != 200:
                    logger.warning(f"Groq {model} HTTP {response.status_code}: {response.text[:300]}")
                    errors.append(f"{model}: HTTP {response.status_code}")
                    break

                resp_json = response.json()
                choices = resp_json.get("choices", [])
                if not choices:
                    errors.append(f"{model}: empty choices")
                    break

                content = choices[0]["message"]["content"]
                result = validate_json_response(content)
                logger.info(f"Successfully extracted data using Groq/{model}")
                return result

            except Exception as e:
                logger.warning(f"Groq {model} attempt {attempt + 1} failed: {e}")
                if attempt == 1:
                    errors.append(f"{model}: {e}")

    raise Exception(f"All Groq models failed. Errors: {'; '.join(errors)}")
