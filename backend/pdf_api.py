from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
import io
import re
from datetime import datetime
import boto3
import json
import os
import pdfplumber
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Load environment variables from .env.local
# Try loading from multiple locations:
env_paths = [
    '.env.local',
    '../.env.local',
    '../../.env.local'
]

for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

# Initialize AWS Bedrock client
aws_access_key = os.environ.get('VITE_AWS_ACCESS_KEY_ID')
aws_secret_key = os.environ.get('VITE_AWS_SECRET_ACCESS_KEY')
aws_region = os.environ.get('VITE_AWS_REGION', 'us-east-1')

bedrock_client = boto3.client(
    'bedrock-runtime',
    region_name=aws_region,
    aws_access_key_id=aws_access_key,
    aws_secret_access_key=aws_secret_key
)

@app.route('/api/pdf/parse', methods=['POST'])
def parse_pdf():
    """
    Parse PDF file using pdfplumber text extraction + Amazon Nova Pro formatting
    1. Extracts text from PDF using pdfplumber (with password support)
    2. Sends extracted text to Amazon Nova Pro for intelligent formatting
    3. Returns structured transaction data
    """
    try:
        print('\n' + '='*70)
        print('📄 PDF PARSING WITH PDFPLUMBER + NOVA PRO')
        print('='*70)
        
        # Validate request
        if 'file' not in request.files:
            print('❌ ERROR: No file in request')
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        password = request.form.get('password', None)
        
        if file.filename == '':
            print('❌ ERROR: Empty filename')
            return jsonify({'error': 'No file selected'}), 400
        
        print(f'File name: {file.filename}')
        if password:
            print('Password provided for encrypted PDF')
        
        # STEP 1: Extract text from PDF
        pdf_bytes = file.read()
        extracted_text = _extract_pdf_text(pdf_bytes, password)
        
        if not extracted_text:
            # Check if it failed due to encryption
            pdf_file = io.BytesIO(pdf_bytes)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            if pdf_reader.is_encrypted:
                if not password:
                    # No password provided for encrypted PDF
                    return jsonify({
                        'error': 'PDF_PASSWORD_REQUIRED',
                        'message': 'This PDF is password-protected. Please provide a password.'
                    }), 401
                else:
                    # Password was provided but decryption failed
                    return jsonify({
                        'error': 'PDF_INVALID_PASSWORD',
                        'message': 'Invalid password. Please try again.'
                    }), 401
            
            # Not encrypted, just failed to extract
            return jsonify({
                'error': 'EXTRACTION_FAILED',
                'message': 'Could not extract text from PDF'
            }), 500
        
        # STEP 2: Format with Nova Pro
        response_text = _format_with_nova_pro(extracted_text)
        
        if not response_text:
            return jsonify({
                'error': 'FORMAT_FAILED',
                'message': 'Could not format extracted text with AI'
            }), 500
        
        # STEP 3: Parse JSON response
        extracted_data = _parse_ai_response(response_text)
        
        if not extracted_data:
            return jsonify({
                'error': 'PARSE_FAILED',
                'message': 'Could not parse AI response as JSON'
            }), 500
        
        transactions_count = len(extracted_data.get('transactions', []))
        print('='*70)
        print(f'✅ PDF PARSING COMPLETE - {transactions_count} transactions extracted')
        print('='*70 + '\n')
        
        print(extracted_data)
        # Return in the format expected by frontend
        return jsonify({
            'success': True,
            'data': extracted_data
        }), 200
        
    except Exception as e:
        print('='*70)
        print('❌ ERROR IN parse_pdf')
        print('='*70)
        print(f'Error type: {type(e).__name__}')
        print(f'Error message: {str(e)}')
        import traceback
        traceback.print_exc()
        print('='*70 + '\n')
        return jsonify({
            'error': 'PARSE_ERROR',
            'message': str(e)
        }), 500


