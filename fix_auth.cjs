const fs = require('fs');
let content = fs.readFileSync('src/components/DoctorAuthModal.tsx', 'utf8');

const oldHandleReg = `  const handleRegisterSubmit = async (e: React.FormEvent) => {
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

    const newDoctor: DoctorAuthData = {
      id: \`doc-\${Date.now()}\`,
      name: regName.startsWith('Dr.') ? regName : \`Dr. \${regName}\`,
      email: regEmail,
      phone: regPhone,
      specialty: regSpecialty,
      qualifications: regQualifications,
      experienceYears: Number(regExperience) || 0,
      clinicName: regClinicName || '',
      address: regClinicAddress || '',
      city: regCity,
      feeINR: Number(regFeeINR) || 499,
      rating: 5.0,
      reviewCount: 1,
      registrationNumber: regRegNumber,
      photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300',
      languages: ['English', 'Hindi'],
      isLoggedIn: true,
      acceptingNewAppointments: true,
      consultationModes: ['video', 'clinic']
    };

    setRegistrationSubmitted(true);

    setTimeout(() => {
      onDoctorLoginSuccess(newDoctor);
      onClose();
    }, 1500);
    setRegLoading(false);
  };`;

const newHandleReg = `  const handleRegisterSubmit = async (e: React.FormEvent) => {
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

    try {
      const clerkUserId = \`user_doc_\${Date.now()}\`; // Minimal demo clerk user ID for registration
      
      const res = await fetch(\`\${API_BASE_URL}/doctors/register\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: clerkUserId,
          email: regEmail,
          fullName: regName,
          phone: regPhone,
          name: regName.startsWith("Dr.") ? regName : \`Dr. \${regName}\`,
          registrationNumber: regRegNumber,
          specialty: regSpecialty,
          qualifications: regQualifications,
          experienceYears: Number(regExperience) || 0,
          clinicName: regClinicName || "",
          address: regClinicAddress || "",
          city: regCity
        }),
      });
      
      const body = await res.json();
      if (!res.ok || !body.success) {
        setRegError(body?.error || "Failed to register doctor profile.");
        setRegLoading(false);
        return;
      }
      
      setRegistrationSubmitted(true);
      setTimeout(async () => {
        // Fetch the created profile to login
        try {
          const profileRes = await fetch(\`\${API_BASE_URL}/doctors/profile/by-user/\${clerkUserId}\`);
          const profileBody = await profileRes.json();
          if (profileRes.ok && profileBody.success && profileBody.data) {
            onDoctorLoginSuccess(profileBody.data as DoctorAuthData);
            onClose();
          } else {
            setRegError("Registration successful, but failed to log in automatically.");
          }
        } catch (e) {
          setRegError("Registration successful. Please log in.");
        }
        setRegLoading(false);
      }, 1500);
      
    } catch (err: any) {
      setRegError(\`Network error: \${err?.message || "Server unreachable"}\`);
      setRegLoading(false);
    }
  };`;

content = content.replace(oldHandleReg, newHandleReg);
content = content.replace("const [regFeeINR, setRegFeeINR] = useState('499');", "const [regFeeINR, setRegFeeINR] = useState('');");

fs.writeFileSync('src/components/DoctorAuthModal.tsx', content);
console.log('Fixed auth modal');
