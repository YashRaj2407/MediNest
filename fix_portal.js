const fs = require('fs');
let content = fs.readFileSync('src/components/DoctorPortalView.tsx', 'utf8');

// 1. Add useEffect
content = content.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';");

// 2. Fix todayAppts
content = content.replace(
  "const todayAppts = appointments.filter(\n    a => (a.date.toLowerCase().includes('today') || a.date.toLowerCase().includes('sep 11')) && a.status !== 'cancelled'\n  );",
  "const todayAppts = appointments.filter(\n    a => (a.date.toLowerCase().includes('today') || a.date.includes(new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short'}))) && a.status !== 'cancelled'\n  );"
);

// 3. Fix upcomingAppts
content = content.replace(
  "const upcomingAppts = appointments.filter(\n    a => a.status === 'upcoming' && !a.date.toLowerCase().includes('today') && !a.date.toLowerCase().includes('sep 11')\n  );",
  "const upcomingAppts = appointments.filter(\n    a => a.status === 'upcoming' && !a.date.toLowerCase().includes('today') && !a.date.includes(new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short'}))\n  );"
);

// 4. Fix totalEarningsINR
content = content.replace(
  "const totalEarningsINR = 48400 + (completedAppts.length * doctor.feeINR);",
  "const [totalEarningsINR, setTotalEarningsINR] = useState(0); useEffect(() => { fetch(`${(import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}/doctors/${doctor.id}/stats`).then(r => r.json()).then(d => { if(d.success) setTotalEarningsINR(d.data.totalEarnings); }).catch(()=>{}); }, [doctor.id, appointments]);"
);

// 5. Fix date string
content = content.replace(
  "Today is Friday, 11 September 2026",
  "Today is {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}"
);

// 6. Fix completed count
content = content.replace(
  "{completedAppts.length + 94}",
  "{completedAppts.length}"
);

// 7. Fix patient satisfaction
content = content.replace(
  "<span>99.2% Patient Satisfaction</span>",
  "<span>{doctor.reviewCount > 0 ? `${doctor.rating} / 5.0 Average Rating` : 'No reviews yet'}</span>"
);

// 8. Remove afternoon break line
content = content.replace(
  "Your afternoon break is active from 03:00 PM to 05:00 PM.",
  ""
);

// 9. Remove afternoon break marker
content = content.replace(
  /{[\s]*\/\* Afternoon Break Visual Marker \*\/}[\s\S]*?Slots Auto-Hidden to Patients<\/span>[\s]*<\/div>/g,
  ""
);

fs.writeFileSync('src/components/DoctorPortalView.tsx', content);
console.log('Fixed DoctorPortalView.tsx');
