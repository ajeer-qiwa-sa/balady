import fs from 'fs';
const css = fs.readFileSync('src/styles/Header.css', 'utf8');
console.log(css.includes('navbar-brand'));
