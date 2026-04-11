output "ecr_repository_name" {
  description = "ECR repository name"
  value       = aws_ecr_repository.api.name
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.api.repository_url
}

output "apprunner_service_arn" {
  description = "App Runner service ARN"
  value       = var.create_apprunner_service ? aws_apprunner_service.api[0].arn : null
}

output "apprunner_service_url" {
  description = "App Runner public URL"
  value       = var.create_apprunner_service ? aws_apprunner_service.api[0].service_url : null
}

output "suggested_base_url" {
  description = "Suggested BASE_URL once App Runner is created"
  value       = var.create_apprunner_service ? "https://${aws_apprunner_service.api[0].service_url}/oai" : null
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS MySQL port"
  value       = aws_db_instance.main.port
}

output "rds_db_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions deployment"
  value       = aws_iam_role.github_actions_deploy.arn
}
