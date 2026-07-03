# nowen-ship

Nowen 系列统一发版、构建、**部署**控制台。

## 功能

- **项目管理**：维护 GitHub 仓库、默认分支、构建 workflow 等配置
- **发版计划**：版本号计算、Git tag、GitHub Release draft 创建与发布
- **构建任务**：通过 GitHub Actions `workflow_dispatch` 触发构建，并同步运行状态与产物
- **部署目标**：配置各项目的部署环境与目标（dev / staging / prod，类型 server / docker / k8s …）
- **部署记录**：触发部署、同步 GitHub Run 状态、查看运行日志与审计

## 技术栈

- 后端：Fastify + Prisma + PostgreSQL + Octokit（GitHub API）
- 前端：React + TypeScript + Vite + Tailwind + TanStack Query

## 本地开发

```bash
pnpm install

# 1. 配置环境变量（复制示例）
cp apps/server/.env.example apps/server/.env

# 2. 启动 PostgreSQL（docker compose）
pnpm db:up

# 3. 生成 Prisma 客户端并同步库表
pnpm --filter nowen-release-hub-server run prisma:generate
pnpm --filter nowen-release-hub-server run prisma:push

# 4. 启动前后端
pnpm dev
```

## 说明

- 认证当前为占位（`triggeredBy: "admin"`），后续阶段接入。
- 部署与构建均复用项目的 `workflowFile`，通过 `workflow_dispatch` 触发，区别在于传入的 inputs（部署会带上 `environment` / `target` / `version`）。
