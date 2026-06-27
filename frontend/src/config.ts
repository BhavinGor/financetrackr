export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const SESSION_EXPIRY_DAYS = 7;

export const MAX_PDF_SIZE_MB = 10;
export const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

export const AI_TEXT_TRUNCATE_LENGTH = 5000;

export const CURRENCY_SYMBOL = '₹';
