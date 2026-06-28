const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

// Replacements
css = css.replace(/#7c3aed/gi, '#673ab7');
css = css.replace(/124, 58, 237/g, '103, 58, 183');

css = css.replace(/#5b21b6/gi, '#512da8');

css = css.replace(/#8b5cf6/gi, '#7e57c2');

css = css.replace(/#6d28d9/gi, '#5e35b1');

css = css.replace(/#a78bfa/gi, '#b39ddb');
css = css.replace(/167, 139, 250/g, '179, 157, 219');

css = css.replace(/#c4b5fd/gi, '#d1c4e9');

fs.writeFileSync('styles.css', css);
console.log('Colors replaced successfully.');
