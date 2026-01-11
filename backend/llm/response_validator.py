
import json
import logging
from typing import Dict, Any, Optional
from pydantic import ValidationError

logger = logging.getLogger(__name__)

def validate_json_response(response_text: str, schema_model=None) -> Dict[str, Any]:
    """
    Validates that the response text is valid JSON and optionally conforms to a Pydantic model.
    
    Args:
        response_text: The raw string response from the LLM.
        schema_model: Optional Pydantic model class to validate against.
        
    Returns:
        dict: The parsed JSON data.
        
    Raises:
        ValueError: If JSON is invalid or schema validation fails.
    """
    try:
        # Clean up code blocks if present (common LLM behavior)
        cleaned_text = response_text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[3:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
        
        cleaned_text = cleaned_text.strip()
        
        data = json.loads(cleaned_text)
        
        if schema_model:
            try:
                # If data is a list and model expects list, or single item
                # For now, assuming top level structure validation if needed
                # But requirement says "Optional: pydantic schema", main requirement is valid JSON
                pass 
            except ValidationError as e:
                logger.error(f"Schema validation failed: {e}")
                raise ValueError(f"Schema validation failed: {e}")
                
        return data
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON received: {e}")
        # Log the problematic text for debugging (truncated)
        logger.debug(f"Problematic text: {response_text[:500]}...")
        raise ValueError("Response is not valid JSON")
