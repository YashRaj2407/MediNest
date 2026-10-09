const fs = require('fs');
let e = fs.readFileSync('src/components/doctor/DoctorEarningsTab.tsx', 'utf8');

e = e.replace(/\{formatINR\(([^.]+)\.toLocaleString\('en-IN'\)\)\}/g, '{formatINR($1)}');

fs.writeFileSync('src/components/doctor/DoctorEarningsTab.tsx', e);
console.log('Fixed DoctorEarningsTab.tsx typing errors');
