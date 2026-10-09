const fs = require('fs');
let c = fs.readFileSync('backend/routes/doctorsRoutes.js', 'utf8');

if (!c.includes('uploadPhoto')) {
  c = c.replace(
    "import express from 'express';",
    "import express from 'express';\nimport { uploadPhoto, uploadDocument } from '../middleware/upload.js';"
  );
  
  c = c.replace(
    "import { \n  getDoctors,",
    "import { \n  getDoctors,"
  );
  
  if (!c.includes('handlePhotoUpload')) {
     c = c.replace(
       "getFeaturedDoctors\n} from '../controllers/doctorsController.js';",
       "getFeaturedDoctors,\n  handlePhotoUpload,\n  handleDocumentUpload\n} from '../controllers/doctorsController.js';"
     );
  }

  c = c.replace("router.post('/login', requireAuth, doctorLogin);", "router.post('/login', requireAuth, doctorLogin);\nrouter.post('/upload-photo', requireAuth, uploadPhoto.single('photo'), handlePhotoUpload);\nrouter.post('/upload-document', requireAuth, uploadDocument.single('document'), handleDocumentUpload);");

  fs.writeFileSync('backend/routes/doctorsRoutes.js', c);
}
console.log('Fixed doctorsRoutes.js');
