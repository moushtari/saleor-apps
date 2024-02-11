terraform {
  required_version = ">= 0.14"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 3.8"
    }
  }
}

provider "google" {
  project = "moushtari"
  region  = "europe-west3"
  zone    = "europe-west3-b"
}

# Enables the Cloud Run API
resource "google_project_service" "api" {
  service = "run.googleapis.com"

  disable_on_destroy = false
}

resource "google_cloud_run_v2_service" "saleor_app_slack" {
  name     = "saleor-app-slack"
  location = "europe-west3"

  template {
    containers {
      image = "europe-west3-docker.pkg.dev/moushtari/moushtari-repo/saleor-app-slack:1.7.0"

      env {
        name  = "NEXT_PUBLIC_SALEOR_HOST_URL"
        value = "https://api.moushtari.com:19421"
      }
      env {
        name  = "APL"
        value = "upstash"
      }
      env {
        name  = "UPSTASH_URL"
        value = data.google_secret_manager_secret_version.upstash_url.secret_data
      }
      env {
        name  = "UPSTASH_TOKEN"
        value = data.google_secret_manager_secret_version.upstash_token.secret_data
      }
      env {
        name  = "SECRET_KEY"
        value = data.google_secret_manager_secret_version.secret_key.secret_data
      }
    }
    scaling {
      max_instance_count = 1
    }
  }

  # Waits for the Cloud Run API to be enabled
  depends_on = [google_project_service.api]
}

data "google_secret_manager_secret_version" "upstash_url" {
  secret  = "saleor-app-slack-upstash-url"
  version = 1
}

data "google_secret_manager_secret_version" "upstash_token" {
  secret  = "saleor-app-slack-upstash-token"
  version = 1
}

data "google_secret_manager_secret_version" "secret_key" {
  secret  = "saleor-app-slack-secret-key"
  version = 1
}

# Allow unauthenticated users to invoke the service
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = google_cloud_run_v2_service.saleor_app_slack.project
  location = google_cloud_run_v2_service.saleor_app_slack.location
  name     = google_cloud_run_v2_service.saleor_app_slack.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Display the service URL
output "url" {
  value = google_cloud_run_v2_service.saleor_app_slack.uri
}
