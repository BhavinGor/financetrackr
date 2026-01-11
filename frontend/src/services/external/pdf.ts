// Note: pdf-parse doesn't work well in browsers. Using a workaround.
// For production, consider using pdf.js or a backend API for PDF parsing.

// PDF parsing using Python backend API
const PDF_API_URL = 'http://localhost:5000/api/pdf/parse';

/**
 * Parse PDF file and extract text content using Python backend
 * @param file - PDF file from file input
 * @param password - Optional password for encrypted PDFs
 * @returns Extracted text from PDF
 */
export const parsePdfFile = async (file: File, password?: string): Promise<any> => {
    try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        if (password) {
            formData.append('password', password);
        }

        console.log('📤 Uploading PDF to backend...');

        // Call Python backend API
        const response = await fetch(PDF_API_URL, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle specific errors
            if (data.error === 'PDF_PASSWORD_REQUIRED') {
                throw new Error('PDF_PASSWORD_REQUIRED');
            }
            if (data.error === 'PDF_INVALID_PASSWORD') {
                throw new Error('PDF_INVALID_PASSWORD');
            }
            if (data.error === 'EMPTY_TEXT') {
                throw new Error('No text could be extracted from the PDF. It may be a scanned image or encrypted.');
            }
            throw new Error(data.message || 'Failed to parse PDF');
        }

        console.log('✅ PDF parsed successfully');
        console.log('   Pages:', data.pages);
        console.log('   Transactions found:', data.data?.transactions?.length);

        return data;
    } catch (error: any) {
        console.error('❌ PDF parsing error:', error);

        // Re-throw specific errors
        if (error.message === 'PDF_PASSWORD_REQUIRED' || error.message === 'PDF_INVALID_PASSWORD') {
            throw error;
        }

        // Check for network errors
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Cannot connect to PDF service. Make sure the Python backend is running on port 5000.');
        }

        throw new Error(error.message || 'Failed to parse PDF. Please try a different PDF file.');
    }
};

/**
 * Check if file is a valid PDF
 * @param file - File to check
 * @returns true if file is PDF
 */
export const isPdfFile = (file: File): boolean => {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};

/**
 * Validate PDF file size (max 10MB)
 * @param file - File to validate
 * @returns true if file size is acceptable
 */
export const validatePdfSize = (file: File): boolean => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    return file.size <= MAX_SIZE;
};
