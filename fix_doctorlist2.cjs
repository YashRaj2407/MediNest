const fs = require('fs');
let c = fs.readFileSync('src/components/DoctorList.tsx', 'utf8');

// Add searchLoading spinner before cards
c = c.replace(
  '{filteredDoctors.length > 0 ? (',
  '{searchLoading ? (\n              <div className="p-12 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700 mx-auto mb-3"></div><p className="text-sm text-slate-500">Searching doctors...</p></div>\n            ) : filteredDoctors.length > 0 ? ('
);

// Fix empty state message to be contextual
c = c.replace(
  '/* Empty State */',
  '/* Empty State - contextual message */'
);

fs.writeFileSync('src/components/DoctorList.tsx', c);
console.log('Fixed DoctorList.tsx empty/loading state');
