const fs = require('fs');
const html = fs.readFileSync('C:/Users/yassi/Downloads/brazilian_studio_about_v2.html', 'utf8');

let styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
let styleContent = styleMatch ? styleMatch[1] : '';

let bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
let bodyContent = bodyMatch ? bodyMatch[1] : '';

// Convert HTML to JSX
// 1. class -> className
bodyContent = bodyContent.replace(/class="/g, 'className="');
// 2. self-closing tags
bodyContent = bodyContent.replace(/<img(.*?[^\/])>/g, '<img$1 />');
bodyContent = bodyContent.replace(/<br>/g, '<br />');
bodyContent = bodyContent.replace(/<hr>/g, '<hr />');
bodyContent = bodyContent.replace(/<input(.*?[^\/])>/g, '<input$1 />');
bodyContent = bodyContent.replace(/<circle(.*?[^\/])>/g, '<circle$1 />');
bodyContent = bodyContent.replace(/<path(.*?[^\/])>/g, '<path$1 />');
// 3. style attributes (rudimentary)
bodyContent = bodyContent.replace(/style="(.*?)"/g, (match, p1) => {
    let styles = p1.split(';').filter(s => s.trim());
    let obj = {};
    styles.forEach(s => {
        let parts = s.split(':');
        if (parts.length >= 2) {
            let key = parts[0].trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
            let val = parts.slice(1).join(':').trim();
            obj[key] = val;
        }
    });
    return `style={{ ${Object.entries(obj).map(([k,v]) => `${k}: '${v}'`).join(', ')} }}`;
});

// Replace onclick
bodyContent = bodyContent.replace(/<button className="btn btn-primary" onclick="[^"]*"/g, '<Link href="/booking" className="btn btn-primary"');
bodyContent = bodyContent.replace(/<button className="btn btn-secondary" onclick="[^"]*"/g, '<Link href="/#services" className="btn btn-secondary"');
bodyContent = bodyContent.replace(/<\/button>/g, '</Link>');

const componentCode = `
import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: \`
      ${styleContent}
      \` }} />
      ${bodyContent}
    </>
  );
}
`;

if (!fs.existsSync('C:/Users/yassi/Downloads/brazillin studio official/src/app/about')) {
    fs.mkdirSync('C:/Users/yassi/Downloads/brazillin studio official/src/app/about');
}

fs.writeFileSync('C:/Users/yassi/Downloads/brazillin studio official/src/app/about/page.tsx', componentCode);
console.log('Conversion complete!');
