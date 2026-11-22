# =============================================================================
# MediNest Terraform Outputs
# =============================================================================

# ─── Application URL ────────────────────────────────────────────────────────
output "application_url" {
  description = "Public URL to access MediNest"
  value       = "http://${aws_instance.frontend.public_ip}"
}

output "api_health_url" {
  description = "Backend health check URL (via frontend proxy)"
  value       = "http://${aws_instance.frontend.public_ip}/api/v1/health"
}

# ─── EC2 ─────────────────────────────────────────────────────────────────────
output "frontend_public_ip" {
  description = "Public IP of the frontend EC2 instance"
  value       = aws_instance.frontend.public_ip
}

output "frontend_instance_id" {
  description = "Instance ID of the frontend EC2"
  value       = aws_instance.frontend.id
}

output "backend_private_ip" {
  description = "Private IP of the backend EC2 instance"
  value       = aws_instance.backend.private_ip
}

output "backend_instance_id" {
  description = "Instance ID of the backend EC2"
  value       = aws_instance.backend.id
}

# ─── RDS ─────────────────────────────────────────────────────────────────────
output "rds_endpoint" {
  description = "RDS MySQL endpoint (host:port)"
  value       = aws_db_instance.mysql.endpoint
}

output "rds_address" {
  description = "RDS MySQL hostname"
  value       = aws_db_instance.mysql.address
}

# ─── Networking ──────────────────────────────────────────────────────────────
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "nat_gateway_public_ip" {
  description = "NAT Gateway Elastic IP"
  value       = aws_eip.nat.public_ip
}

# ─── SSH ─────────────────────────────────────────────────────────────────────
output "ssh_key_file" {
  description = "Path to the SSH private key file"
  value       = local_file.ssh_private_key.filename
}

output "ssh_frontend_command" {
  description = "SSH command to connect to the frontend instance"
  value       = "ssh -i ${local_file.ssh_private_key.filename} ec2-user@${aws_instance.frontend.public_ip}"
}

output "ssh_backend_via_frontend" {
  description = "SSH to backend via frontend as bastion"
  value       = "ssh -i ${local_file.ssh_private_key.filename} -J ec2-user@${aws_instance.frontend.public_ip} ec2-user@${aws_instance.backend.private_ip}"
}
