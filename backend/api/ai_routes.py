"""
AI Proxy Routes

Proxies AI requests (Bedrock, Gemini) through the backend so API keys
never reach the browser.
"""
import json
import os
from flask import Blueprint, request, jsonify
from utils.logger import setup_logger
from config import Config

logger = setup_logger(__name__)

ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/insights', methods=['POST'])
def get_insights():
    """
    Proxy for financial insights generation.
    
    Request body:
        { "transactions": [...], "balance": number, "provider": "bedrock"|"gemini" }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400

        transactions = data.get('transactions', [])
        balance = data.get('balance', 0)
        provider = data.get('provider', 'bedrock')

        recent_tx = transactions[:15]
        recent_str = '\n'.join(
            f"{t.get('date', '')}: {t.get('type', '')} - {t.get('category', '')} (₹{t.get('amount', 0)}) - {t.get('description', '')}"
            for t in recent_tx
        )

        prompt = f"""You are a financial advisor for the "FinanceTrackr" app tailored for an Indian user context.
Current Total Balance: ₹{balance}

Here are the recent transactions:
{recent_str}

Please provide a concise, 3-point financial insight or advice summary based on this data.
Focus on spending habits, potential savings, or budget alerts.
Keep the tone professional yet encouraging.
Format as a markdown list."""

        if provider == 'bedrock':
            return _call_bedrock(prompt, max_tokens=500, temperature=0.7)
        elif provider == 'gemini':
            return _call_gemini(prompt, max_tokens=500, temperature=0.7)
        else:
            return jsonify({'error': f'Unsupported provider: {provider}'}), 400

    except Exception as e:
        logger.exception('Error in /api/ai/insights')
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/extract', methods=['POST'])
def extract_transactions():
    """
    Proxy for PDF transaction extraction.
    
    Request body:
        { "pdf_text": string, "provider": "bedrock"|"gemini" }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400

        pdf_text = data.get('pdf_text', '')
        provider = data.get('provider', 'bedrock')

        if not pdf_text or not pdf_text.strip():
            return jsonify({'error': 'No text available for extraction'}), 400

        prompt = f"""You are a financial data extraction assistant. Analyze this bank statement or bill text and extract transaction information.

PDF Content:
\"\"\"
{pdf_text[:5000]} 
\"\"\"

Extract and return ONLY a JSON object with this exact structure (no markdown, no explanation):
{{
  "accountInfo": {{
    "bankName": "string or null",
    "accountNumber": "last 4 digits only or null",
    "accountHolderName": "string or null"
  }},
  "statementPeriod": {{
    "from": "YYYY-MM-DD or null",
    "to": "YYYY-MM-DD or null"
  }},
  "transactions": [
    {{
      "date": "YYYY-MM-DD",
      "description": "merchant/description",
      "amount": number (absolute value),
      "type": "debit" or "credit",
      "category": "Food|Groceries|Rent|Transport|Fuel|Utilities|Shopping|Entertainment|Salary|Freelance|Insurance|Savings|Other",
      "balance": number or null
    }}
  ]
}}

Rules:
1. Convert all dates STRICTLY to YYYY-MM-DD format (e.g. 2024-03-25). Convert DD/MM/YYYY or MM/DD/YYYY to YYYY-MM-DD.
2. amount should be absolute value (no negatives)
3. type: "debit" for expenses/withdrawals, "credit" for income/deposits
4. Auto-categorize based on merchant/description (be smart about this)
5. If balance is available in PDF, include it
6. Only include actual transactions (ignore headers/footers)
7. Return valid JSON only - no markdown code blocks"""

        if provider == 'bedrock':
            result = _call_bedrock_raw(prompt, max_tokens=4000, temperature=0.1)
        elif provider == 'gemini':
            result = _call_gemini_raw(prompt, max_tokens=4000, temperature=0.1)
        else:
            return jsonify({'error': f'Unsupported provider: {provider}'}), 400

        # Parse JSON from AI response
        extracted = _extract_json(result)
        if not extracted or 'transactions' not in extracted:
            return jsonify({'error': 'No transactions found in PDF'}), 400

        return jsonify({'success': True, 'data': extracted}), 200

    except Exception as e:
        logger.exception('Error in /api/ai/extract')
        return jsonify({'error': str(e)}), 500


def _call_bedrock(prompt: str, max_tokens: int = 500, temperature: float = 0.7):
    """Call AWS Bedrock and return formatted response."""
    import boto3

    client = boto3.client(
        'bedrock-runtime',
        region_name=Config.AWS_REGION,
        aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY,
    )

    payload = {
        "messages": [{"role": "user", "content": [{"text": prompt}]}],
        "inferenceConfig": {"max_new_tokens": max_tokens, "temperature": temperature}
    }

    response = client.invoke_model(
        modelId=Config.BEDROCK_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(payload),
    )

    body = json.loads(response['body'].read())
    text = body['output']['message']['content'][0]['text']
    return jsonify({'insights': text})


def _call_bedrock_raw(prompt: str, max_tokens: int = 4000, temperature: float = 0.1) -> str:
    """Call AWS Bedrock and return raw text."""
    import boto3

    client = boto3.client(
        'bedrock-runtime',
        region_name=Config.AWS_REGION,
        aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY,
    )

    payload = {
        "messages": [{"role": "user", "content": [{"text": prompt}]}],
        "inferenceConfig": {"max_new_tokens": max_tokens, "temperature": temperature}
    }

    response = client.invoke_model(
        modelId=Config.BEDROCK_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(payload),
    )

    body = json.loads(response['body'].read())
    return body['output']['message']['content'][0]['text']


def _call_gemini(prompt: str, max_tokens: int = 500, temperature: float = 0.7):
    """Call Google Gemini and return formatted response."""
    from google import genai

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return jsonify({'error': 'Gemini API key not configured'}), 500

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config={'max_output_tokens': max_tokens, 'temperature': temperature}
    )
    return jsonify({'insights': response.text or 'No insights generated.'})


def _call_gemini_raw(prompt: str, max_tokens: int = 4000, temperature: float = 0.1) -> str:
    """Call Google Gemini and return raw text."""
    from google import genai

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError('Gemini API key not configured')

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config={'max_output_tokens': max_tokens, 'temperature': temperature}
    )
    return response.text or ''


def _extract_json(text: str):
    """Extract JSON object from AI response text."""
    import re
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None
