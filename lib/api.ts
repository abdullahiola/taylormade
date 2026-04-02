/**
 * Shared API base URL — works in both local dev and production Docker.
 *
 * Production (browser on VPS IP):  returns ""  → relative URLs → nginx → backend
 * Local dev  (browser on localhost): returns "http://localhost:8000" → direct
 */
function getApiBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '';  // Production: same-origin relative fetch → nginx handles routing
  }
  return 'http://localhost:8000';
}

export const API_URL = getApiBase();
