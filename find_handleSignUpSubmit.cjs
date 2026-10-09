const fs = require('fs');
let c = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');
const start = c.indexOf('handleSignUpSubmit');
console.log(c.substring(start, start + 1600));
