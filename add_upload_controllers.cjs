const fs = require('fs');
let c = fs.readFileSync('backend/controllers/doctorsController.js', 'utf8');

const newControllers = `
export async function handlePhotoUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No photo provided' });
    }
    // Simulate cloud upload and return a fake URL (or data URI for demo)
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const url = \`data:\${mimeType};base64,\${base64}\`;
    
    return res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('[Upload Photo Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleDocumentUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No document provided' });
    }
    // Simulate cloud upload and return a fake URL
    // We do NOT return base64 for PDFs in this demo to avoid massive payload size
    // Just return a dummy path for ID proof since it's private anyway
    const url = \`/private/docs/\${Date.now()}-\${req.file.originalname}\`;
    
    return res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('[Upload Document Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
`;

if (!c.includes('handlePhotoUpload')) {
  c += '\n' + newControllers;
  fs.writeFileSync('backend/controllers/doctorsController.js', c);
}
console.log('Added upload controllers');
