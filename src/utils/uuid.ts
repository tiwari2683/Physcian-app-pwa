/**
 * Generates a RFC4122 compliant UUID v4.
 * Uses crypto.randomUUID() if available (Secure Contexts),
 * otherwise falls back to a Math.random() based generator.
 */
export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    try {
      return window.crypto.randomUUID();
    } catch (e) {
      // Fallback if randomUUID fails for some reason
    }
  }

  // Fallback for non-secure contexts (e.g. http on local IP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
