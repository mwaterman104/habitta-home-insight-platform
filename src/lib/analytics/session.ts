/**
 * Session Management for Analytics
 * 
 * Rules:
 * - One session per browser tab lifecycle
 * - Resets on hard refresh or new tab
 * - Used by every event
 */

const SESSION_KEY = 'habitta_session_id';

export function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Clear session - useful for testing or logout
 */
export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
