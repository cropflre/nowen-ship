import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import {
  ApprovalStatus,
  ApprovalType,
  ChannelKind,
  EnvironmentKind,
  ExecutionStatus,
  PrismaClient,
  ReleaseStatus,
  ReleaseTrainStatus,
  TriggerType,
} from "@prisma/client";

const prisma = new PrismaClient();

test("release domain supports project-scoped tags and multi-channel executions", async () => {
  const suffix = randomUUID();
  const actor = `domain-test-${suffix}`;
  const deliveryId = `delivery-${suffix}`;
  let trainId: string | undefined;

  try {
    const train = await prisma.releaseTrain.create({
      data: {
        name: `Nowen test train ${suffix}`,
        status: ReleaseTrainStatus.DRAFT,
        createdBy: actor,
      },
    });
    trainId = train.id;

    const [projectA, projectB] = await Promise.all([
      prisma.project.create({
        data: {
          name: "Domain Test Alpha",
          repoFullName: `domain-test-${suffix}/alpha`,
          projectType: "desktop",
          workflowFile: "release.yml",
        },
      }),
      prisma.project.create({
        data: {
          name: "Domain Test Beta",
          repoFullName: `domain-test-${suffix}/beta`,
          projectType: "backend",
          workflowFile: "docker.yml",
        },
      }),
    ]);

    const [releaseA, releaseB] = await Promise.all([
      prisma.release.create({
        data: {
          projectId: projectA.id,
          releaseTrainId: train.id,
          version: "1.0.0",
          tagName: "v1.0.0",
          sourceBranch: "main",
          releaseType: "major",
          status: ReleaseStatus.DRAFT,
          createdBy: actor,
        },
      }),
      prisma.release.create({
        data: {
          projectId: projectB.id,
          releaseTrainId: train.id,
          version: "1.0.0",
          tagName: "v1.0.0",
          sourceBranch: "main",
          releaseType: "major",
          status: ReleaseStatus.DRAFT,
          createdBy: actor,
        },
      }),
    ]);

    assert.equal(releaseA.tagName, releaseB.tagName);
    assert.notEqual(releaseA.projectId, releaseB.projectId);

    const [desktopChannel, dockerChannel] = await Promise.all([
      prisma.releaseChannel.create({
        data: {
          projectId: projectA.id,
          key: "desktop",
          name: "Desktop",
          kind: ChannelKind.DESKTOP,
          triggerType: TriggerType.TAG_PUSH,
          workflowFile: ".github/workflows/release.yml",
          tagTemplate: "v{{version}}",
        },
      }),
      prisma.releaseChannel.create({
        data: {
          projectId: projectA.id,
          key: "docker",
          name: "Docker",
          kind: ChannelKind.DOCKER,
          triggerType: TriggerType.WORKFLOW_DISPATCH,
          workflowFile: ".github/workflows/docker.yml",
        },
      }),
    ]);

    const [desktopExecution, dockerExecution] = await Promise.all([
      prisma.execution.create({
        data: {
          projectId: projectA.id,
          releaseId: releaseA.id,
          channelId: desktopChannel.id,
          idempotencyKey: `${suffix}:desktop:1`,
          status: ExecutionStatus.RUNNING,
          attempt: 1,
        },
      }),
      prisma.execution.create({
        data: {
          projectId: projectA.id,
          releaseId: releaseA.id,
          channelId: dockerChannel.id,
          idempotencyKey: `${suffix}:docker:1`,
          status: ExecutionStatus.PENDING,
          attempt: 1,
        },
      }),
    ]);

    await prisma.executionJob.create({
      data: {
        executionId: desktopExecution.id,
        name: "build-windows",
        matrixKey: "windows-x64",
        status: "RUNNING",
      },
    });

    await prisma.artifact.create({
      data: {
        executionId: desktopExecution.id,
        name: "nowen-setup",
        fileName: "Nowen-Setup.exe",
        platform: "windows",
        architecture: "x64",
        sha256: "a".repeat(64),
      },
    });

    const environment = await prisma.environment.create({
      data: {
        projectId: projectA.id,
        key: "production",
        name: "Production",
        kind: EnvironmentKind.PRODUCTION,
        isProduction: true,
      },
    });

    const deployTarget = await prisma.deployTarget.create({
      data: {
        projectId: projectA.id,
        name: "Production Docker",
        environment: "production",
        type: "docker",
      },
    });

    const deployment = await prisma.deployment.create({
      data: {
        projectId: projectA.id,
        releaseId: releaseA.id,
        executionId: dockerExecution.id,
        environmentId: environment.id,
        deployTargetId: deployTarget.id,
        version: releaseA.version,
        status: "pending_approval",
        immutableRef: "ghcr.io/cropflre/nowen@sha256:test",
        imageDigest: "sha256:test",
        triggeredBy: actor,
      },
    });

    await prisma.approval.create({
      data: {
        type: ApprovalType.DEPLOYMENT,
        status: ApprovalStatus.PENDING,
        releaseId: releaseA.id,
        deploymentId: deployment.id,
        environmentId: environment.id,
        requestedBy: actor,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actor,
        action: "domain.test",
        targetType: "release",
        targetId: releaseA.id,
        projectId: projectA.id,
        releaseId: releaseA.id,
        result: "success",
      },
    });

    await prisma.webhookDelivery.create({
      data: {
        deliveryId,
        eventName: "workflow_run",
        signatureValid: true,
        payload: { action: "completed" },
      },
    });

    const graph = await prisma.releaseTrain.findUniqueOrThrow({
      where: { id: train.id },
      include: {
        releases: {
          include: {
            project: true,
            executions: {
              include: {
                channel: true,
                jobs: true,
                artifacts: true,
                deployments: {
                  include: {
                    environment: true,
                    approvals: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    assert.equal(graph.releases.length, 2);
    const alphaRelease = graph.releases.find((release) => release.projectId === projectA.id);
    assert.ok(alphaRelease);
    assert.equal(alphaRelease.executions.length, 2);
    assert.deepEqual(
      alphaRelease.executions.map((execution) => execution.channel.key).sort(),
      ["desktop", "docker"]
    );
    assert.equal(
      alphaRelease.executions.flatMap((execution) => execution.artifacts).length,
      1
    );
    assert.equal(
      alphaRelease.executions.flatMap((execution) => execution.deployments).length,
      1
    );
  } finally {
    await prisma.auditEvent.deleteMany({ where: { actor } });
    await prisma.webhookDelivery.deleteMany({ where: { deliveryId } });
    await prisma.project.deleteMany({
      where: { repoFullName: { startsWith: `domain-test-${suffix}/` } },
    });
    if (trainId) {
      await prisma.releaseTrain.deleteMany({ where: { id: trainId } });
    }
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
