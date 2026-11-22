# ─── Region & Networking ─────────────────────────────────────────────────────
variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-south-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the MediNest VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "medinest"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

# ─── EC2 ─────────────────────────────────────────────────────────────────────
variable "frontend_instance_type" {
  description = "EC2 instance type for the frontend server"
  type        = string
  default     = "t3.micro"
}

variable "backend_instance_type" {
  description = "EC2 instance type for the backend server"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI ID for EC2 instances (Amazon Linux 2023 in ap-south-1)"
  type        = string
  default     = "ami-0ba051b596cabfebe"
}

# ─── RDS ─────────────────────────────────────────────────────────────────────
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_engine_version" {
  description = "MySQL engine version for RDS"
  type        = string
  default     = "8.0"
}

variable "db_name" {
  description = "Name of the MySQL database"
  type        = string
  default     = "medinest_db"
}

variable "db_username" {
  description = "Master username for the RDS instance"
  type        = string
  default     = "medinest_admin"
}

variable "db_password" {
  description = "Master password for the RDS instance"
  type        = string
  sensitive   = true
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

# ─── Application Secrets ────────────────────────────────────────────────────
variable "clerk_publishable_key" {
  description = "Clerk publishable key (frontend)"
  type        = string
  sensitive   = true
}

variable "clerk_secret_key" {
  description = "Clerk secret key (backend)"
  type        = string
  sensitive   = true
}

variable "razorpay_key_id" {
  description = "Razorpay Key ID (frontend + backend)"
  type        = string
  sensitive   = true
}

variable "razorpay_key_secret" {
  description = "Razorpay Key Secret (backend)"
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Google Gemini AI API key (backend)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "admin_secret_token" {
  description = "Admin authentication token"
  type        = string
  sensitive   = true
  default     = "medinest_admin_secret_token_2026"
}

# ─── SSH ─────────────────────────────────────────────────────────────────────
variable "my_ip_cidr" {
  description = "Your public IP in CIDR notation for SSH access (e.g., 203.0.113.5/32)"
  type        = string
  default     = "0.0.0.0/0"
}
