/**
 * String Utility Functions
 * Shared utilities for string manipulation and sanitization
 */

/**
 * Get initials from a name
 */
export function getInitials(name: string, maxLength: number = 2): string {
  if (!name || typeof name !== 'string') return 'U';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, maxLength);
}

/**
 * Sanitize text content to prevent XSS attacks
 * Escapes HTML entities while preserving newlines for whitespace-pre-wrap
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  // Escape HTML entities manually to preserve newlines
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize search query input
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  return query.trim().slice(0, 100); // Limit length
}

/**
 * Validate image URL for security
 * Only allows HTTPS URLs from trusted domains
 */
export function validateImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTPS
    if (urlObj.protocol !== 'https:') return null;
    
    // Only allow trusted domains
    const allowedDomains = [
      'storage.googleapis.com',
      'firebasestorage.googleapis.com',
      'firebasestorage.app',
    ];
    
    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return null;
    }
    
    return url;
  } catch {
    return null;
  }
}
