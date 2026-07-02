import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../schemas/project.schema.js";

type CreateProjectInput = z.infer<typeof createProjectSchema>;
type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        releasePlans: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        releaseJobs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
  }

  async findByRepoFullName(repoFullName: string) {
    return this.prisma.project.findUnique({
      where: { repoFullName },
    });
  }

  async create(input: CreateProjectInput) {
    const existing = await this.findByRepoFullName(input.repoFullName);
    if (existing) {
      throw new Error(`项目 ${input.repoFullName} 已存在`);
    }

    return this.prisma.project.create({
      data: input,
    });
  }

  async update(id: string, input: UpdateProjectInput) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("项目不存在");
    }

    // 如果更新 repoFullName，检查是否冲突
    if (input.repoFullName && input.repoFullName !== existing.repoFullName) {
      const conflict = await this.findByRepoFullName(input.repoFullName);
      if (conflict) {
        throw new Error(`项目 ${input.repoFullName} 已存在`);
      }
    }

    return this.prisma.project.update({
      where: { id },
      data: input,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("项目不存在");
    }

    // 检查是否有关联数据
    const plansCount = await this.prisma.releasePlan.count({
      where: { projectId: id },
    });
    if (plansCount > 0) {
      throw new Error("该项目已有发版计划，无法删除。请先删除关联的发版计划。");
    }

    return this.prisma.project.delete({
      where: { id },
    });
  }
}