def _extract_pdf_text(pdf_bytes, password=None):
    """Extract text from PDF using pdfplumber, with password support for encrypted PDFs"""
    print('\n📄 STEP 1: EXTRACTING TEXT FROM PDF')
    print('-' * 70)
    
    try:
        print(f'   File size: {len(pdf_bytes):,} bytes')
        
        # FIRST: Check if PDF is encrypted using PyPDF2
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        if pdf_reader.is_encrypted:
            print('   PDF is encrypted')
            if not password:
                print('   No password provided - returning error')
                return None
            
            # Try to decrypt with provided password
            print('   Attempting decryption with password...')
            decrypt_result = pdf_reader.decrypt(password)
            if not decrypt_result:
                print('   ❌ Decryption failed - invalid password')
                return None
            print('   ✅ Decryption successful')
        
        # Now try extraction with pdfplumber
        pdf_file = io.BytesIO(pdf_bytes)
        
        # Try without password first (for non-encrypted PDFs)
        if not pdf_reader.is_encrypted:
            result = _try_extract_without_password(pdf_file)
            if result:
                return result
        
        # For encrypted PDFs, use password
        if password:
            result = _try_extract_with_password(pdf_bytes, password)
            if result:
                return result
            
    except Exception as e:
        print(f'❌ Error extracting text: {type(e).__name__}')
        print(f'   Message: {str(e)[:300]}')
        return None


def _try_extract_without_password(pdf_file):
    """Try to extract text without password"""
    try:
        with pdfplumber.open(pdf_file) as pdf:
            total_pages = len(pdf.pages)
            print(f'   Pages: {total_pages}')
            
            full_text = ""
            for idx, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    full_text += text
                full_text += "\n--- PAGE BREAK ---\n"
                char_count = len(text) if text else 0
                print(f'   Page {idx}: {char_count:,} characters')
            
            total_chars = len(full_text)
            print(f'✅ Total text extracted: {total_chars:,} characters')
            return full_text
    except Exception as e:
        error_msg = str(e).lower()
        if 'encrypted' in error_msg or 'password' in error_msg or 'not decrypted' in error_msg:
            print('   File is encrypted - will need password')
            return None
        else:
            raise


def _try_extract_with_password(pdf_bytes, password):
    """Try to extract text with password using PyPDF2 for decryption"""
    print('   Attempting extraction with password...')
    try:
        # First, decrypt using PyPDF2
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        if not pdf_reader.is_encrypted:
            print('   PDF is not encrypted')
            return None
        
        # Try to decrypt
        decrypt_result = pdf_reader.decrypt(password)
        if not decrypt_result:
            print('   Decryption failed - invalid password')
            return None
        
        print('   Decryption successful')
        
        # Now use pdfplumber on the decrypted bytes
        pdf_file = io.BytesIO(pdf_bytes)
        with pdfplumber.open(pdf_file, password=password) as pdf:
            total_pages = len(pdf.pages)
            print(f'   Pages: {total_pages}')
            
            full_text = ""
            for idx, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    full_text += text
                full_text += "\n--- PAGE BREAK ---\n"
                char_count = len(text) if text else 0
                print(f'   Page {idx}: {char_count:,} characters')
            
            total_chars = len(full_text)
            print(f'✅ Total text extracted: {total_chars:,} characters')
            return full_text
    except Exception as pwd_error:
        print(f'   Password extraction failed: {str(pwd_error)[:200]}')
        return None


def _format_with_nova_pro(extracted_text):
    """Send extracted text to Nova Pro for formatting"""
    print('\n🤖 STEP 2: FORMATTING WITH AMAZON NOVA PRO')
    print('-' * 70)
    
    try:
        # Truncate if too long
        max_chars = 50000
        if len(extracted_text) > max_chars:
            print(f'⚠️  Text too long ({len(extracted_text)} chars), truncating to {max_chars}')
            extracted_text = extracted_text[:max_chars]
        
        # Create formatting prompt
        formatting_prompt = _create_formatting_prompt(extracted_text)
        
        print('   Sending to Amazon Nova Pro...')
        print('   Model: us.amazon.nova-pro-v1:0')
        
        response = bedrock_client.converse(
            modelId='us.amazon.nova-pro-v1:0',
            messages=[
                {
                    'role': 'user',
                    'content': [{'text': formatting_prompt}],
                }
            ],
        )
        
        print('✅ Bedrock response received')
        
        # Extract response text
        response_text = ''
        if 'output' in response and 'message' in response['output']:
            content_blocks = response['output']['message'].get('content', [])
            
            if content_blocks and len(content_blocks) > 0:
                block_0 = content_blocks[0]
                if 'text' in block_0:
                    response_text = block_0.get('text', '')
                
                print(f'   Response text length: {len(response_text):,} characters')
        
        if len(response_text) == 0:
            print('❌ ERROR: Empty response from Bedrock')
            return None
        
        return response_text
        
    except Exception as e:
        print(f'❌ Error in format_with_nova_pro: {str(e)}')
        import traceback
        traceback.print_exc()
        return None


