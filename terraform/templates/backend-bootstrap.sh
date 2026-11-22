#!/bin/bash
set -ex

# Log everything
exec > /var/log/medinest-backend-setup.log 2>&1

echo "=== MediNest Backend Bootstrap ==="
echo "Started at: $(date)"

# Update system
dnf update -y
dnf install -y git nodejs22 npm

# Enable Node.js 22
alternatives --install /usr/bin/node node /usr/bin/node-22 100
alternatives --install /usr/bin/npm npm /usr/bin/npm-22 100

# Install MongoDB 8.0 Community Edition
cat > /etc/yum.repos.d/mongodb-org-8.0.repo <<'MONGOEOF'
[mongodb-org-8.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/8.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-8.0.asc
MONGOEOF

dnf install -y mongodb-org || {
  echo "MongoDB repo install failed, trying mongosh + mongod from tarball..."
  # Fallback: install mongosh at minimum
  dnf install -y mongodb-mongosh-shared-openssl3 || true
}

# Start MongoDB
systemctl enable mongod 2>/dev/null || true
systemctl start mongod 2>/dev/null || true

# Clone the repository
cd /opt
git clone https://github.com/YashRaj2407/MediNest.git medinest
cd medinest

# Create backend .env
cat > .env <<'ENVEOF'
PORT=5000
NODE_ENV=production

# Clerk
VITE_CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}
CLERK_SECRET_KEY=${CLERK_SECRET_KEY}

# Razorpay
VITE_RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}

# Gemini AI
GEMINI_API_KEY=${GEMINI_API_KEY}

# MySQL (RDS)
MYSQL_HOST=${DB_HOST}
MYSQL_PORT=3306
MYSQL_USER=${DB_USERNAME}
MYSQL_PASSWORD=${DB_PASSWORD}
MYSQL_DATABASE=${DB_NAME}
MYSQL_SSL=true

# MongoDB (local)
MONGODB_URI=mongodb://127.0.0.1:27017/medinest

# CORS
APP_URL=http://${FRONTEND_PUBLIC_IP}
FRONTEND_URL=http://${FRONTEND_PUBLIC_IP}

# Admin
ADMIN_SECRET_TOKEN=${ADMIN_SECRET_TOKEN}
ENVEOF

# Install dependencies
npm install --production

# Create systemd service for MediNest backend
cat > /etc/systemd/system/medinest.service <<'SVCEOF'
[Unit]
Description=MediNest Express Backend
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/medinest
ExecStart=/usr/bin/node backend/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=medinest
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable medinest
systemctl start medinest

echo "=== Backend Bootstrap Complete ==="
echo "Finished at: $(date)"
