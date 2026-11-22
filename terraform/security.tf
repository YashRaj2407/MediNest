# =============================================================================
# MediNest Security Groups
# =============================================================================

# ─── Frontend Security Group ────────────────────────────────────────────────
resource "aws_security_group" "frontend" {
  name        = "${var.project_name}-frontend-sg"
  description = "Allow HTTP/HTTPS from internet, SSH from admin"
  vpc_id      = aws_vpc.main.id

  # HTTP
  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH
  ingress {
    description = "SSH from admin IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-frontend-sg"
  })
}

# ─── Backend Security Group ─────────────────────────────────────────────────
resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend-sg"
  description = "Allow app traffic from frontend, SSH from frontend"
  vpc_id      = aws_vpc.main.id

  # Backend API port from frontend
  ingress {
    description     = "Backend API from frontend"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend.id]
  }

  # SSH from frontend (bastion-style)
  ingress {
    description     = "SSH from frontend (bastion)"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend.id]
  }

  egress {
    description = "All outbound (for NAT, external APIs)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-backend-sg"
  })
}

# ─── Database Security Group ────────────────────────────────────────────────
resource "aws_security_group" "database" {
  name        = "${var.project_name}-database-sg"
  description = "Allow MySQL from backend only"
  vpc_id      = aws_vpc.main.id

  # MySQL from backend
  ingress {
    description     = "MySQL from backend"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-database-sg"
  })
}
