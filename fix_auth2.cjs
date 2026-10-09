const fs = require('fs');
let content = fs.readFileSync('src/components/DoctorAuthModal.tsx', 'utf8');

const regexLogin = /const handleLoginSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?finally \{\s*setLoginLoading\(false\);\s*\}\s*\};/;
const regexRegister = /const handleRegisterSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?finally \{\s*setRegLoading\(false\);\s*\}\s*\};/;
const regexQuickLogin = /const handleQuickDoctorSelect = async \(doctorEmail: string\) => \{[\s\S]*?finally \{\s*setLoginLoading\(false\);\s*\}\s*\};/;

const newLogin = `const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim()) { setLoginError('Please enter your registered doctor email address.'); return; }
    setLoginLoading(true);
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    try {
      const res = await fetch(\`\${API_BASE_URL}/doctors/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim() }),
      });
      const body = await res.json();
      if (!res.ok || !body.success || !body.data) {
        setLoginError(body?.error || 'No verified doctor profile found with this email.');
        return;
      }
      onDoctorLoginSuccess(body.data as DoctorAuthData);
      onClose();
    } catch (err: any) {
      setLoginError(\`Network error connecting to doctor portal: \${err?.message || 'Server unreachable'}\`);
    } finally {
      setLoginLoading(false);
    }
  };`;

const newQuickLogin = `const handleQuickDoctorSelect = async (doctorEmail: string) => {
    setLoginError('');
    setLoginEmail(doctorEmail);
    setLoginLoading(true);
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    try {
      const res = await fetch(\`\${API_BASE_URL}/doctors/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: doctorEmail }),
      });
      const body = await res.json();
      if (!res.ok || !body.success || !body.data) {
        setLoginError(body?.error || 'Failed to authenticate quick demo account.');
        return;
      }
      onDoctorLoginSuccess(body.data as DoctorAuthData);
      onClose();
    } catch (err: any) {
      setLoginError(\`Network error: \${err?.message || 'Server unreachable'}\`);
    } finally {
      setLoginLoading(false);
    }
  };`;

const newRegister = `const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regName || !regRegNumber || !regQualifications || !regPhone || !regEmail || !regPassword) {
      setRegError('Please fill all mandatory fields including password.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters.');
      return;
    }

    setRegLoading(true);
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    try {
      const clerkUserId = \`user_doc_\${Date.now()}\`; 
      const res = await fetch(\`\${API_BASE_URL}/doctors/register\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: clerkUserId,
          email: regEmail,
          fullName: regName,
          phone: regPhone,
          name: regName.startsWith('Dr.') ? regName : \`Dr. \${regName}\`,
          registrationNumber: regRegNumber,
          specialty: regSpecialty,
          qualifications: regQualifications,
          experienceYears: Number(regExperience) || 0,
          clinicName: regClinicName || '',
          address: regClinicAddress || '',
          city: regCity
        }),
      });
      
      const body = await res.json();
      if (!res.ok || !body.success) {
        setRegError(body?.error || 'Failed to register doctor profile.');
        setRegLoading(false);
        return;
      }
      
      setRegistrationSubmitted(true);
      setTimeout(async () => {
        try {
          const profileRes = await fetch(\`\${API_BASE_URL}/doctors/profile/by-user/\${clerkUserId}\`);
          const profileBody = await profileRes.json();
          if (profileRes.ok && profileBody.success && profileBody.data) {
            onDoctorLoginSuccess(profileBody.data as DoctorAuthData);
            onClose();
          } else {
            setRegError('Registration successful, but failed to log in automatically.');
          }
        } catch (e) {
          setRegError('Registration successful. Please log in.');
        }
        setRegLoading(false);
      }, 1500);
      
    } catch (err: any) {
      setRegError(\`Network error: \${err?.message || 'Server unreachable'}\`);
      setRegLoading(false);
    }
  };`;

content = content.replace(regexLogin, newLogin);
content = content.replace(regexRegister, newRegister);
content = content.replace(regexQuickLogin, newQuickLogin);

// Remove INITIAL_DEMO_DOCTOR import and usage if there
content = content.replace("import { INITIAL_DEMO_DOCTOR } from '../data/doctorPortalData';", "");
content = content.replace("import { doctorSupabase, SUPABASE_CONFIGURED } from '../lib/supabase';", "");
content = content.replace("const [regFeeINR, setRegFeeINR] = useState('499');", "const [regFeeINR, setRegFeeINR] = useState('');");

fs.writeFileSync('src/components/DoctorAuthModal.tsx', content);
console.log('Fixed DoctorAuthModal.tsx');
