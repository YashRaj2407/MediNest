locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  azs = ["${var.aws_region}a", "${var.aws_region}b"]

  # Subnet CIDRs
  public_subnet_cidrs      = ["10.0.1.0/24", "10.0.2.0/24"]
  private_app_subnet_cidrs = ["10.0.3.0/24", "10.0.4.0/24"]
  private_db_subnet_cidrs  = ["10.0.5.0/24", "10.0.6.0/24"]
}
