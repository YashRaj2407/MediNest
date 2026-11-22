# =============================================================================
# MediNest Compute — Frontend & Backend EC2 Instances
# =============================================================================

# ─── SSH Key Pair ────────────────────────────────────────────────────────────
resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "medinest" {
  key_name   = "${var.project_name}-key"
  public_key = tls_private_key.ssh.public_key_openssh

  tags = local.common_tags
}

resource "local_file" "ssh_private_key" {
  content         = tls_private_key.ssh.private_key_pem
  filename        = "${path.module}/${var.project_name}-key.pem"
  file_permission = "0400"
}

# ─── Frontend EC2 (Public Subnet) ───────────────────────────────────────────
resource "aws_instance" "frontend" {
  ami                         = var.ami_id
  instance_type               = var.frontend_instance_type
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.frontend.id]
  key_name                    = aws_key_pair.medinest.key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name
  associate_public_ip_address = true

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }

  user_data = <<-INITEOF
#!/bin/bash
set -ex
exec > /var/log/medinest-frontend-init.log 2>&1
echo "=== MediNest Frontend Phase 1 — Base Setup ==="
dnf update -y
dnf install -y nginx git

# Install Node.js 22 via NodeSource
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs

node --version
npm --version

cd /opt
git clone https://github.com/YashRaj2407/MediNest.git medinest || true
sudo chown -R ec2-user:ec2-user /opt/medinest
echo "PHASE1_DONE" > /tmp/medinest-phase1-done
echo "=== Phase 1 Complete ==="
  INITEOF

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-frontend"
    Tier = "frontend"
  })

  depends_on = [aws_internet_gateway.main]
}

# ─── Backend EC2 (Private Subnet) ───────────────────────────────────────────
resource "aws_instance" "backend" {
  ami                    = var.ami_id
  instance_type          = var.backend_instance_type
  subnet_id              = aws_subnet.private_app[0].id
  vpc_security_group_ids = [aws_security_group.backend.id]
  key_name               = aws_key_pair.medinest.key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }

  user_data = base64encode(templatefile("${path.module}/templates/backend-bootstrap.sh", {
    CLERK_PUBLISHABLE_KEY = var.clerk_publishable_key
    CLERK_SECRET_KEY      = var.clerk_secret_key
    RAZORPAY_KEY_ID       = var.razorpay_key_id
    RAZORPAY_KEY_SECRET   = var.razorpay_key_secret
    GEMINI_API_KEY        = var.gemini_api_key
    DB_HOST               = aws_db_instance.mysql.address
    DB_USERNAME           = var.db_username
    DB_PASSWORD           = var.db_password
    DB_NAME               = var.db_name
    FRONTEND_PUBLIC_IP    = aws_instance.frontend.public_ip
    ADMIN_SECRET_TOKEN    = var.admin_secret_token
  }))

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-backend"
    Tier = "backend"
  })

  depends_on = [aws_db_instance.mysql, aws_nat_gateway.main]
}

# ─── Frontend Phase 2 — Build + Nginx (after backend IP is known) ───────────
resource "null_resource" "frontend_configure" {
  triggers = {
    backend_ip  = aws_instance.backend.private_ip
    frontend_ip = aws_instance.frontend.public_ip
  }

  connection {
    type        = "ssh"
    host        = aws_instance.frontend.public_ip
    user        = "ec2-user"
    private_key = tls_private_key.ssh.private_key_pem
    timeout     = "15m"
  }

  provisioner "file" {
    source      = "${path.module}/deploy_frontend.sh"
    destination = "/tmp/deploy_frontend.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "echo 'Waiting for Phase 1 to complete...'",
      "for i in $(seq 1 60); do [ -f /tmp/medinest-phase1-done ] && break; echo \"Waiting... ($i/60)\"; sleep 10; done",
      "[ -f /tmp/medinest-phase1-done ] || { echo 'Phase 1 did not complete in time'; exit 1; }",
      "echo 'Phase 1 confirmed complete.'",
      "sudo chown -R ec2-user:ec2-user /opt/medinest",
      "chmod +x /tmp/deploy_frontend.sh",
      "bash /tmp/deploy_frontend.sh ${aws_instance.backend.private_ip}"
    ]
  }

  depends_on = [aws_instance.frontend, aws_instance.backend]
}
