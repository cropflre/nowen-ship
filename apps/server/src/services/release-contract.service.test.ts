import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import type {
  RepositoryFileInput,
  RepositoryFileReader,
  RepositoryFileResult,
} from "./github-repository.service.js";
import { ReleaseContractService } from "./release-contract.service.js";

class FakeRepositoryReader implements RepositoryFileReader {
  content = "";
  commitSha = "commit-1";
  blobSha = "blob-1";

  async getFile(input: RepositoryFileInput): Promise<RepositoryFileResult> {
    return {
      content: this.content,
      path: input.path,
      ref: input.ref,
      commitSha: this.commitSha,
      blobSha: this.blobSha,
    };
  }
}

const prisma = new PrismaClient();

test("repository contract sync updates channels and detects drift", async () => {
  const suffix = randomUUID();
  const repoFullName = `contract-test-${suffix}/nowen-note`;
  const reader = new FakeRepositoryReader();
  reader.content = await readFile(
    new URL("../../../../examples/contracts/nowen-note.release.yml", import.meta.url),
    "utf8"
  );

  const project = await prisma.project.create({
    data: {
      name: "Contract Test Project",
      repoFullName,
      defaultBranch: "main",
      projectType: "desktop",
      workflowFile: ".github/workflows/release.yml",
    },
  });

  const service = new ReleaseContractService(prisma, reader);

  try {
    const synced = await service.syncProjectContract(project.id);
    assert.equal(synced.valid, true);
    assert.equal(synced.source.commitSha, "commit-1");

    const cache = await service.getCachedContract(project.id);
    assert.ok(cache);
    assert.equal(cache.status, "valid");
    assert.equal(cache.sourceCommitSha, "commit-1");
    assert.equal(cache.contentHash, synced.contentHash);

    const channels = await prisma.releaseChannel.findMany({
      where: { projectId: project.id },
      orderBy: { sortOrder: "asc" },
    });
    assert.deepEqual(
      channels.map((channel) => channel.key),
      ["desktop", "ios"]
    );
    assert.equal(channels[1]?.requiresApproval, true);

    const form = await service.getInputForm(project.id, "ios");
    assert.equal(form.fields.length, 1);
    assert.equal(form.fields[0]?.key, "upload");
    assert.equal(form.fields[0]?.type, "boolean");

    const currentStatus = await service.getContractStatus(project.id, true);
    assert.equal(currentStatus.drift, false);

    reader.content = `${reader.content}\n# repository changed\n`;
    reader.commitSha = "commit-2";
    reader.blobSha = "blob-2";
    const driftedStatus = await service.getContractStatus(project.id, true);
    assert.equal(driftedStatus.drift, true);
    assert.equal(driftedStatus.remote?.commitSha, "commit-2");

    const resynced = await service.syncProjectContract(project.id);
    assert.equal(resynced.valid, true);
    const synchronizedStatus = await service.getContractStatus(project.id, true);
    assert.equal(synchronizedStatus.drift, false);

    reader.content = `
schemaVersion: 1
project:
  key: invalid-contract
version:
  source:
    type: github_release
  tagTemplate: invalid
channels:
  desktop:
    kind: desktop
    trigger:
      type: workflow_dispatch
      workflow: release.yml
`;
    reader.commitSha = "commit-invalid";
    const invalid = await service.syncProjectContract(project.id);
    assert.equal(invalid.valid, false);

    const invalidCache = await service.getCachedContract(project.id);
    assert.equal(invalidCache?.status, "invalid");
    assert.ok(Array.isArray(invalidCache?.validationErrors));

    const preservedChannels = await prisma.releaseChannel.count({
      where: { projectId: project.id, isActive: true },
    });
    assert.equal(preservedChannels, 2);
  } finally {
    await prisma.project.delete({ where: { id: project.id } });
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
