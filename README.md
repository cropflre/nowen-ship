# nowen-ship

Nowen 全系列统一发版、构建和部署控制台。

> 当前处于 `SHIP-BASE-01` 工程基线阶段。现有 MVP 已恢复；后续将逐步接入发布契约、GitHub App、可靠执行引擎、Release Train、审批和回滚。

## 当前能力

- 项目与 GitHub 仓库配置管理
- 发版计划、语义化版本计算和 Tag 创建
- GitHub Release Draft 创建与发布
- GitHub Actions Workflow 触发、运行状态和产物同步
- 部署目标、部署记录和基础审计
- PostgreSQL 持久化
- 前后端 Docker 镜像与完整 Compose 栈
- 存活检查和数据库就绪检查

## 技术栈

- 后端：Fastify、TypeScript、Prisma、PostgreSQL、Octokit
- 前端：React、TypeScript、Vite、Tailwind CSS、TanStack Query
- 工程：pnpm workspace、Docker Compose、GitHub Actions

## 环境要求

- Node.js 20 或更高版本
- pnpm 9.15.9（通过 Corepack 管理）
- Docker 与 Docker Compose

## 本地开发

```bash
# 1. 启用仓库指定的 pnpm 版本
corepack enable
corepack prepare pnpm@9.15.9 --activate

# 2. 安装锁定依赖
pnpm install --frozen-lockfile

# 3. 创建本地环境配置
cp apps/server/.env.example apps/server/.env
# 编辑 apps/server/.env，填写 GitHub Token 与临时 API Token

# 4. 启动 PostgreSQL
pnpm db:up

# 5. 生成 Prisma Client 并执行数据库迁移
pnpm db:generate
pnpm db:migrate:deploy

# 6. 同时启动前后端开发服务
pnpm dev
```

默认访问地址：

- Web 控制台：http://localhost:5173
- API：http://localhost:3001/api
- 存活检查：http://localhost:3001/api/health/live
- 就绪检查：http://localhost:3001/api/health/ready

`/api/health/live` 只验证进程存活；`/api/health/ready` 会实际查询 PostgreSQL，数据库不可访问时返回 HTTP 503。

## Docker Compose

完整栈包含 PostgreSQL、API Server 和 Nginx Web 服务：

```bash
# 首次启动或代码更新后重新构建
GITHUB_TOKEN=你的令牌 API_TOKEN=你的管理令牌 pnpm docker:up

# 查看日志
pnpm docker:logs

# 停止服务
pnpm docker:down
```

Compose 会等待 PostgreSQL 健康后启动 Server；Server 启动时自动执行 `prisma migrate deploy`；Web 会等待 Server 就绪后启动。

## 数据库命令

```bash
pnpm db:generate          # 生成 Prisma Client
pnpm db:migrate           # 本地创建开发迁移
pnpm db:migrate:deploy    # 应用已提交迁移
pnpm db:studio            # 打开 Prisma Studio
```

迁移文件必须提交到 `apps/server/prisma/migrations/`。正式环境不得以 `prisma db push` 代替迁移部署。

## 工程质量命令

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check
```

GitHub Actions 会在 `main` 和 Pull Request 上执行：

1. 锁定依赖安装
2. Prisma Client 生成和迁移验证
3. TypeScript 类型检查
4. ESLint
5. 单元测试与 API 冒烟测试
6. 前后端构建
7. Server 与 Web Docker 镜像构建

## 项目结构

```text
apps/
  server/                 Fastify API 与 Prisma
    prisma/migrations/    PostgreSQL 迁移
  web/                    React/Vite 控制台
.github/workflows/ci.yml  工程 CI
docker-compose.yml        本地完整栈
pnpm-workspace.yaml       workspace 定义
```

## 当前安全边界

当前 MVP 仍使用 Fine-grained PAT 和临时 `API_TOKEN`。不要把真实 Token 提交到仓库，也不要在日志、Issue 或截图中暴露 Token。

正式鉴权将在 `SHIP-GITHUB-01` 中升级为：

- GitHub OAuth 标识操作者
- GitHub App Installation Token 访问仓库
- 安全 Cookie、权限校验、Webhook 签名和审计

## 任务追踪

- 总控 Epic：#10
- 当前工程基线：#1
- 下一阶段领域模型：#2
