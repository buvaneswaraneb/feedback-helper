const fs = require('fs');
let code = fs.readFileSync('styles.css', 'utf8');

// A function to process CSS and unnest the specific @media query
function unnestDarkTheme(css) {
  const parts = css.split('@media (prefers-color-scheme: dark) {');
  let result = parts[0];
  
  for (let i = 1; i < parts.length; i++) {
    // Find the matching closing brace for this @media block
    let braceCount = 1;
    let endIdx = -1;
    for (let j = 0; j < parts[i].length; j++) {
      if (parts[i][j] === '{') braceCount++;
      if (parts[i][j] === '}') braceCount--;
      if (braceCount === 0) {
        endIdx = j;
        break;
      }
    }
    
    if (endIdx !== -1) {
      const block = parts[i].substring(0, endIdx);
      const rest = parts[i].substring(endIdx + 1);
      
      // Extract individual selectors within the block
      const processedBlock = block.replace(/([^{]+)\s*\{([^}]*)\}/g, (match, selector, rules) => {
        const cleanSelector = selector.trim().split(',').map(s => `[data-ai-theme="dark"] ${s.trim()}`).join(', ');
        return `${cleanSelector} {${rules}}`;
      });
      
      result += processedBlock + rest;
    } else {
      result += parts[i];
    }
  }
  return result;
}

const newCss = unnestDarkTheme(code);
fs.writeFileSync('styles.css', newCss);
console.log('Unnested dark mode styles.');
