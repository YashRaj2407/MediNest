const fs = require('fs');
let c = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');
const lines = c.split('\n');
lines.forEach((l, i) => {
  if (l.includes('<input')) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});
