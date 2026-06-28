const fs = require('fs');
let code = fs.readFileSync('content.js', 'utf8');

const constants = `
const ICON_SPARKLE = \`<svg class="ai-svg-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22Z"/></svg>\`;
const ICON_WAIT = \`<svg class="ai-svg-icon ai-spin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>\`;
const ICON_ERROR = \`<svg class="ai-svg-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>\`;
`;

// Prepend constants
if (!code.includes('ICON_SPARKLE')) {
  code = code.replace('// ─── AI answer fillers', constants + '\n// ─── AI answer fillers');
}

// Replace emojis
code = code.replace(/<span class="ai-assist-icon" aria-hidden="true">⏳<\/span>/g, `<span class="ai-assist-icon" aria-hidden="true">\${ICON_WAIT}</span>`);
code = code.replace(/<span class="ai-assist-icon" aria-hidden="true">❌<\/span>/g, `<span class="ai-assist-icon" aria-hidden="true">\${ICON_ERROR}</span>`);
code = code.replace(/<span class="ai-assist-icon" aria-hidden="true">✨<\/span>/g, `<span class="ai-assist-icon" aria-hidden="true">\${ICON_SPARKLE}</span>`);

code = code.replace(/<span class="fill-all-icon">⏳<\/span>/g, `<span class="fill-all-icon">\${ICON_WAIT}</span>`);
code = code.replace(/<span class="fill-all-icon">✨<\/span>/g, `<span class="fill-all-icon">\${ICON_SPARKLE}</span>`);

code = code.replace(/<span class="context-icon">🧠<\/span>/g, `<span class="context-icon">\${ICON_SPARKLE}</span>`);

fs.writeFileSync('content.js', code);
console.log('Replaced emojis in content.js');
