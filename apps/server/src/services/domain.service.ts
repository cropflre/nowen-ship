import type { PrismaClient } from "@prisma/client";

export class DomainService {
  constructor(private readonly prisma: PrismaClient) {}

  async getReleaseTrainGraph(id: string) {
    const train = await this.prisma.releaseTrain.findUnique({
      where: { id },
      include: {
        releases: {
          orderBy: { createdAt: "asc" },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                repoFullName: true,
                defaultBranch: true,
              },
            },
            approvals: {
              orderBy: { requestedAt: "desc" },
            },
            executions: {
              orderBy: [{ channel: { sortOrder: "asc" } }, { attempt: "asc" }],
              include: {
                channel: true,
                jobs: {
                  orderBy: { createdAt: "asc" },
                },
                artifacts: {
                  orderBy: { createdAt: "asc" },
                },
                deployments: {
                  orderBy: { createdAt: "desc" },
                  include: {
                    environment: true,
                    approvals: {
                      orderBy: { requestedAt: "desc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!train) {
      throw new Error("Release Train 不存在");
    }

    return train;
  }

  async getProjectReleaseGraph(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        releaseChannels: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        environments: {
          orderBy: [{ isProduction: "asc" }, { createdAt: "asc" }],
        },
        releases: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            releaseTrain: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            approvals: {
              orderBy: { requestedAt: "desc" },
            },
            executions: {
              orderBy: [{ channel: { sortOrder: "asc" } }, { attempt: "desc" }],
              include: {
                channel: true,
                jobs: {
                  orderBy: { createdAt: "asc" },
                },
                artifacts: {
                  orderBy: { createdAt: "asc" },
                },
                deployments: {
                  orderBy: { createdAt: "desc" },
                  include: {
                    environment: true,
                    approvals: {
                      orderBy: { requestedAt: "desc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new Error("项目不存在");
    }

    return project;
  }
}
