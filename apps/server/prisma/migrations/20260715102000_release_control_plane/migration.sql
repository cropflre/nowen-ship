-- Remove legacy global uniqueness that prevents multi-project releases.
DROP INDEX IF EXISTS "release_plans_tag_name_key";
DROP INDEX IF EXISTS "release_jobs_release_plan_id_key";
DROP INDEX IF EXISTS "release_jobs_github_run_id_key";
DROP INDEX IF EXISTS "deployments_github_run_id_key";

-- CreateEnum
CREATE TYPE "ChannelKind" AS ENUM ('DESKTOP', 'ANDROID', 'IOS', 'DOCKER', 'SERVER', 'WEB', 'MIRROR', 'TESTFLIGHT', 'OTHER');
CREATE TYPE "TriggerType" AS ENUM ('TAG_PUSH', 'WORKFLOW_DISPATCH', 'RELEASE_EVENT', 'SCRIPT_RUNNER');
CREATE TYPE "ReleaseTrainStatus" AS ENUM ('DRAFT', 'PREFLIGHT_CHECKING', 'READY', 'RUNNING', 'VERIFYING', 'PUBLISHABLE', 'PUBLISHED', 'FAILED', 'CANCELLED');
CREATE TYPE "ReleaseStatus" AS ENUM ('DRAFT', 'PREFLIGHT_CHECKING', 'READY', 'RUNNING', 'VERIFYING', 'PUBLISHABLE', 'PUBLISHED', 'FAILED', 'CANCELLED');
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'DISPATCHING', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT', 'SKIPPED');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT', 'SKIPPED');
CREATE TYPE "EnvironmentKind" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION', 'CUSTOM');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "ApprovalType" AS ENUM ('RELEASE', 'DEPLOYMENT', 'ROLLBACK');

-- Extend legacy deployment records so they can link to the new domain.
ALTER TABLE "deployments"
  ADD COLUMN "release_id" TEXT,
  ADD COLUMN "execution_id" TEXT,
  ADD COLUMN "environment_id" TEXT,
  ADD COLUMN "immutable_ref" TEXT,
  ADD COLUMN "image_digest" TEXT,
  ADD COLUMN "health_status" TEXT,
  ADD COLUMN "failure_reason" TEXT,
  ADD COLUMN "rollback_of_id" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "release_channels" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "ChannelKind" NOT NULL,
  "trigger_type" "TriggerType" NOT NULL,
  "workflow_file" TEXT,
  "tag_template" TEXT,
  "ref_strategy" TEXT,
  "inputs_schema" JSONB,
  "artifact_rules" JSONB,
  "dependencies" JSONB,
  "publish_policy" JSONB,
  "requires_approval" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "release_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_trains" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "ReleaseTrainStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by" TEXT NOT NULL,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "release_trains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "releases" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "release_train_id" TEXT,
  "version" TEXT NOT NULL,
  "tag_name" TEXT NOT NULL,
  "source_branch" TEXT NOT NULL,
  "source_commit_sha" TEXT,
  "changelog" TEXT NOT NULL DEFAULT '',
  "release_type" TEXT NOT NULL,
  "status" "ReleaseStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by" TEXT NOT NULL,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executions" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "release_id" TEXT NOT NULL,
  "channel_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
  "conclusion" TEXT,
  "github_run_id" BIGINT,
  "github_run_url" TEXT,
  "workflow_file" TEXT,
  "ref" TEXT,
  "head_sha" TEXT,
  "error_code" TEXT,
  "error_message" TEXT,
  "raw_payload" JSONB,
  "queued_at" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_jobs" (
  "id" TEXT NOT NULL,
  "execution_id" TEXT NOT NULL,
  "github_job_id" BIGINT,
  "name" TEXT NOT NULL,
  "matrix_key" TEXT,
  "runner_name" TEXT,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "conclusion" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "raw_payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "execution_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
  "id" TEXT NOT NULL,
  "execution_id" TEXT NOT NULL,
  "github_artifact_id" BIGINT,
  "name" TEXT NOT NULL,
  "file_name" TEXT,
  "kind" TEXT,
  "platform" TEXT,
  "architecture" TEXT,
  "size_bytes" BIGINT,
  "sha256" TEXT,
  "signature_status" TEXT,
  "notarization_status" TEXT,
  "download_url" TEXT,
  "expires_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environments" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "EnvironmentKind" NOT NULL,
  "protection_rules" JSONB,
  "health_check_config" JSONB,
  "is_production" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
  "id" TEXT NOT NULL,
  "type" "ApprovalType" NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "release_id" TEXT,
  "deployment_id" TEXT,
  "environment_id" TEXT,
  "requested_by" TEXT NOT NULL,
  "decided_by" TEXT,
  "reason" TEXT,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "metadata" JSONB,

  CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
  "id" TEXT NOT NULL,
  "delivery_id" TEXT NOT NULL,
  "event_name" TEXT NOT NULL,
  "action" TEXT,
  "installation_id" BIGINT,
  "repository_id" BIGINT,
  "signature_valid" BOOLEAN NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'received',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB NOT NULL,
  "error_message" TEXT,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),

  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "project_id" TEXT,
  "release_id" TEXT,
  "execution_id" TEXT,
  "deployment_id" TEXT,
  "result" TEXT NOT NULL,
  "detail" JSONB,
  "ip" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- Legacy indexes with corrected scope.
