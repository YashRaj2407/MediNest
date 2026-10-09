const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Update import to include fetchFeaturedDoctors and fetchDoctors
c = c.replace(
  "import { fetchDoctors } from './lib/doctors';",
  "import { fetchDoctors, fetchFeaturedDoctors } from './lib/doctors';"
);

// Change the doctors load to use featured doctors by default
c = c.replace(
  `  // â"€â"€ Load doctors from API (falls back to static on failure) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    setDoctorsLoading(true);
    fetchDoctors().then(data => {
      setDoctors(data);
    }).finally(() => {
      setDoctorsLoading(false);
    });
  }, []);`,
  `  // â"€â"€ Load featured doctors for homepage (falls back to static on failure) â"€â"€
  useEffect(() => {
    setDoctorsLoading(true);
    fetchFeaturedDoctors().then(data => {
      setDoctors(data);
    }).finally(() => {
      setDoctorsLoading(false);
    });
  }, []);`
);

fs.writeFileSync('src/App.tsx', c);
console.log('Fixed App.tsx');
