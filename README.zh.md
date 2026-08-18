# dsh-forge — DeepSeek Harness 技能自锻造

[English](README.md) | [中文](README.zh.md)

> **让 harness 真正越用越聪明——不是记住对话，而是从重复的成功工作中 *锻造出技能*。**

`dsh-forge` 监听 DeepSeek Harness 的实时会话事件流，累积每个会话的轨迹（用户意图 + 工具调用序列 + 完成状态），当检测到**同一个任务类型已在 ≥2 个会话中成功完成**时，**把这套成功路径锻造成可复用技能**：

1. 将会话轨迹交给 harness 自己的 LLM，蒸馏出 kebab-case 技能名、一句话描述、适用时机和 markdown 步骤指令；
2. 将技能写入工作区技能根目录下的 `SKILL.md`（`.dsh-forge/skills/<name>/SKILL.md`，文件格式与官方 `@deepseek-ai/dsh-skill-filesystem` 一致，可直接被发现）；
3. 通过 `ctx.skills` 注册该技能，**所有未来的会话**都可通过 `skill` 工具加载它——你再也不用重新解释一遍工作流。

## 为什么这是插件，而不是提示词

独立 agent 只能*执行*任务——它看不到其他会话的完整事件流，不能写技能注册表，也不能注册一个所有未来会话都能看到的技能。这是**宿主级运行时进化**：只有 Cordis 插件能拥有 `session/event`、`ctx.skills` 和文件系统写入权，把"一个会话的成功"变成"所有会话的资产"。

## 功能

- 🎯 **自动模式识别** — 相同规范化意图在 ≥2 个已完成会话中出现时自动触发锻造。
- ⚒️ **手动锻造** — 内置 Web 锻造炉面板（`tool.view.cordis`，key `self`），提供"锻造当前会话"按钮和实时轨迹统计。
- 🤖 **模型可见锻造工具** — 注册的 `forge_skill` 模型工具让 agent 本人在任务中途也能直接触发锻造。
- 📦 **官方技能格式** — 写出带 YAML frontmatter（`name` / `description` / `whenToUse`）的 `SKILL.md`，与官方文件系统技能 provider 完全兼容。
- 🔗 **零外部依赖** — 全部使用 harness 自身的 `session/event`、`ctx.llm`、`ctx.fs`、`ctx.skills`；无需云账号、不依赖任何私有资产。

## 真实锻造产物

本插件已从本次会话自身的轨迹锻造出两个真实技能——都已写入 `.dsh-forge/skills/` 并注册进运行时技能目录，端到端全链路验证通过：

- [`forged-dsh-forge-plugin-implementation.SKILL.md`](examples/forged-dsh-forge-plugin-implementation.SKILL.md) — 从设计并构建 dsh-forge 本身的会话轨迹中蒸馏而来。
- [`forged-resume-powershell-workflow.SKILL.md`](examples/forged-resume-powershell-workflow.SKILL.md) — 从一次恢复中断本地工作流的会话轨迹中蒸馏而来。

## 快速开始

### 作为动态插件（当前会话）

在 DSH Web UI 中，用 `lib/index.js`（Host）+ `lib/client.js`（Client）定义并运行插件，然后在锻造炉面板点击 **⚒ 锻造当前会话**；或让两个相同意图的已完成会话自动触发首次锻造。

### 作为已安装包

```yaml
# cordis.patch.yml — 加入这一行
- id: dsh-forge
  name: dsh-forge
```

再通过 profile 安装：

```sh
dsh plugin --profile web add dsh-forge
```

重启 `dsh web` 后插件立即开始监听 `session/event`。安装会被自动验证：任何 `package.json` 中声明了 `dsh.bundle` 的依赖都会自动加入 profile 的 `dsh.profile.bundles` 层栈。

## 配置

| 配置项 | 默认值 | 含义 |
| --- | --- | --- |
| `skillsDir` | `.dsh-forge/skills` | 锻造出的 `SKILL.md` 写入目录（按会话 cwd 解析）。 |

配置通过 profile patch 层插件行的 `config` 块传入，例如：

```yaml
- insert:
    - id: dsh-forge
      name: dsh-forge
      config:
        skillsDir: '.dsh/skills'
```

注意：锻造出的技能同时通过 `ctx.skills` 在运行时注册，因此无论输出目录如何，所有在线会话都能看到它们。文件系统副本用于持久化——若目录位于官方文件系统技能 provider 的发现根内（如 `<projectRoot>/.dsh/skills` 或 `customSkillDirs` 条目），重启后仍可被发现。

## 工作原理

```
session/event ──► 轨迹累积（意图、工具调用、回合完成）
      │
      ▼
模式识别（相同规范化意图，≥2 个已完成会话）
      │
      ▼
LLM 蒸馏 ──► JSON { name, description, whenToUse, content }
      │
      ▼
写入 .dsh-forge/skills/<name>/SKILL.md ──► ctx.skills.register(...)
      │
      ▼
所有未来会话可通过 skill 工具加载该技能
```

## 路线图

- [ ] 锻造阈值与范围配置（按工作区、按任务类型）
- [ ] UI 中锻造成果预览/回滚
- [ ] 通过 git 跨机器同步技能
- [ ] 技能质量反馈循环（锻造出的技能真的有用吗？）

## 许可证

MIT

## 生态

这是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的社区插件。请在你的 GitHub 插件仓库上打 `dsh-plugin` 话题，让更多人找到它。探索未至之境。