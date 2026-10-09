const fs = require('fs');

// Fix DoctorPortalView.tsx
let c = fs.readFileSync('src/components/DoctorPortalView.tsx', 'utf8');

// Add import at top
if (!c.includes('formatINR')) {
  c = c.replace("import { DoctorAuthData", "import { formatINR } from '../lib/formatCurrency';\nimport { DoctorAuthData");
}

// Fix earnings display
c = c.replace(
  "₹{totalEarningsINR.toLocaleString('en-IN')}",
  "{formatINR(totalEarningsINR)}"
);

// Fix fee display
c = c.replace(
  "₹{doctor.feeINR} / consultation",
  "{doctor.feeINR ? formatINR(doctor.feeINR) + ' / consultation' : 'Fee not set'}"
);

fs.writeFileSync('src/components/DoctorPortalView.tsx', c);
console.log('Fixed DoctorPortalView.tsx');

// Fix DoctorEarningsTab.tsx
let e = fs.readFileSync('src/components/doctor/DoctorEarningsTab.tsx', 'utf8');
if (!e.includes('formatINR')) {
  e = "import { formatINR } from '../../lib/formatCurrency';\n" + e;
}

// Replace all manual rupee string constructs
e = e.replace(/₹\{([^}]+)\}/g, '{formatINR($1)}');
e = e.replace(/`₹\${([^}]+)}`/g, 'formatINR($1)');
e = e.replace(/'₹' \+/g, 'formatINR(');
e = e.replace(/\+ '₹'/g, ') // rupee');

fs.writeFileSync('src/components/doctor/DoctorEarningsTab.tsx', e);
console.log('Fixed DoctorEarningsTab.tsx');

// Fix DoctorList.tsx fee display
let dl = fs.readFileSync('src/components/DoctorList.tsx', 'utf8');
if (!dl.includes('formatINR') && dl.includes('feeINR')) {
  dl = "import { formatINR } from '../lib/formatCurrency';\n" + dl;
  // Fix fee display patterns
  dl = dl.replace(/₹\{([^}]+)\}/g, '{formatINR($1)}');
  dl = dl.replace(/`₹\${([^}]+)}`/g, 'formatINR($1)');
  fs.writeFileSync('src/components/DoctorList.tsx', dl);
  console.log('Fixed DoctorList.tsx');
}

// Fix DoctorProfileModal.tsx if exists
try {
  let pm = fs.readFileSync('src/components/DoctorProfileModal.tsx', 'utf8');
  if (!pm.includes('formatINR') && pm.includes('feeINR')) {
    pm = "import { formatINR } from '../lib/formatCurrency';\n" + pm;
    pm = pm.replace(/₹\{([^}]+)\}/g, '{formatINR($1)}');
    pm = pm.replace(/`₹\${([^}]+)}`/g, 'formatINR($1)');
    fs.writeFileSync('src/components/DoctorProfileModal.tsx', pm);
    console.log('Fixed DoctorProfileModal.tsx');
  }
} catch(e2) {}

// Fix BookingPaymentModal.tsx 
try {
  let bm = fs.readFileSync('src/components/BookingPaymentModal.tsx', 'utf8');
  if (!bm.includes('formatINR') && bm.includes('feeINR')) {
    bm = "import { formatINR } from '../lib/formatCurrency';\n" + bm;
    bm = bm.replace(/₹\{([^}]+)\}/g, '{formatINR($1)}');
    bm = bm.replace(/`₹\${([^}]+)}`/g, 'formatINR($1)');
    fs.writeFileSync('src/components/BookingPaymentModal.tsx', bm);
    console.log('Fixed BookingPaymentModal.tsx');
  }
} catch(e3) {}
