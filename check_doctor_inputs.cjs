const fs = require('fs');
let c = fs.readFileSync('src/components/DoctorAuthModal.tsx', 'utf8');
const lines = c.split('\n');
lines.forEach((l, i) => {
  if (l.includes('Phone') || l.includes('phone') || l.includes('Mobile') || l.includes('regPhone') || l.includes('regMobile')) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});
