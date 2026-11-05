# Note Station Plus (群晖 Note Station 增强客户端)

现代化、跨平台的群晖 Note Station 桌面客户端，基于群晖官方 Web API 重构，支持 Markdown 高效编辑、多服务多标签并行切换以及跨服务便签同步。

---

## 🌟 核心特性

- 📝 **Markdown 格式深度编辑**
  - 所见即所得 / 双栏分屏 / 纯预览自由切换；
  - 语法高亮、代码块、GFM 表格、LaTeX 数学公式、待办任务清单；
  - **双向无损兼容**：保存时转为标准 HTML（官方 DS note 及网页端可正常查看），同时以隐式注释无损嵌入原生 Markdown，再次打开 100% 还原格式；支持存量纯 HTML 笔记自动转换。
- 📑 **多服务同时登录与 Tabs 快速切换**
  - 支持同时配置并连接多个群晖 NAS 实例（如公司 NAS、家庭 NAS）；
  - 顶部 Tabs 栏毫秒级切换不同服务工作空间，各服务网络请求与 Session 会话严格物理隔离。
- 🔄 **跨服务便签同步 (Sync Coordinator)**
  - 指定便签一键同步到其他已登录的 Note Station 服务；
  - 智能标题匹配：若目标服务已存在同名便签，自动执行覆盖更新；若不存在，则在目标服务自动创建新便签。
- 🔗 **便签分享管理 (Share Management)**
  - 公开链接分享：一键生成/复制公开分享专属 URL，并可配置只读或读写权限；
  - DSM 用户与用户组协同：动态获取群晖 DSM 授权用户与群组列表，精细分配只读 (ro) / 读写 (rw) 权限。
- ⏱️ **便签历史版本记录 (Version History)**
  - 时间轴回溯：查看便签历次编辑保存的历史版本快照，包含修改时间、作者及版本哈希；
  - 历史对比预览：支持历史版本的 Markdown 渲染预览与源码对照；
  - 一键版本还原：直接将便签回滚至指定历史版本，并实时同步刷新服务端与本地编辑器。
- 💻 **全平台桌面支持**
  - 原生支持 **Windows 10 / 11** 与 **Ubuntu Desktop 24.04 LTS**。

---

## 🛠️ 技术架构

- **宿主运行时**：Electron 33+
- **前端架构**：Vue 3 (Composition API) + TypeScript + Pinia
- **构建工具**：Vite 6 + TailwindCSS
- **Markdown 引擎**：Markdown-it + Turndown
- **自动化测试**：Vitest（包含针对真实群晖 NAS 的端到端 API 自动化联调测试）

---

## 🚀 快速上手

### 1. 安装依赖
```bash
pnpm install
```

### 2. 运行自动化测试 (针对 180 与 182 服务实机验证)
```bash
pnpm test
```

### 3. 本地桌面端开发
```bash
pnpm dev
```

### 4. 跨平台打包构建

#### 构建 Linux (Ubuntu 24.04: .deb / AppImage)
```bash
pnpm build:linux
```

#### 构建 Windows (Windows 10/11: .exe NSIS 安装包 / 便携版)
```bash
pnpm build:win
```

---

## 📄 开源许可证
MIT License.

