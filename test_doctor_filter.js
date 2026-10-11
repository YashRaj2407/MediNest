// Comprehensive verification of Doctor Filtering & Search
(async () => {
  const res = await fetch('http://localhost:5000/api/v1/doctors');
  const { data: allDoctors } = await res.json();
  console.log('Loaded ' + allDoctors.length + ' doctors from database.\n');

  function matchesDoctorSpecialty(doc, targetSpecialty) {
    if (!targetSpecialty || targetSpecialty === 'all') return true;
    const target = targetSpecialty.toLowerCase().trim();
    const targetNorm = target.replace(/[^a-z0-9]/g, '');
    const docSpecId = (doc.specialtyId || '').toLowerCase().trim();
    const docSpecIdNorm = docSpecId.replace(/[^a-z0-9]/g, '');
    const docSpecName = (doc.specialty || '').toLowerCase().trim();
    const docSpecNameNorm = docSpecName.replace(/[^a-z0-9]/g, '');
    if (docSpecId === target || docSpecName === target) return true;
    if (docSpecIdNorm === targetNorm || docSpecNameNorm === targetNorm) return true;
    if (target === 'ent' && docSpecName.includes('ent')) return true;
    if (docSpecId === 'ent' && target.includes('ent')) return true;
    if (docSpecName.includes(target) || target.includes(docSpecId)) return true;
    return false;
  }

  function matchesDoctorSearch(doc, query) {
    if (!query || !query.trim()) return true;
    const q = query.trim().toLowerCase();
    if (matchesDoctorSpecialty(doc, q)) return true;
    const name = (doc.name || '').toLowerCase();
    const clinic = (doc.clinicName || '').toLowerCase();
    const city = (doc.city || '').toLowerCase();
    const address = (doc.address || '').toLowerCase();
    const about = (doc.about || '').toLowerCase();
    const quals = (doc.qualifications || '').toLowerCase();
    const langs = (doc.languages || []).map(l => l.toLowerCase());
    const services = (doc.services || []).map(s => (s.name || '').toLowerCase());
    if (name.includes(q) || clinic.includes(q) || city.includes(q) || address.includes(q) || about.includes(q) || quals.includes(q) || langs.some(l => l.includes(q)) || services.some(s => s.includes(q))) return true;
    if ((q.includes('heart') || q.includes('cardio') || q.includes('chest')) && doc.specialtyId === 'cardiologist') return true;
    if ((q.includes('skin') || q.includes('acne') || q.includes('hair') || q.includes('derma')) && doc.specialtyId === 'dermatologist') return true;
    if ((q.includes('women') || q.includes('period') || q.includes('pcos') || q.includes('pregnancy') || q.includes('gynec')) && doc.specialtyId === 'gynecologist') return true;
    if ((q.includes('child') || q.includes('baby') || q.includes('pediatric')) && doc.specialtyId === 'pediatrician') return true;
    if ((q.includes('bone') || q.includes('joint') || q.includes('ortho') || q.includes('knee')) && doc.specialtyId === 'orthopedic') return true;
    if ((q.includes('mind') || q.includes('mental') || q.includes('psych') || q.includes('depression') || q.includes('anxiety')) && doc.specialtyId === 'psychiatrist') return true;
    if ((q.includes('ear') || q.includes('nose') || q.includes('throat') || q.includes('ent')) && doc.specialtyId === 'ent') return true;
    if ((q.includes('fever') || q.includes('cough') || q.includes('cold') || q.includes('general')) && doc.specialtyId === 'general-physician') return true;
    return false;
  }

  const assertions = [
    {
      desc: 'Filtering by Dermatologist returns ONLY Dermatologist (Dr. Ananya Sharma), NEVER Gynecologist (Dr. Kavya Iyer)',
      run: () => {
        const filtered = allDoctors.filter(d => matchesDoctorSpecialty(d, 'dermatologist'));
        const hasGynecologist = filtered.some(d => d.specialtyId === 'gynecologist' || d.name.includes('Kavya'));
        const hasDermatologist = filtered.some(d => d.specialtyId === 'dermatologist');
        return !hasGynecologist && hasDermatologist && filtered.length === 1;
      }
    },
    {
      desc: 'Filtering by Cardiologist returns ONLY Cardiologist (Dr. Arjun Mehta), NEVER Gynecologist (Dr. Kavya Iyer)',
      run: () => {
        const filtered = allDoctors.filter(d => matchesDoctorSpecialty(d, 'cardiologist'));
        const hasGynecologist = filtered.some(d => d.specialtyId === 'gynecologist' || d.name.includes('Kavya'));
        const hasCardiologist = filtered.some(d => d.specialtyId === 'cardiologist');
        return !hasGynecologist && hasCardiologist && filtered.length === 1;
      }
    },
    {
      desc: 'Searching "cardiologist" returns ONLY Cardiologist, NEVER Gynecologist',
      run: () => {
        const filtered = allDoctors.filter(d => matchesDoctorSearch(d, 'cardiologist'));
        const hasGynecologist = filtered.some(d => d.specialtyId === 'gynecologist' || d.name.includes('Kavya'));
        const hasCardiologist = filtered.some(d => d.specialtyId === 'cardiologist');
        return !hasGynecologist && hasCardiologist && filtered.length === 1;
      }
    },
    {
      desc: 'Searching "skin" or "acne" returns Dermatologist, NEVER Gynecologist',
      run: () => {
        const filteredSkin = allDoctors.filter(d => matchesDoctorSearch(d, 'skin'));
        const filteredAcne = allDoctors.filter(d => matchesDoctorSearch(d, 'acne'));
        return filteredSkin.every(d => d.specialtyId === 'dermatologist') && filteredAcne.every(d => d.specialtyId === 'dermatologist');
      }
    },
    {
      desc: 'Filtering by Gynecologist returns ONLY Dr. Kavya Iyer',
      run: () => {
        const filtered = allDoctors.filter(d => matchesDoctorSpecialty(d, 'gynecologist'));
        return filtered.length === 1 && filtered[0].name === 'Dr. Kavya Iyer' && filtered[0].specialty === 'Gynecologist';
      }
    },
    {
      desc: 'Filtering by General Physician returns Dr. Rohan Gupta and Dr. Yash Dhawale only',
      run: () => {
        const filtered = allDoctors.filter(d => matchesDoctorSpecialty(d, 'general-physician'));
        return filtered.length === 2 && filtered.every(d => d.specialtyId === 'general-physician');
      }
    },
    {
      desc: 'Filtering by Psychiatrist returns Dr. Neha Deshmukh and Dr. Shreyash Dhawale only',
      run: () => {
        const filtered = allDoctors.filter(d => matchesDoctorSpecialty(d, 'psychiatrist'));
        return filtered.length === 2 && filtered.every(d => d.specialtyId === 'psychiatrist');
      }
    },
    {
      desc: 'Backend API /doctors?specialty=dermatologist returns strictly Dermatologist',
      run: async () => {
        const r = await fetch('http://localhost:5000/api/v1/doctors?specialty=dermatologist');
        const j = await r.json();
        return j.data.length === 1 && j.data[0].specialty === 'Dermatologist' && !j.data.some(x => x.name.includes('Kavya'));
      }
    },
    {
      desc: 'Backend API /doctors?search=cardiologist returns strictly Cardiologist',
      run: async () => {
        const r = await fetch('http://localhost:5000/api/v1/doctors?search=cardiologist');
        const j = await r.json();
        return j.data.length === 1 && j.data[0].specialty === 'Cardiologist' && !j.data.some(x => x.name.includes('Kavya'));
      }
    }
  ];

  let okCount = 0;
  for (const a of assertions) {
    const passed = await a.run();
    console.log((passed ? '✓ PASS: ' : '✗ FAIL: ') + a.desc);
    if (passed) okCount++;
  }

  console.log('\nDoctor Filter Test Results: ' + okCount + ' / ' + assertions.length + ' passed');
  if (okCount !== assertions.length) process.exit(1);
})();
