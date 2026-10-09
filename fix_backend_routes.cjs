const fs = require('fs');
let routes = fs.readFileSync('backend/routes/doctorsRoutes.js', 'utf8');
routes = routes.replace("router.post('/login', doctorLogin);", "router.post('/login', requireAuth, doctorLogin);");
fs.writeFileSync('backend/routes/doctorsRoutes.js', routes);
console.log('Fixed doctorsRoutes.js');
