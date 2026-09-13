import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.setOptions({ gfm: true, breaks: true });

// Post bodies are author-written, but they still go through the same sanitiser as
// everything else so a compromised admin session cannot plant script into the site.
export function renderMarkdown(md) {
  return sanitizeHtml(marked.parse(md || ''), {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'blockquote',
      'code', 'pre', 'strong', 'em', 'del', 'hr', 'br', 'img', 'table', 'thead',
      'tbody', 'tr', 'th', 'td', 'figure', 'figcaption',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'loading'],
      code: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener nofollow', target: '_blank' }),
      img: sanitizeHtml.simpleTransform('img', { loading: 'lazy' }),
    },
  });
}

// Comments are written by strangers: plain text only, newlines preserved by the client.
export function cleanCommentText(text) {
  return sanitizeHtml(text || '', { allowedTags: [], allowedAttributes: {} }).trim();
}
