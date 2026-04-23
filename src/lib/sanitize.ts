import DOMPurify from 'dompurify';

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

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

  const doc = new DOMParser().parseFromString(`<div>${sanitized}</div>`, 'text/html');
  const container = doc.body.firstElementChild;

  if (!container) {
    return '';
  }

  container.querySelectorAll('span').forEach((span) => {
    const color = span.style.color?.trim() ?? '';

    Array.from(span.attributes).forEach((attribute) => {
      if (attribute.name !== 'style') {
        span.removeAttribute(attribute.name);
      }
    });

    if (!color || span.style.length !== 1 || !HEX_COLOR_PATTERN.test(color)) {
      span.removeAttribute('style');
      return;
    }

    span.setAttribute('style', `color: ${color};`);
  });

  return container.innerHTML;
};
