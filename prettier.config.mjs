/** @type {import('prettier').Config} */
export default {
  singleQuote: true,
  semi: true,
  printWidth: 100,
  trailingComma: 'all',
  // Git owns line endings (`.gitattributes` keeps the repository LF); a CRLF checkout under
  // `core.autocrlf=true` is judged on content only (BR7.3).
  endOfLine: 'auto',
  overrides: [
    {
      // The patient stylesheets use double quotes in attribute selectors and values ([data-theme="dark"]),
      // as the ported staff styles do (T-011).
      files: '*.css',
      options: { singleQuote: false },
    },
  ],
};
