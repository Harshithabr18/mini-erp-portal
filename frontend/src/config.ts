// Central API Endpoint configuration
// Reads VITE_API_URL environment variable on Vercel, or falls back to localhost locally
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
