const fs = require('fs');
let routes = fs.readFileSync('backend/routes/doctorsRoutes.js', 'utf8');
if (!routes.includes('requireAuth')) {
    routes = "import { requireAuth } from '../middleware/auth.js';\n" + routes;
}
routes = routes.replace("router.post('/register', registerDoctor);", "router.post('/register', requireAuth, registerDoctor);");
fs.writeFileSync('backend/routes/doctorsRoutes.js', routes);
console.log('Fixed doctorsRoutes.js');
