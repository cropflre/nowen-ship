-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "project_type" TEXT NOT NULL,
    "workflow_file" TEXT NOT NULL,
    "build_inputs_schema" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_plans" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "tag_name" TEXT NOT NULL,
    "source_branch" TEXT NOT NULL,
    "source_commit_sha" TEXT,
    "changelog" TEXT NOT NULL DEFAULT '',
    "release_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_jobs" (
    "id" TEXT NOT NULL,
    "release_plan_id" TEXT,
    "project_id" TEXT NOT NULL,
    "github_run_id" BIGINT NOT NULL,
    "github_run_url" TEXT NOT NULL,
    "workflow_file" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "conclusion" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_artifacts" (
    "id" TEXT NOT NULL,
    "release_job_id" TEXT NOT NULL,
    "github_artifact_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "file_name" TEXT,
    "size_bytes" BIGINT,
    "platform" TEXT,
    "download_url" TEXT,
    "expires_at" TIMESTAMP(3),
    "sha256" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "release_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_releases" (
    "id" TEXT NOT NULL,
    "release_plan_id" TEXT,
    "project_id" TEXT NOT NULL,
    "github_release_id" INTEGER NOT NULL,
    "tag_name" TEXT NOT NULL,
    "name" TEXT,
    "body" TEXT,
    "draft" BOOLEAN NOT NULL DEFAULT true,
    "prerelease" BOOLEAN NOT NULL DEFAULT false,
    "html_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "github_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deploy_targets" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deploy_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "release_plan_id" TEXT,
    "deploy_target_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "commit_sha" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "github_run_id" BIGINT,
    "github_run_url" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "triggered_by" TEXT NOT NULL,
    "logs" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "detail" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_repo_full_name_key" ON "projects"("repo_full_name");

-- CreateIndex
CREATE UNIQUE INDEX "release_plans_tag_name_key" ON "release_plans"("tag_name");

-- CreateIndex
CREATE UNIQUE INDEX "release_jobs_release_plan_id_key" ON "release_jobs"("release_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "release_jobs_github_run_id_key" ON "release_jobs"("github_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "release_artifacts_github_artifact_id_key" ON "release_artifacts"("github_artifact_id");

-- CreateIndex
CREATE UNIQUE INDEX "github_releases_release_plan_id_key" ON "github_releases"("release_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "github_releases_github_release_id_key" ON "github_releases"("github_release_id");

-- CreateIndex
CREATE UNIQUE INDEX "github_releases_html_url_key" ON "github_releases"("html_url");

-- CreateIndex
CREATE UNIQUE INDEX "deployments_github_run_id_key" ON "deployments"("github_run_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_created_at_idx" ON "audit_logs"("actor", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "release_plans" ADD CONSTRAINT "release_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_jobs" ADD CONSTRAINT "release_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_jobs" ADD CONSTRAINT "release_jobs_release_plan_id_fkey" FOREIGN KEY ("release_plan_id") REFERENCES "release_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_artifacts" ADD CONSTRAINT "release_artifacts_release_job_id_fkey" FOREIGN KEY ("release_job_id") REFERENCES "release_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_releases" ADD CONSTRAINT "github_releases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_releases" ADD CONSTRAINT "github_releases_release_plan_id_fkey" FOREIGN KEY ("release_plan_id") REFERENCES "release_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deploy_targets" ADD CONSTRAINT "deploy_targets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_release_plan_id_fkey" FOREIGN KEY ("release_plan_id") REFERENCES "release_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_deploy_target_id_fkey" FOREIGN KEY ("deploy_target_id") REFERENCES "deploy_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
