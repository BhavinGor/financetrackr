
import time
import logging
from typing import Callable, Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar('T')

class MaxRetriesExceededError(Exception):
    """Raised when all retries for a specific model fail."""
    pass

def execute_with_retry(
    func: Callable[[], T],
    max_retries: int = 3,
    base_delay: float = 1.0,
    allowed_exceptions: tuple = (Exception,)
) -> T:
    """
    Executes a function with retries.
    
    Args:
        func: The function to execute.
        max_retries: Maximum number of retry attempts (0 means run once).
        base_delay: Base delay for exponential backoff (not strictly requested but good practice).
        allowed_exceptions: Tuple of exceptions to catch and retry on.
        
    Returns:
        The result of the function call.
        
    Raises:
        MaxRetriesExceededError: If all retries fail.
    """
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            return func()
        except allowed_exceptions as e:
            last_exception = e
            logger.warning(f"Attempt {attempt + 1}/{max_retries + 1} failed: {e}")
            
            if attempt < max_retries:
                # Simple sleep or could use exponential backoff
                # Requirement: "Retry if... Response is not valid JSON" implied prompt loop or function loop
                # This handler wraps the API call + validation
                time.sleep(base_delay)
            else:
                logger.error(f"All {max_retries + 1} attempts failed.")
    
    raise MaxRetriesExceededError(f"Operation failed after {max_retries + 1} attempts: {last_exception}")
