const fs = require('fs');

function searchInFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = dir + '/' + f;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') searchInFiles(full);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('charAt')) {
        console.log(`Match in ${full}:`);
        content.split('\n').forEach((line, idx) => {
          if (line.includes('charAt')) {
            console.log(`  L${idx+1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchInFiles('src');
