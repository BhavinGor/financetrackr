"""
Logging Configuration

Provides structured logging for the application.
Logs are output to stdout with timestamps and log levels.
"""
import logging
import sys

def setup_logger(name: str) -> logging.Logger:
    """
    Create configured logger instance.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Configured logger instance
        
    Example:
        logger = setup_logger(__name__)
        logger.info("Processing started")
    """
    logger = logging.Logger(name)
    logger.setLevel(logging.INFO)
    
    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    
    logger.addHandler(handler)
    return logger
