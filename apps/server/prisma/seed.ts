import {
  ChannelKind,
  EnvironmentKind,
  PrismaClient,
  TriggerType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.SEED_DEMO !== "true") {
    console.log("Skip demo seed. Set SEED_DEMO=true to create sample release configuration.");
    return;
  }

  const project = await prisma.project.upsert({
    where: { repoFullName: "cropflre/nowen-note" },
    update: {
      name: "Nowen Note",
      defaultBranch: "main",
      projectType: "desktop",
      workflowFile: ".github/workflows/release.yml",
      isActive: true,
    },
    create: {
      name: "Nowen Note",
      repoFullName: "cropflre/nowen-note",
      defaultBranch: "main",
      projectType: "desktop",
      workflowFile: ".github/workflows/release.yml",
    },
  });

  await Promise.all([
    prisma.releaseChannel.upsert({
      where: {
        projectId_key: {
          projectId: project.id,
          key: "desktop",
        },
      },
      update: {},
      create: {
        projectId: project.id,
        key: "desktop",
        name: "Desktop",
        kind: ChannelKind.DESKTOP,
        triggerType: TriggerType.TAG_PUSH,
        workflowFile: ".github/workflows/release.yml",
        tagTemplate: "v{{version}}",
        artifactRules: {
          patterns: ["*.exe", "*.dmg", "*.AppImage", "*.deb"],
        },
        sortOrder: 10,
      },
    }),
    prisma.releaseChannel.upsert({
      where: {
        projectId_key: {
          projectId: project.id,
          key: "ios",
        },
      },
      update: {},
      create: {
        projectId: project.id,
        key: "ios",
        name: "iOS / TestFlight",
        kind: ChannelKind.IOS,
        triggerType: TriggerType.WORKFLOW_DISPATCH,
        workflowFile: ".github/workflows/ios-release.yml",
        inputsSchema: {
          upload: {
            type: "boolean",
            default: false,
          },
        },
        sortOrder: 20,
      },
    }),
    prisma.environment.upsert({
      where: {
        projectId_key: {
          projectId: project.id,
          key: "staging",
        },
      },
      update: {},
      create: {
        projectId: project.id,
        key: "staging",
        name: "Staging",
        kind: EnvironmentKind.STAGING,
      },
    }),
    prisma.environment.upsert({
      where: {
        projectId_key: {
          projectId: project.id,
          key: "production",
        },
      },
      update: {},
      create: {
        projectId: project.id,
        key: "production",
        name: "Production",
        kind: EnvironmentKind.PRODUCTION,
        isProduction: true,
        protectionRules: {
          approvalsRequired: 1,
        },
      },
    }),
  ]);

  console.log(`Seeded release domain for ${project.repoFullName}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
