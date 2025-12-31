"""
AI Formatting Service

Sends extracted PDF text to Amazon Nova Pro for intelligent formatting
and transaction extraction.

This service is responsible for:
- Sending extracted text to AWS Bedrock (Amazon Nova Pro)
- Creating prompts for transaction extraction
- Handling AI API errors
- Managing text length limits
"""
import boto3
from config import Config
from utils.logger import setup_logger

logger = setup_logger(__name__)

class AIFormatterService:
    """Service for AI-powered transaction formatting using Amazon Nova Pro"""
    
    def __init__(self):
        """Initialize AWS Bedrock client"""
        self.client = boto3.client(
            'bedrock-runtime',
            region_name=Config.AWS_REGION,
            aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY
        )
        self.model_id = Config.BEDROCK_MODEL_ID
    
    def format_transactions(self, extracted_text: str) -> str:
        """
        Format extracted text using Amazon Nova Pro.
        
        Workflow:
        1. Truncate text if too long
        2. Create formatting prompt
        3. Send to Amazon Nova Pro
        4. Return AI response
        
        Args:
            extracted_text: Raw text from PDF
            
        Returns:
            AI-formatted JSON string with structured transaction data
            
        Raises:
            Exception: If AI API call fails
        """
        logger.info('🤖 STEP 2: FORMATTING WITH AMAZON NOVA PRO')
        logger.info('-' * 70)
        
        try:
            # Truncate if too long
            if len(extracted_text) > Config.MAX_TEXT_LENGTH:
                logger.warning(
                    f'⚠️  Text too long ({len(extracted_text)} chars), '
                    f'truncating to {Config.MAX_TEXT_LENGTH}'
                )
                extracted_text = extracted_text[:Config.MAX_TEXT_LENGTH]
            
            # Create formatting prompt
            formatting_prompt = self._create_formatting_prompt(extracted_text)
            
            logger.info('   Sending to Amazon Nova Pro...')
            logger.info(f'   Model: {self.model_id}')
            
            # Call Bedrock API
            response = self.client.converse(
                modelId=self.model_id,
                messages=[
                    {
                        'role': 'user',
                        'content': [{'text': formatting_prompt}],
                    }
                ],
            )
            
            logger.info('✅ Bedrock response received')
            
            # Extract response text
            response_text = ''
            if 'output' in response and 'message' in response['output']:
                content_blocks = response['output']['message'].get('content', [])
                
                if content_blocks and len(content_blocks) > 0:
                    block_0 = content_blocks[0]
                    if 'text' in block_0:
                        response_text = block_0.get('text', '')
                    
                    logger.info(f'   Response text length: {len(response_text):,} characters')
            
            if len(response_text) == 0:
                logger.error('❌ ERROR: Empty response from Bedrock')
                raise Exception('Empty response from AI service')
            
            return response_text
            
        except Exception as e:
            logger.error(f'❌ Error in format_with_nova_pro: {str(e)}')
            raise
    
    def _create_formatting_prompt(self, extracted_text: str) -> str:
        """
        Create the prompt for Nova Pro to format extracted text.
        
        This prompt instructs the AI to:
        - Extract transactions (excluding balance markers)
        - Identify account information
        - Classify transaction types
        - Preserve number formatting (commas)
        - Return structured JSON
        
        Args:
            extracted_text: Raw text from PDF
            
        Returns:
            Formatted prompt string
        """
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