def _create_formatting_prompt(extracted_text):
    """Create the prompt for Nova Pro to format extracted text"""
    return """You are a financial data extraction expert. I have extracted text from a bank statement PDF.

Please analyze this extracted text and format it into structured transaction data.

IMPORTANT RULES:
1. EXCLUDE transactions that represent balances (like "B/F", "Balance Forward", "Opening Balance", "Closing Balance")
2. ONLY include actual transactions (deposits, withdrawals, transfers, payments)
3. Extract ALL account information visible in the statement including:
   - Primary account number and balance
   - Any secondary/linked accounts (like PPF accounts, Savings accounts, etc.) with their numbers and balances
   - Account types and registration status if available
4. Use the latest/closing balance as the account balance in accountInfo

TRANSACTION TYPE CLASSIFICATION:
- "Deposit" or "Credit" or amount shown as positive or "Cr" = Classify as "Deposit" (income)
- "Withdrawal" or "Debit" or amount shown as negative or "Dr" = Classify as "Withdrawal" (expense)
- If unclear, look at the description: deposits add money (Salary, Refund, Transfer In), withdrawals remove money (ATM, Payment, Transfer Out, etc.)

For each transaction found, extract:
1. Date (in DD/MM/YYYY or MM/DD/YYYY format)
2. Description (what the transaction is for - keep it concise)
3. Amount (PRESERVE COMMAS - e.g., 10,000.50 or 1,50,000.00 - do NOT remove commas)
4. Type ("Deposit" for credits/income, "Withdrawal" for debits/expenses)

CRITICAL: When extracting amounts, keep ALL commas exactly as shown in the text.
- If you see "10,000" write "10,000" NOT "10"
- If you see "1,50,000.50" write "1,50,000.50" NOT "150000.50"
- Do NOT remove commas or reformat numbers

Also extract comprehensive account information:
- Primary Account number and closing balance
- Bank name
- Statement period
- Secondary/linked accounts (if any)

Return the results as a JSON object with this exact structure:
{
    "accountInfo": {
        "accountNumber": "primary account number",
        "bankName": "bank name",
        "statementPeriod": "period shown on statement",
        "primaryBalance": "primary account closing balance",
        "linkedAccounts": [
            {
                "name": "account type (e.g., PPF A/c, Savings A/c)",
                "accountNumber": "XXXXXXXX9308",
                "balance": "56551.00",
                "status": "Registered or other status if shown"
            }
        ]
    },
    "statementPeriod": "period shown on statement",
    "transactions": [
        {
            "date": "DD/MM/YYYY",
            "description": "transaction description",
            "amount": "numeric amount without currency",
            "type": "Deposit or Withdrawal"
        }
    ],
    "summary": {
        "totalCredits": "sum of all deposits/credits (EXCLUDE opening balance)",
        "totalDebits": "sum of all withdrawals/debits (EXCLUDE opening balance)",
        "closingBalance": "closing balance at end of statement",
        "transactionCount": "count of actual transactions (EXCLUDE opening balance)"
    },
    "extractionQuality": {
        "confidence": "high/medium/low",
        "notes": "any issues or notes"
    }
}

CRITICAL RULES:
- NEVER include "B/F", "Balance Forward", "Opening Balance", "Closing Balance" as transactions
- ALWAYS classify as "Deposit" (income) or "Withdrawal" (expense) - not "Debit" or "Credit"
- Look at context to determine direction: money in = Deposit, money out = Withdrawal
- Include only actual transactions, not balance markers

EXTRACTED PDF TEXT:
---BEGIN TEXT---
""" + extracted_text + """
---END TEXT---

Please analyze and format this as JSON. Return ONLY valid JSON, no explanations."""


def _parse_ai_response(response_text):
    """Parse JSON from AI response"""
    print('\n✅ STEP 3: PARSING RESPONSE')
    print('-' * 70)
    print('   Parsing AI response as JSON...')
    
    try:
        # Try to find JSON in response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        
        if not json_match:
            print('❌ ERROR: No JSON found in response')
            print(f'   Response preview: {response_text[:500]}')
            return None
        
        json_str = json_match.group(0)
        extracted_data = json.loads(json_str)
        
        transactions_count = len(extracted_data.get('transactions', []))
        print('✅ JSON parsed successfully')
        print(f'   Transactions found: {transactions_count}')
        
        return extracted_data
        
    except json.JSONDecodeError as e:
        print(f'❌ JSON PARSE ERROR: {str(e)}')
        return None
    except Exception as e:
        print(f'❌ Error parsing response: {str(e)}')
        import traceback
        traceback.print_exc()
        return None

