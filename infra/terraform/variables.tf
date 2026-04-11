variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "rais-api"
}

variable "environment" {
  description = "Environment name (dev, stage, prod)"
  type        = string
  default     = "dev"
}

variable "db_name" {
  description = "MySQL database name"
  type        = string
  default     = "rais"
}

variable "db_username" {
  description = "MySQL admin username"
  type        = string
  default     = "raisadmin"
}

variable "db_password" {
  description = "MySQL admin password"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 8
    error_message = "db_password must contain at least 8 characters."
  }
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Initial RDS storage in GiB"
  type        = number
  default     = 30
}

variable "db_max_allocated_storage" {
  description = "Max autoscaling RDS storage in GiB"
  type        = number
  default     = 100
}

variable "db_allowed_cidrs" {
  description = "CIDR blocks allowed to connect to public RDS (temporary for import/testing)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "base_url" {
  description = "Public BASE_URL used by OAI Identify response"
  type        = string
  default     = "https://example.com/oai"

  validation {
    condition     = can(regex("^https://", var.base_url))
    error_message = "base_url must start with https://"
  }
}

variable "admin_email" {
  description = "Repository admin email"
  type        = string
  default     = "rais@unmsm.edu.pe"
}

variable "page_size" {
  description = "Default OAI page size"
  type        = number
  default     = 100
}

variable "app_runner_cpu" {
  description = "App Runner CPU setting"
  type        = string
  default     = "1 vCPU"
}

variable "app_runner_memory" {
  description = "App Runner memory setting"
  type        = string
  default     = "2 GB"
}

variable "create_apprunner_service" {
  description = "Create App Runner service (set true after first image exists in ECR)"
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "GitHub repository in org/repo format for OIDC trust"
  type        = string
  default     = "pieersx/api-rais"
}

variable "create_github_oidc_provider" {
  description = "Create GitHub OIDC provider in IAM"
  type        = bool
  default     = false
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN (required when create_github_oidc_provider = false)"
  type        = string
  default     = ""

  validation {
    condition     = var.create_github_oidc_provider || length(var.github_oidc_provider_arn) > 0
    error_message = "Set github_oidc_provider_arn or enable create_github_oidc_provider."
  }
}
