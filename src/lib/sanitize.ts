import DOMPurify from 'dompurify';

const HEX_COLOR_PATTERN = /#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})/i;

/**
 * Sanitize Tajweed HTML to prevent XSS attacks.
 * Only allows <span> tags with inline color styles.
 */
export const sanitizeTajweedHtml = (html: string): string => {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['style'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });

  return sanitized.replace(/<span\b([^>]*)>/gi, (_match, rawAttributes: string) => {
    const styleMatch = rawAttributes.match(/\sstyle\s*=\s*["']([^"']*)["']/i);
    if (!styleMatch) {
      return '<span>';
    }

    const colorMatch = styleMatch[1].match(/^\s*color\s*:\s*(#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8}))\s*;?\s*$/i);
    if (!colorMatch || !HEX_COLOR_PATTERN.test(colorMatch[1])) {
      return '<span>';
    }

    return `<span style="color: ${colorMatch[1]};">`;
  });
};
