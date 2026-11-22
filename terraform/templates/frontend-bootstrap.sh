#!/bin/bash
set -ex

# Log everything
exec > /var/log/medinest-frontend-setup.log 2>&1

echo "=== MediNest Frontend Bootstrap ==="
echo "Started at: $(date)"

# Update system
dnf update -y
dnf install -y nginx git nodejs22 npm

# Enable Node.js 22
alternatives --install /usr/bin/node node /usr/bin/node-22 100
alternatives --install /usr/bin/npm npm /usr/bin/npm-22 100

# Clone the repository
cd /opt
git clone https://github.com/YashRaj2407/MediNest.git medinest
cd medinest

# Create frontend .env for Vite build
cat > .env <<'ENVEOF'
VITE_API_BASE_URL=http://${FRONTEND_PUBLIC_IP}/api/v1
VITE_CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}
VITE_RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
ENVEOF

# Install dependencies and build frontend
npm install
npm run build

# Copy built frontend to Nginx
rm -rf /usr/share/nginx/html/*
cp -r dist/* /usr/share/nginx/html/

# Configure Nginx as reverse proxy to backend
cat > /etc/nginx/conf.d/medinest.conf <<'NGINXEOF'
server {
    listen 80 default_server;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Frontend SPA - serve index.html for all non-file routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy API requests to backend (private subnet)
    location /api/ {
        proxy_pass http://${BACKEND_PRIVATE_IP}:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

# Remove default nginx config that conflicts
rm -f /etc/nginx/conf.d/default.conf
# Comment out the default server block in nginx.conf if it exists
sed -i '/server {/,/}/s/^/#/' /etc/nginx/nginx.conf 2>/dev/null || true

# Test and start nginx
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "=== Frontend Bootstrap Complete ==="
echo "Finished at: $(date)"
