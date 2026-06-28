const fs = require('fs');
let code = fs.readFileSync('styles.css', 'utf8');

// Replace gradient with flat purple
code = code.replace(/background: linear-gradient\(135deg, #673ab7 0%, #512da8 100%\);/g, 'background: #673ab7;');
code = code.replace(/background: linear-gradient\(135deg, #7e57c2 0%, #5e35b1 100%\);/g, 'background: #5e35b1;');

// For the context toggle button (which was white)
code = code.replace(/background: #ffffff;\n  color: #333;\n  border: 1px solid #e0e0e0;/g, 'background: #673ab7;\n  color: #fff;\n  border: 1px solid #673ab7;');

// For context toggle icon color if it needs it, but it inherits color.

// Add animation for SVG loader
if (!code.includes('.ai-spin')) {
  code += `\n
@keyframes ai-spin-anim {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.ai-spin {
  animation: ai-spin-anim 1s linear infinite;
}
.ai-svg-icon {
  display: inline-block;
  vertical-align: middle;
}
`;
}

fs.writeFileSync('styles.css', code);
console.log('Updated styles.css with unified flat purple and SVG spin animation.');
