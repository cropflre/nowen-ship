# Nowen Repository Release Contract

每个接入 nowen-ship 的仓库应在默认分支提交 `.nowen/release.yml`。仓库配置是发布规则的事实来源；nowen-ship 负责读取、校验、缓存并同步为 Release Channel。

## Schema 版本

当前版本：`schemaVersion: 1`。

- 缺少 `schemaVersion` 时，解析器暂按 v1 兼容读取并返回警告。
- 低于当前版本且没有迁移器时会明确拒绝。
- 高于当前版本时会拒绝，避免旧控制台误解新字段。
- 后续 Schema 升级必须新增显式迁移器，不能静默改变旧字段语义。

## 最小配置

```yaml
schemaVersion: 1
project:
  key: nowen-note
version:
  source:
    type: json
    file: package.json
    path: version
  prefix: v
  tagTemplate: "v{{version}}"
channels:
  desktop:
    kind: desktop
    trigger:
      type: tag_push
      workflow: .github/workflows/release.yml
```

## Project

```yaml
project:
  key: nowen-note       # 必填，小写 kebab-case
  name: Nowen Note      # 可选，展示名称
  type: electron        # 可选，技术栈或项目类型
```

## Version

支持以下版本来源：

- `json`：例如 `package.json`、`tauri.conf.json`，必须提供 `file` 和 `path`
- `toml`：例如 `Cargo.toml`，必须提供 `file`
- `text`：文本或源码中的版本，必须提供 `file`，可配 `pattern`
- `github_release`：以最新 GitHub Release 为版本来源
- `custom`：由受控 adapter 读取，必须提供 `adapter`

`tagTemplate` 必须包含 `{{version}}`。例如：

```yaml
version:
  source:
    type: json
    file: package.json
    path: version
  prefix: v
  tagTemplate: "v{{version}}"
```

## Release Channels

`channels` 是以通道 key 为键的对象。新增通道不需要修改 nowen-ship 代码；同步后会自动新增或更新数据库中的 ReleaseChannel。仓库配置中被删除的通道不会直接删除历史数据，而是被标记为停用。

支持的通道类型：

- `desktop`
- `android`
- `ios`
- `docker`
- `server`
- `web`
- `mirror`
- `testflight`
- `other`

### Trigger

支持四种触发方式：

```yaml
trigger:
  type: tag_push
  workflow: .github/workflows/release.yml
```

- `tag_push`：创建 Tag 后观察对应 Workflow，不再额外 dispatch
- `workflow_dispatch`：由控制台传入受 Schema 约束的 inputs
- `release_event`：GitHub Release 事件后的镜像或通知任务
- `script_runner`：只允许引用预先注册的受控 runner 和 entrypoint，禁止在契约中保存任意 Shell 命令

非 `script_runner` 的 Workflow 必须位于 `.github/workflows/`，后缀必须为 `.yml` 或 `.yaml`，并禁止 `..` 目录跳转。

`script_runner` 示例：

```yaml
trigger:
  type: script_runner
  runner: trusted-release-runner
  entrypoint: nowen-blog/release-docker
```

## Dynamic Inputs

Inputs 会被转换为控制台动态表单：

```yaml
inputs:
  environment:
    type: choice
    label: Environment
    description: Select deployment environment
    options:
      - staging
      - production
    default: staging
    required: true
  publish:
    type: boolean
    default: false
```

支持：`string`、`boolean`、`choice`、`number`。

校验规则：

- `choice` 必须提供至少一个 option
- `choice` 默认值必须存在于 options
- 其他类型不得声明 options
- 默认值类型必须与 input type 一致
- `secret: true` 仅表示字段敏感；正式 Secret 仍应存放在 GitHub Secrets 或外部 Secret Manager

## Dependencies and Ordering

```yaml
dependsOn:
  - desktop
order: 20
optional: true
```

- 依赖的通道必须存在
- 通道不能依赖自身
- 循环依赖会被拒绝
- `order` 用于稳定展示顺序
- `optional` 表示该通道失败可由后续发布策略决定是否阻断整体 Release

## Artifacts

```yaml
artifacts:
  - name: Windows Installer
    pattern: "*.exe"
    platform: windows
    architecture: x64
    kind: installer
    required: true
    retentionDays: 14
```

每条规则可声明文件匹配、平台、架构、类型、是否必需以及预期保留天数。实际产物验证和 SHA-256 计算由后续 Release Engine 任务执行。

## Publish and Production Policy

```yaml
publish:
  mode: draft
  prerelease: false
  approval: true
  requiredArtifacts: true
production:
  environment: production
  requiresApproval: true
```

`publish.mode`：

- `automatic`
- `manual`
- `draft`

生产审批要求会同步到 ReleaseChannel 的 `requiresApproval`。

## Cache and Drift Detection

同步时保存：

- Schema version
- 仓库路径和 ref
- Commit SHA 与 Blob SHA
- 原始 YAML
- 解析后的 JSON
- SHA-256 content hash
- 校验错误和兼容警告
- 最近同步时间

`checkRemote=true` 时会重新读取仓库文件，只比较内容 Hash 和来源 SHA，不自动覆盖缓存。用户确认同步后才会更新 Release Channel。

非法配置也会写入缓存并标记为 `invalid`，但不会覆盖最后一次有效的通道配置。

## API

```text
GET  /api/contracts/schema
POST /api/contracts/validate
POST /api/contracts/projects/:id/sync
GET  /api/contracts/projects/:id?checkRemote=true
GET  /api/contracts/projects/:id/channels/:channelKey/form
```

校验请求：

```json
{
  "content": "schemaVersion: 1\n..."
}
```

同步请求可选指定 ref 和 path：

```json
{
  "ref": "main",
  "path": ".nowen/release.yml"
}
```

## Examples

仓库内提供三套通过自动化校验的示例：

- `examples/contracts/nowen-note.release.yml`
- `examples/contracts/nowen-reader.release.yml`
- `examples/contracts/nowen-video.release.yml`
