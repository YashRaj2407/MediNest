const fs = require('fs');

function fixFile(file) {
  try {
    let c = fs.readFileSync(file, 'utf8');
    if (!c.includes('formatINR')) {
      c = "import { formatINR } from '../lib/formatCurrency';\n" + c;
    }
    let modified = false;
    
    if (c.includes('₹0')) {
      c = c.replace(/₹0/g, "{formatINR(0)}");
      modified = true;
    }
    if (c.includes('₹')) {
      // Find `₹${var}` and replace with `{formatINR(var)}`
      const before = c;
      c = c.replace(/₹\{([^}]+)\}/g, '{formatINR($1)}');
      if (before !== c) modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(file, c);
      console.log('Fixed', file);
    }
  } catch(e) {}
}

fixFile('src/components/AboutSection.tsx');
fixFile('src/components/BookingPaymentModal.tsx');
fixFile('src/components/AdminPortalView.tsx');
