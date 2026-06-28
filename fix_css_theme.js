const fs = require('fs');
let code = fs.readFileSync('popup.css', 'utf8');

// Replace @media for root variables
code = code.replace(/@media \(prefers-color-scheme: dark\) {\n  :root {/g, '[data-theme="dark"] {');
// The closing brace for the root @media query is right before `* {`
code = code.replace(/  }\n}\n\n\*/, '}\n\n*');

// Replace other @media queries
code = code.replace(/@media \(prefers-color-scheme: dark\) {/g, '[data-theme="dark"]');
code = code.replace(/  \.btn-remove:hover {/g, '  .btn-remove:hover {');
// Remove the closing brace of the other @media queries
code = code.replace(/  }\n}/g, '  }\n');
code = code.replace(/    color: #1e1e1e; \/\* Dark text on light purple button for dark mode \*\/\n  }\n}/g, '    color: #1e1e1e; /* Dark text on light purple button for dark mode */\n  }');
code = code.replace(/    background-color: rgba\(208, 188, 255, 0.08\);\n  }\n}/g, '    background-color: rgba(208, 188, 255, 0.08);\n  }');
code = code.replace(/  \.status-msg { color: #81c995; }\n}/g, '  .status-msg { color: #81c995; }');

// Append toggle CSS
code += `
/* Toggle Switch Styles */
.toggle-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.toggle-group label {
  margin-bottom: 0;
}
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}
.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .2s;
}
.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .2s;
}
input:checked + .slider {
  background-color: var(--gform-primary);
}
input:focus + .slider {
  box-shadow: 0 0 1px var(--gform-primary);
}
input:checked + .slider:before {
  transform: translateX(20px);
}
.slider.round {
  border-radius: 20px;
}
.slider.round:before {
  border-radius: 50%;
}
`;

fs.writeFileSync('popup.css', code);
console.log('Fixed CSS theme.');