def _parse_transaction_line(line, date_pattern, amount_pattern):
    """
    Parse a single line and extract transaction data
    NOTE: This is kept for legacy compatibility but not used with Nova Pro extraction
    Returns: transaction dict or None
    """
    if not line.strip():
        return None
    
    dates = re.findall(date_pattern, line)
    amounts = re.findall(amount_pattern, line)
    
    # Log extraction details
    if dates or amounts:
        print(f'   Line: {line[:80]}...')
        print(f'      Dates found: {len(dates)} - {dates if dates else "NONE"}')
        print(f'      Amounts found: {len(amounts)} - {amounts if amounts else "NONE"}')
    
    # Need both date and amount with explicit bounds checking
    if len(dates) == 0:
        return None
    if len(amounts) == 0:
        return None
    
    # Safe access with explicit indexing
    date_str = dates[0] if dates else None
    amount_str = amounts[0].replace(',', '') if amounts else None
    
    if not date_str or not amount_str:
        return None
    
    # Clean the line for description
    description = re.sub(date_pattern, '', line)
    description = re.sub(amount_pattern, '', description)
    description = description.strip()
    
    if not description:
        return None
    
    transaction = {
        'date': date_str,
        'description': description[:100],
        'amount': amount_str,
        'raw_line': line[:200]
    }
    
    print(f'      ✓ Transaction extracted: {transaction}')
    return transaction

def _validate_extraction_request(data):
    """Validate extraction request data"""
    if not data or 'text' not in data:
        print('   ERROR: No text provided in request')
        return False, 'No text provided'
    
    text = data['text']
    print(f'   Text type: {type(text).__name__}')
    print(f'   Text length: {len(text) if text else 0}')
    
    if not text or not text.strip():
        print('   ERROR: Text is empty')
        return False, 'Empty text'
    
    return True, text

@app.route('/api/pdf/extract-transactions', methods=['POST'])
def extract_transactions():
    """
    Extract transaction data from PDF text
    Accepts: JSON with 'text' field
    Returns: Structured transaction data
    """
    try:
        print('\n' + '='*70)
        print('📊 [extract_transactions] STARTING TRANSACTION EXTRACTION')
        print('='*70)
        
        print('   Parsing JSON request...')
        data = request.get_json()
        print(f'   Data type: {type(data).__name__}')
        print(f'   Data keys: {list(data.keys()) if data else "None"}')
        
        # Validate request
        valid, result = _validate_extraction_request(data)
        if not valid:
            return jsonify({'error': 'INVALID_REQUEST', 'message': result}), 400
        
        text = result
        
        # Define regex patterns
        print('   Setting up regex patterns...')
        date_pattern = r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b'
        amount_pattern = r'₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'
        print('   Patterns ready')
        
        # Parse all lines
        print('   Splitting text into lines...')
        transactions = []
        lines = text.split('\n')
        print(f'   Total lines: {len(lines)}')
        
        print('\n   Processing lines:')
        line_count = 0
        for idx, line in enumerate(lines):
            try:
                if not line.strip():
                    continue
                    
                line_count += 1
                if line_count <= 5:
                    print(f'   [{idx}] {line[:60]}...')
                
                transaction = _parse_transaction_line(line, date_pattern, amount_pattern)
                if transaction:
                    transactions.append(transaction)
            except Exception as line_error:
                print(f'   Line {idx} error: {str(line_error)}')
                continue
        
        print(f'\n   Total lines processed: {line_count}')
        print(f'   Found {len(transactions)} transactions')
        
        print('='*70)
        print(f'SUCCESS: {len(transactions)} transactions extracted')
        print('='*70 + '\n')
        
        return jsonify({
            'success': True,
            'transactions': transactions,
            'count': len(transactions)
        })
        
    except Exception as e:
        print('\n' + '='*70)
        print('ERROR IN extract_transactions')
        print('='*70)
        print(f'   Error type: {type(e).__name__}')
        print(f'   Error message: {str(e)}')
        print('='*70 + '\n')
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'EXTRACTION_ERROR',
            'message': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'pdf-parser'})

if __name__ == '__main__':
    print('🚀 Starting PDF Parser API...')
    print('📍 Endpoint: http://localhost:5000/api/pdf/parse')
    app.run(debug=True, port=5000)
