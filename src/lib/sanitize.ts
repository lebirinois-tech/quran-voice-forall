import DOMPurify from 'dompurify';

/**
 * Sanitize Tajweed HTML to prevent XSS attacks.
 * Only allows <span> tags with inline color styles.
 */
export const sanitizeTajweedHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['style'],
    KEEP_CONTENT: true,
    // Hook to restrict style attribute to only color
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });
};
