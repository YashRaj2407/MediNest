# MediNest AWS Three-Tier Infrastructure (Terraform)

Production deployment of the **MediNest** healthcare platform on Amazon Web Services using Terraform in region `ap-south-1` (Mumbai).

---

## 🏛️ Architecture

- **Tier 1 (Frontend):** EC2 `t3.micro` in Public Subnet `10.0.1.0/24` with Nginx reverse proxy serving the Vite React SPA build and proxying `/api/` to the backend.
- **Tier 2 (Backend/API):** EC2 `t3.micro` in Private Application Subnet `10.0.3.0/24` running Node.js Express (port 5000) and local MongoDB. Outbound internet routed securely through NAT Gateway.
- **Tier 3 (Database):** Amazon RDS MySQL 8.0 (`db.t3.micro`, 20GB gp3) in Private Database Subnets (`10.0.5.0/24` & `10.0.6.0/24`) with zero public access. Ingress restricted strictly to Backend Security Group on port 3306.

---

## 📋 Provisioned Resources Inventory

| Resource Type | Resource Identifier | Subnet Placement | Purpose |
|---|---|---|---|
| **VPC** | `vpc-0fe7ac87f88339a22` | `10.0.0.0/16` | Isolated Network |
| **Internet Gateway** | `igw-0b9eb1ff7e505bde8` | Attached to VPC | Inbound/Outbound Public Traffic |
| **NAT Gateway** | `nat-008582e8d3d2f2471` | Public Subnet `10.0.1.0/24` | Private App Outbound Internet |
| **Elastic IP** | `3.7.197.166` | NAT Gateway | Static Public IPv4 for NAT |
| **Frontend EC2** | `i-006016fee4592f9bf` | Public Subnet (`3.110.216.240`) | Nginx Web Server + Vite React App |
| **Backend EC2** | `i-0dfdf312a29d4b547` | Private Subnet (`10.0.3.58`) | Node.js Express API Backend |
| **Amazon RDS** | `medinest-mysql` | Private DB Subnets (`medinest-db-subnet-group`) | MySQL 8.0 Production Database |

---

## 🚀 Live Access URLs

- **Public Application:** [http://3.110.216.240](http://3.110.216.240)
- **Backend API Health Check:** [http://3.110.216.240/api/v1/health](http://3.110.216.240/api/v1/health)
- **Doctors Endpoint:** [http://3.110.216.240/api/v1/doctors](http://3.110.216.240/api/v1/doctors)

---

## 🔐 SSH Access

The SSH private key has been generated and saved locally at:
`terraform/medinest-key.pem`

### Connect to Frontend EC2:
```bash
ssh -i ./medinest-key.pem ec2-user@3.110.216.240
```

### Connect to Backend EC2 (via Frontend Bastion):
```bash
ssh -i ./medinest-key.pem -J ec2-user@3.110.216.240 ec2-user@10.0.3.58
```

---

## 🛠️ Service Management

### Backend EC2 (`10.0.3.58`):
```bash
# Check backend status
sudo systemctl status medinest

# View live backend logs
sudo journalctl -u medinest -f

# Restart backend service
sudo systemctl restart medinest
```

### Frontend EC2 (`3.110.216.240`):
```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## ⚠️ Infrastructure Teardown (Destructive)

> [!CAUTION]
> Running this command will permanently destroy all 33 AWS resources, including the RDS database and all stored data.

```bash
cd terraform
terraform destroy -auto-approve
```
