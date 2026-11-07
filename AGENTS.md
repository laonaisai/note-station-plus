# 项目开发与协作规范 (Note Station Plus)

本文档定义了 Note Station Plus 项目的协作、发布与编码准则，所有 AI 助手在处理本仓库任务时应严格遵循。

---

## 1. “发布应用” 规范化工作流

**触发条件**：当用户在会话中提出 **“发布应用”**（或“发布版本”、“打包发布”、“发版”）时，必须严格按以下 5 个步骤执行自动化全平台发版操作：

### 步骤 1：前置验证与检查 (Pre-check)
1. 检查当前 `git status`，确保代码已保存且工作区状态整洁。
2. 运行 TypeScript 类型检查：
   ```bash
   npx vue-tsc --noEmit
   ```
3. 约束注意：**严禁永久修改 `package.json` 中的 `"version"` 字段**。版本号统一由 `scripts/build.cjs` 依据构建时间戳（格式 `yyyyMMdd.HH.mm`）动态生成并注入构建环境。

### 步骤 2：全平台编译与打包 (Multi-platform Build)
在安装有 Wine 的 Linux 环境下，运行全平台构建命令：
```bash
node scripts/build.cjs --win --linux
```
构建脚本将完成：
- 前端与 Electron 代码编译；
- 生成对应版本号（如 `20261107.17.50`）；
- 产出各平台安装包并存放在 `release/` 目录：
  - Windows 安装程序：`Note Station Plus Setup <version>.exe`
  - Windows 便携版：`Note Station Plus <version>.exe`
  - Linux AppImage：`Note Station Plus-<version>.AppImage`
  - Linux deb 安装包：`note-station-plus_<version>_amd64.deb`

### 步骤 3：创建与双端推送 Git 标签 (Git Tag & Push)
1. 依据打包输出的版本号打上 Git Tag：
   ```bash
   git tag v<version>
   ```
2. **双端同步推送**（必须同时推送到 GitHub 和 Gitea 仓库）：
   ```bash
   git push origin main && git push gitea main:v2
   git push origin v<version> && git push gitea v<version>
   ```

### 步骤 4：产物校验与 SHA-256 计算 (Checksums)
使用 `sha256sum` 计算本次发布的 4 个安装包哈希值与大小：
```bash
sha256sum release/*<version>* | grep -v '\.blockmap'
```

### 步骤 5：生成 GitHub Releases 描述并输出给用户
按如下规范格式生成 Release 文案供用户直接发布至 GitHub：
1. **Release 标题**：`v<version> - 全平台正式发布`
2. **Tag 标签**：`v<version>`
3. **版本更新日志**：结合自上个 Tag 以来的 `git log`，提取：
   - 🚀 **新功能与改进 (Features & Improvements)**
   - 🐛 **问题修复 (Bug Fixes)**
   - 🌐 **本地化与体验 (i18n & Experience)**
4. **产物下载与校验表**（文件名、系统架构、文件大小、SHA-256 校验和）。
5. **发布直达链接**：
   `https://github.com/laonaisai/note-station-plus/releases/new?tag=v<version>`

---

## 2. 远程仓库与分支双端推送规范
项目配置了双远程仓库，每次提交或发版标签均需双端同步：
- GitHub 远程：`origin`，主分支 `main`
- Gitea 远程：`gitea`，对应分支 `v2`（推送命令：`git push gitea main:v2`）
- 标签推送：`git push origin <tag> && git push gitea <tag>`

---

## 3. 编码与测试约束
- 保持所有文件的 POSIX LF 换行符。
- 每次关键逻辑修改后，需运行 `npx vue-tsc --noEmit` 和 `npx vitest run` 保证类型与测试 100% 通过。
- 任何调试脚本或临时文件必须在任务完成后及时清理，不留未跟踪的杂物。
