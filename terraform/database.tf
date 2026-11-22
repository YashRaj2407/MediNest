# =============================================================================
# MediNest Database — Amazon RDS MySQL
# =============================================================================

# ─── DB Subnet Group ────────────────────────────────────────────────────────
resource "aws_db_subnet_group" "mysql" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private_db[*].id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-db-subnet-group"
  })
}

# ─── RDS MySQL Instance ─────────────────────────────────────────────────────
resource "aws_db_instance" "mysql" {
  identifier     = "${var.project_name}-mysql"
  engine         = "mysql"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.mysql.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period = 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  skip_final_snapshot       = true
  final_snapshot_identifier = "${var.project_name}-mysql-final"
  deletion_protection       = false

  parameter_group_name = "default.mysql8.0"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-mysql"
    Tier = "database"
  })
}
