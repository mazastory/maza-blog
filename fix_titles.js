const fs = require('fs');
const files = ['about.astro', 'contact.astro', 'privacy.astro', 'terms.astro', 'disclaimer.astro'];
files.forEach(f => {
  const p = `/Users/m/Downloads/MazaWorkspace/maza-blog/src/pages/${f}`;
  let content = fs.readFileSync(p, 'utf-8');
  content = content.replace(/\| \$\{blogName\}/g, '');
  fs.writeFileSync(p, content);
  console.log(`Fixed title in ${f}`);
});
