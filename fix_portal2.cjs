const fs = require('fs');
let content = fs.readFileSync('src/components/DoctorPortalView.tsx', 'utf8');

content = content.replace(
  "import React, { useState } from 'react';", 
  "import React, { useState, useEffect } from 'react';"
);

content = content.replace(
  "const todayAppts = appointments.filter(\n    a => (a.date.toLowerCase().includes('today') || a.date.toLowerCase().includes('sep 11')) && a.status !== 'cancelled'\n  );",
  "const todayAppts = appointments.filter(\n    a => (a.date.toLowerCase().includes('today') || a.date.includes(new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short'}))) && a.status !== 'cancelled'\n  );"
);

content = content.replace(
  "const upcomingAppts = appointments.filter(\n    a => a.status === 'upcoming' && !a.date.toLowerCase().includes('today') && !a.date.toLowerCase().includes('sep 11')\n  );",
  "const upcomingAppts = appointments.filter(\n    a => a.status === 'upcoming' && !a.date.toLowerCase().includes('today') && !a.date.includes(new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short'}))\n  );"
);

content = content.replace(
  "const totalEarningsINR = 48400 + (completedAppts.length * doctor.feeINR);",
  "const [totalEarningsINR, setTotalEarningsINR] = useState(0); useEffect(() => { fetch(`${(import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}/doctors/${doctor.id}/stats`).then(r => r.json()).then(d => { if(d.success) setTotalEarningsINR(d.data.totalEarnings); }).catch(()=>{}); }, [doctor.id, appointments]);"
);

content = content.replace(
  "Today is Friday, 11 September 2026",
  "Today is {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}"
);

content = content.replace(
  "{completedAppts.length + 94}",
  "{completedAppts.length}"
);

content = content.replace(
  "<span>99.2% Patient Satisfaction</span>",
  "<span>{doctor.reviewCount > 0 ? `${doctor.rating} / 5.0 Average Rating` : 'No reviews yet'}</span>"
);

content = content.replace(
  "Your afternoon break is active from 03:00 PM to 05:00 PM.",
  ""
);

const lines = content.split('\n');
const markerIndex = lines.findIndex(l => l.includes('{/* Afternoon Break Visual Marker */}'));
if (markerIndex !== -1) {
  lines.splice(markerIndex, 8); // Remove 8 lines
  content = lines.join('\n');
}

fs.writeFileSync('src/components/DoctorPortalView.tsx', content);
console.log('Fixed portal view 2');
