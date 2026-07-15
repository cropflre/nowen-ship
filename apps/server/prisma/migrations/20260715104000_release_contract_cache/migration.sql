CREATE TABLE "release_contract_caches" (
  "project_id" TEXT NOT NULL,
  "schema_version" INTEGER NOT NULL,
  "source_path" TEXT NOT NULL DEFAULT '.nowen/release.yml',
  "source_ref" TEXT NOT NULL,
  "source_commit_sha" TEXT,
  "source_blob_sha" TEXT,
  "content_hash" TEXT NOT NULL,
  "raw_content" TEXT NOT NULL,
  "parsed_config" JSONB,
  "validation_errors" JSONB,
  "warnings" JSONB,
  "status" TEXT NOT NULL,
  "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "release_contract_caches_pkey" PRIMARY KEY ("project_id")
);

CREATE INDEX "release_contract_caches_status_synced_at_idx"
  ON "release_contract_caches"("status", "synced_at");

CREATE INDEX "release_contract_caches_content_hash_idx"
  ON "release_contract_caches"("content_hash");

ALTER TABLE "release_contract_caches"
  ADD CONSTRAINT "release_contract_caches_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
