const fs = require('fs');
let c = fs.readFileSync('src/lib/receipts.ts', 'utf8');

c = c.replace(/₹/g, 'Rs. ');
c = c.replace(/Rs\. INR/g, 'INR');

fs.writeFileSync('src/lib/receipts.ts', c);
console.log('Fixed jsPDF rupee symbol in receipts.ts');