CREATE UNIQUE INDEX "release_plans_project_id_version_key" ON "release_plans"("project_id", "version");
CREATE UNIQUE INDEX "release_plans_project_id_tag_name_key" ON "release_plans"("project_id", "tag_name");
CREATE INDEX "release_plans_project_id_status_created_at_idx" ON "release_plans"("project_id", "status", "created_at");
CREATE UNIQUE INDEX "release_jobs_project_id_github_run_id_key" ON "release_jobs"("project_id", "github_run_id");
CREATE INDEX "release_jobs_release_plan_id_created_at_idx" ON "release_jobs"("release_plan_id", "created_at");
CREATE INDEX "release_jobs_project_id_status_created_at_idx" ON "release_jobs"("project_id", "status", "created_at");
CREATE UNIQUE INDEX "deployments_project_id_github_run_id_key" ON "deployments"("project_id", "github_run_id");

-- New domain indexes.
CREATE UNIQUE INDEX "release_channels_project_id_key_key" ON "release_channels"("project_id", "key");
CREATE INDEX "release_channels_project_id_is_active_sort_order_idx" ON "release_channels"("project_id", "is_active", "sort_order");
CREATE INDEX "release_trains_status_created_at_idx" ON "release_trains"("status", "created_at");
CREATE UNIQUE INDEX "releases_project_id_version_key" ON "releases"("project_id", "version");
CREATE UNIQUE INDEX "releases_project_id_tag_name_key" ON "releases"("project_id", "tag_name");
CREATE INDEX "releases_release_train_id_status_idx" ON "releases"("release_train_id", "status");
CREATE INDEX "releases_project_id_status_created_at_idx" ON "releases"("project_id", "status", "created_at");
CREATE UNIQUE INDEX "executions_release_id_channel_id_attempt_key" ON "executions"("release_id", "channel_id", "attempt");
CREATE UNIQUE INDEX "executions_project_id_github_run_id_key" ON "executions"("project_id", "github_run_id");
CREATE UNIQUE INDEX "executions_project_id_idempotency_key_key" ON "executions"("project_id", "idempotency_key");
CREATE INDEX "executions_release_id_status_created_at_idx" ON "executions"("release_id", "status", "created_at");
CREATE INDEX "executions_channel_id_status_created_at_idx" ON "executions"("channel_id", "status", "created_at");
CREATE UNIQUE INDEX "execution_jobs_execution_id_github_job_id_key" ON "execution_jobs"("execution_id", "github_job_id");
CREATE INDEX "execution_jobs_execution_id_status_idx" ON "execution_jobs"("execution_id", "status");
CREATE UNIQUE INDEX "artifacts_execution_id_github_artifact_id_key" ON "artifacts"("execution_id", "github_artifact_id");
CREATE INDEX "artifacts_execution_id_platform_architecture_idx" ON "artifacts"("execution_id", "platform", "architecture");
CREATE INDEX "artifacts_sha256_idx" ON "artifacts"("sha256");
CREATE UNIQUE INDEX "environments_project_id_key_key" ON "environments"("project_id", "key");
CREATE INDEX "environments_project_id_kind_is_active_idx" ON "environments"("project_id", "kind", "is_active");
CREATE INDEX "deployments_release_id_status_created_at_idx" ON "deployments"("release_id", "status", "created_at");
CREATE INDEX "deployments_environment_id_status_created_at_idx" ON "deployments"("environment_id", "status", "created_at");
CREATE INDEX "deployments_rollback_of_id_idx" ON "deployments"("rollback_of_id");
CREATE INDEX "approvals_status_requested_at_idx" ON "approvals"("status", "requested_at");
CREATE INDEX "approvals_release_id_type_status_idx" ON "approvals"("release_id", "type", "status");
CREATE INDEX "approvals_deployment_id_type_status_idx" ON "approvals"("deployment_id", "type", "status");
CREATE UNIQUE INDEX "webhook_deliveries_delivery_id_key" ON "webhook_deliveries"("delivery_id");
CREATE INDEX "webhook_deliveries_event_name_status_received_at_idx" ON "webhook_deliveries"("event_name", "status", "received_at");
CREATE INDEX "webhook_deliveries_repository_id_received_at_idx" ON "webhook_deliveries"("repository_id", "received_at");
CREATE INDEX "audit_events_actor_created_at_idx" ON "audit_events"("actor", "created_at");
CREATE INDEX "audit_events_target_type_target_id_created_at_idx" ON "audit_events"("target_type", "target_id", "created_at");
CREATE INDEX "audit_events_project_id_created_at_idx" ON "audit_events"("project_id", "created_at");

-- AddForeignKey
ALTER TABLE "release_channels" ADD CONSTRAINT "release_channels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "releases" ADD CONSTRAINT "releases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "releases" ADD CONSTRAINT "releases_release_train_id_fkey" FOREIGN KEY ("release_train_id") REFERENCES "release_trains"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "executions" ADD CONSTRAINT "executions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "executions" ADD CONSTRAINT "executions_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "executions" ADD CONSTRAINT "executions_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "release_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "execution_jobs" ADD CONSTRAINT "execution_jobs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "environments" ADD CONSTRAINT "environments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_rollback_of_id_fkey" FOREIGN KEY ("rollback_of_id") REFERENCES "deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
