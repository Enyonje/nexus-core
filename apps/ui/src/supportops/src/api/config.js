// Detect if we are running on Netlify or Locally
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const endpoints = {
  tickets: `${API_BASE_URL}/api/v1/tickets`,
  webhook: `${API_BASE_URL}/api/v1/webhooks/zendesk`,
  audit: `${API_BASE_URL}/api/v1/audit/logs`,
};