"""
Transaction Parser Service

Parses AI-formatted response into structured transaction data.

This service is responsible for:
- Extracting JSON from AI response
- Validating JSON structure
- Handling parse errors
"""
import json
import re
from utils.logger import setup_logger

logger = setup_logger(__name__)

def parse_ai_response(response_text: str) -> dict:
    """
    Parse JSON from AI response.
    
    The AI response may contain additional text before/after the JSON.
    This function extracts the JSON object and parses it.
    
    Args:
        response_text: AI response containing JSON
        
    Returns:
        Parsed transaction data dictionary with structure:
        {
            "accountInfo": {...},
            "transactions": [...],
            "summary": {...},
            "extractionQuality": {...}
        }
        
    Raises:
        ValueError: If response is not valid JSON
    """
    logger.info('✅ STEP 3: PARSING RESPONSE')
    logger.info('-' * 70)
    logger.info('   Parsing AI response as JSON...')
    
    try:
        # Try to find JSON in response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        
        if not json_match:
            logger.error('❌ ERROR: No JSON found in response')
            logger.error(f'   Response preview: {response_text[:500]}')
            raise ValueError('No JSON found in AI response')
        
        json_str = json_match.group(0)
        extracted_data = json.loads(json_str)
        
        transactions_count = len(extracted_data.get('transactions', []))
        logger.info('✅ JSON parsed successfully')
        logger.info(f'   Transactions found: {transactions_count}')
        
        return extracted_data
        
    except json.JSONDecodeError as e:
        logger.error(f'❌ JSON PARSE ERROR: {str(e)}')
        raise ValueError(f'Invalid JSON in AI response: {str(e)}')
    except Exception as e:
        logger.error(f'❌ Error parsing response: {str(e)}')
        raise
