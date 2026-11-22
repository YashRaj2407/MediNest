#!/bin/bash
set -ex

BACKEND_IP="${1:-10.0.3.58}"
echo "=== Deploying MediNest Frontend (Backend target: $BACKEND_IP) ==="
cd /opt/medinest

# Ensure repo is up to date
git pull origin main || true

# Write frontend .env
cat > .env << 'EOF'
VITE_API_BASE_URL=/api/v1
VITE_CLERK_PUBLISHABLE_KEY=pk_test_dGhhbmtmdWwtc2VydmFsLTkyNDUuY2xlcmsuYWNjb3VudHMuZGV2JA
VITE_RAZORPAY_KEY_ID=rzp_test_ThObIjgNm7uSog
EOF

# Install dependencies and build
npm install
npm run build

# Copy build to Nginx
sudo rm -rf /usr/share/nginx/html/*
sudo cp -r dist/* /usr/share/nginx/html/

# Ensure correct permissions
sudo chown -R nginx:nginx /usr/share/nginx/html
sudo chmod -R 755 /usr/share/nginx/html

# Write Nginx configuration
sudo tee /etc/nginx/conf.d/medinest.conf > /dev/null << NGINX
server {
    listen 80 default_server;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Frontend Single Page App routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Reverse proxy API requests to backend in private subnet
    location /api/ {
        proxy_pass http://$BACKEND_IP:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # Static asset caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

# Disable default server block in nginx.conf if present
sudo sed -i 's/listen       80 default_server;/listen       8080 default_server;/g' /etc/nginx/nginx.conf 2>/dev/null || true
sudo rm -f /etc/nginx/conf.d/default.conf

# Test and start Nginx
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

echo "=== Frontend Deployed Successfully ==="
