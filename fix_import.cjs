const fs = require('fs');
let content = fs.readFileSync('src/components/DoctorAuthModal.tsx', 'utf8');
content = content.replace("import { doctorSupabase, SUPABASE_CONFIGURED } from '../lib/supabase';", "");
fs.writeFileSync('src/components/DoctorAuthModal.tsx', content);
