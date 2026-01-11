
import logging
from typing import Dict, Any, List
try:
    from docling.document_converter import DocumentConverter
except ImportError:
    DocumentConverter = None

logger = logging.getLogger(__name__)

def extract_pdf_content(file_path: str) -> Dict[str, Any]:
    """
    Extracts content from a PDF file using Docling.
    
    Args:
        file_path: Path to the PDF file.
        
    Returns:
        dict: A dictionary containing:
            - raw_text: The full extracted text.
            - tables: A list of extracted tables (structured).
            - metadata: File metadata.
    """
    if DocumentConverter is None:
        raise ImportError("Docling is not installed. Please install it with `pip install docling`.")

    try:
        converter = DocumentConverter()
        result = converter.convert(file_path)
        
        # Docling 2.x structure might vary, adapting to common usage patterns
        # Assuming result.document is the DoclingDocument
        document = result.document
        
        # Extract text
        raw_text = document.export_to_markdown() # Using markdown export as a clean text representation
        
        # Extract tables
        tables = []
        for table in document.tables:
            # Converting table to a simple list of lists or dict structure
            # Depending on Docling version, table.export_to_dataframe() might be available
            if hasattr(table, "export_to_dataframe"):
                df = table.export_to_dataframe()
                tables.append(df.to_dict(orient="records"))
            elif hasattr(table, "data"):
                tables.append(table.data)
        
        # Metadata
        metadata = {}
        if hasattr(document, "metadata"):
             metadata = document.metadata.dict() if hasattr(document.metadata, "dict") else str(document.metadata)

        logger.info(f"Successfully extracted content from {file_path} using Docling.")
        
        return {
            "raw_text": raw_text,
            "tables": tables,
            "metadata": metadata
        }

    except Exception as e:
        logger.error(f"Error extracting PDF content with Docling: {e}")
        # Logic to potentially fallback or re-raise depends on usage
        raise e
