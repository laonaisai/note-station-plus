# Note Station Plus 项目上下文与开发备忘录 (Agent Context)

> 本文档由开发端智能体整理并持久化于代码仓库中，旨在帮助其他开发环境或后续接入的智能体快速掌握当前项目的全貌、架构设计、已实现的功能矩阵、已攻坚的技术坑点以及后续开发规范。

---

## 📌 一、项目定位与核心价值

**Note Station Plus** 是一个专为解决群晖（Synology）官方 Note Station 痛点而生的跨平台增强桌面客户端（Windows 10/11 & Linux Ubuntu 24.04），基于群晖官方 Web API 重构。

### 核心痛点与对应方案：
1. **官方富文本排版混乱** ➔ 原生 **Markdown 编辑体验**（分屏/单栏/预览切换、语法高亮、GFM 表格、LaTeX 公式、待办清单），并采用隐式注释实现与群晖官方 DS note / 网页端 **100% 双向无损兼容**。
2. **多群晖实例无法同时使用** ➔ **多服务 Tabs 并行会话架构**，公司 NAS、家庭 NAS 毫秒级切换，底层网络请求与 Session 完全物理隔离。
3. **跨 NAS 便签迁移与同步困难** ➔ 内置 **跨服务同步协同器 (Sync Coordinator)**，通过标题匹配自动执行新建或覆盖更新，并**完整保留并同步所有便签标签**。
4. **大体量便签丢失/加载不全** ➔ 攻坚群晖 Note Station API `total` 批次数量陷阱，实现 400+ 大容量便签的**全量自动分页拉取与内存索引**。
5. **安全与隐私保障** ➔ 支持 **6 位数字启动 PIN 码**，本地 AES-GCM + PBKDF2 高强度加密存储，输错 5 次触发 30 分钟防暴力破解锁定。

---

## 🏗️ 二、系统技术架构与核心模块

### 1. 技术栈选型
- **宿主运行时**：Electron 33+ (支持 Windows 与 Linux)
- **前端视图层**：Vue 3 (Composition API, `<script setup lang="ts">`)
- **语言与规范**：TypeScript 5 (严格类型检查 `vue-tsc`)
- **状态管理**：Pinia 2 (多 Store 模块化解耦)
- **样式与设计**：Tailwind CSS (响应式、毛玻璃质感、群晖蓝视觉基调)
- **Markdown 转换**：
  - 渲染：`markdown-it` (GFM, 任务列表, 表格, 代码块)
  - HTML 反转 Markdown：`turndown` + `turndown-plugin-gfm`
- **自动化测试**：Vitest (包含状态单测与针对真实群晖 NAS 的端到端 API 联调实机测试)
- **打包分发**：`electron-builder` + NSIS 自定义升级脚本

### 2. 核心架构拓扑图

```mermaid
graph TD
  User([用户交互]) --> UI[Vue 3 前端界面]
  
  subgraph UI Layer
    TabBar[TabBar: 多服务切换 / 服务增删改]
    Sidebar[NotebookSidebar: 笔记本目录 / 标签筛选]
    NoteList[NoteList: 年月分组 / 独占搜索栏 / 列表]
    Editor[MarkdownEditor: 分屏编辑 / 预览 / 工具栏]
    Modals[Modals: 同步 / 导入 / 导出 / 分享 / 历史 / PIN]
  end

  subgraph State Management [Pinia Stores]
    SessionStore[sessionStore: 多账号配置 / 客户端实例池 / 会话态]
    NoteStore[noteStore: 笔记本 / 便签缓存 / 标签统计 / 过滤分组]
    SyncStore[syncStore: 跨服务便签与标签同步引擎]
    LayoutStore[layoutStore: 侧边栏折叠 / 专注全屏模式]
  end

  subgraph Service & API Layer
    PinMgr[pinManager: Web Crypto PBKDF2 + AES-GCM]
    ApiClient[SynologyApiClient: 群晖 Web API 封装]
    MdEngine[markdown.ts: Markdown <-> Note HTML 无损协议转换]
  end

  subgraph Electron Main Process
    Main[electron/main.ts: 窗口管理 / 退出确认 / 安全策略 / 凭证加解密]
  end

  UI --> State Management
  State Management --> Service & API Layer
  State Management --> Electron Main Process
  ApiClient -->|HTTP/HTTPS WebAPI| SynoNAS[(群晖 Note Station 服务端)]
```

---

## 🚀 三、已实现的核心功能与现状

### 1. 笔记本与目录管理（全生命周期已闭环）
- **便签数量实时展示**：左侧笔记本目录中，每个笔记本后展示便签数量徽标（如 `我的便签 (42)`），结合服务端 `items` 计数与本地加载便签计算。
- **自定义模态框与右键菜单**：
  - 彻底淘汰了在 Electron 环境下会阻塞或失效的原生 `window.prompt` / `window.confirm`。
  - 新增自定义 **新建笔记本** 与 **重命名笔记本** 模态框（支持 Enter 提交、Esc 取消、自动聚焦）。
  - 新增 **删除笔记本危险确认弹窗**，提示级联删除风险，删除后自动清空本地便签缓存并重新选定活动目录。
  - 支持右键任意笔记本弹出**桌面级右键菜单**（✏️ 重命名 / 📦 导出 Markdown Zip / 🗑️ 删除）。

### 2. 便签列表、检索与分类
- **双行独立布局**：顶部工具栏分为标题/新建/刷新行，以及**整行独占的搜索框**，输入空间充裕。
- **动态标签过滤栏**：
  - 笔记本目录下方提供垂直滚动的**标签筛选栏**，显示所有标签及当前分类下的便签计数胶囊（如 `#前端 (5)`）。
  - 支持单标签一键过滤、再次点击或点“全部”取消筛选，并支持与关键词搜索组合联动。
- **年月吸顶分隔头 (Sticky Header)**：
  - 便签按修改/创建时间自动按年月归类（如 `2026年11月`、`2026年10月` 等）。
  - 升级为**高对比度吸顶头部**：左侧 `syno-blue` 垂直品牌高亮条、浅蓝渐变毛玻璃背景（`bg-gradient-to-r from-blue-50/95`）、日历图标专用底色衬底、加粗深色文字与高对比度数量胶囊徽标。
- **400+ 便签完整分页加载**：突破群晖 API batch size 限制，已通过实机联调单测保证 400+ 篇便签完整获取不截断。

### 3. Markdown 编辑与更多操作下拉
- **Markdown 工具栏与模式切换**：支持粗体、斜体、标题、无序/有序列表、任务待办、代码块、GFM 表格、引用、LaTeX 公式；支持“分屏 / 编辑 / 预览”一键切换。
- **工具栏下拉整合**：将使用频率较低的“导入 Markdown”、“导出 Markdown”、“便签分享管理”和“历史版本记录”收纳为“更多”下拉菜单，紧跟在“同步”按钮后，点击空白区域自动关闭。
- **便签内标签编辑**：编辑器上方专属标签条，支持现有标签胶囊展示、一键移除、输入模糊联想已有标签。

### 4. 跨服务便签与标签同步 (Sync Coordinator)
- **便签双向同步**：在编辑器中点击“同步”，自动前置保存最新便签内容及标签，然后唤起同步弹窗。
- **智能覆盖/新建**：在目标服务上按标题检索，若存在同名便签则执行覆盖更新；若不存在则新建便签。
- **标签无缝同步**：无论是新建还是覆盖更新，均提取源便签的 `tag: string[]` 数组传递给目标服务，确保目标服务生成对应的标签挂载。
- **可视化日志**：同步弹窗实时输出连接状态、同名匹配探测、便签与标签写入结果。

### 5. 便签分享与历史版本控制
- **公开分享管理**：开启/关闭便签公开外链，设置访问只读或读写权限，一键复制链接。
- **DSM 用户协作**：拉取 NAS 上的系统用户与群组列表，精细授予特定用户读写权限。
- **历史版本回溯**：查看历次保存的版本时间线，支持历史版本 Markdown 内容预览对照与一键还原。

### 6. 安全与启动 PIN 锁
- **PIN 设置与验证**：支持设置 6 位纯数字启动 PIN。
- **加密存储**：PIN 经 PBKDF2 (100,000 次哈希) + 随机加盐并用 AES-GCM 本地加密保存于存储中，不保存任何明文。
- **防暴力破解**：输错 5 次强制锁定半小时（30 分钟），期间完全阻止任何解锁尝试。
- **应用退出二次确认**：拦截 Electron 窗口关闭及退出快捷键，弹出“确认退出 / 取消”提示，防止误关丢失未保存便签。
- **干净重置与首装引导**：当删除所有服务后，彻底清理界面遗留的便签数据，并自动弹出服务添加向导。

### 7. 打包、版本号与安装包控制
- **自动构建版本号格式**：`yyyyMMdd.HH.mm`（例如 `20261106.08.39`）。
- **动态无污染注入**：采用 `scripts/build-electron.cjs` 在构建执行时通过内存/环境变量动态传递版本号，**绝不修改工作区源码或 `package.json`**，保持 git 干净。
- **NSIS 防旧版本覆盖与新版本无缝升级**：
  - 安装新版本时，若检测到已运行的实例，自动友好关闭；
  - 自动先执行旧版本卸载，再安装新版本，防止文件冲突残留；
  - 若安装包版本号小于等于当前已安装版本，弹出警告并退出安装程序。
- **现代圆角扁平图标**：生成各尺寸 ICO (256/128/64/48/32/16) 与 PNG，全平台适配。

---

## ⚠️ 四、群晖 Note Station API 核心技术陷阱与避坑指南

如果后续智能体需要拓展或排查群晖 API 相关代码，请**务必仔细阅读**以下攻坚总结：

### 1. `SYNO.NoteStation.Notebook` API 规则
- **创建**：`api: 'SYNO.NoteStation.Notebook', method: 'create', title: '...'`
- **重命名**：`api: 'SYNO.NoteStation.Notebook', method: 'set', object_id: '...', title: '新标题'`
  > ⚠️ 注意：群晖不支持 `method: 'update'`，更新笔记本元数据必须使用 `method: 'set'`。
- **删除**：`api: 'SYNO.NoteStation.Notebook', method: 'delete', object_id: '...'`

### 2. `SYNO.NoteStation.Note` 分页陷阱（极其重要！）
- **现象**：调用 `SYNO.NoteStation.Note` 的 `method: 'list'` 分页查询便签时，群晖返回的 JSON 结构中：
  ```json
  { "success": true, "data": { "notes": [...], "total": 20 } }
  ```
  这里的 `total` **不是该笔记本下的总便签数**，而是**当前批次返回的数量**！
- **后果**：如果依据 `offset + limit >= total` 判断循环终止，代码在拉取第一页（例如 20 篇）后就会误以为拉完了，导致 400+ 篇便签只显示前面零星几个。
- **解决方案**：在 [SynologyApiClient.ts](file:///e:/Sources/note-station-plus/src/api/SynologyApiClient.ts#L290-L330) 中，以 `res.notes.length < pageSize` 作为单页未满的唯一定界条件，配合 `Set<string>` 判重与偏移累加，直至完整拉取所有便签。

### 3. 便签标签（Tags）的持久化机制
- **创建便签**：`method: 'create'` 支持带 `tag` 参数，但必须是序列化后的 JSON 字符串：`JSON.stringify(['标签A', '标签B'])`。
- **更新/附加便签标签**：群晖对于便签元数据修改（包括标签覆盖）必须使用 `method: 'set'`，并在 `payload` 中附带 `tag: JSON.stringify(tags)`。如果以空数组更新标签，传 `JSON.stringify([])` 即可清空标签。

### 4. 为什么不能在 Electron 中使用 `window.prompt` / `window.confirm`
- Chromium / Electron 在主进程未特殊配置的情况下，`window.prompt()` 会直接被静默丢弃并返回 `null`，或者引起渲染进程消息泵阻塞卡死。
- 所有用户输入与危险确认，必须使用纯 Vue 组件实现的模态框（如 `NotebookSidebar.vue` 现有的 `notebookModal` 和 `deleteModal`）。

### 5. Markdown 无损存储协议
- 群晖服务端只原生解析 HTML，不支持直接存原生 Markdown。
- 本项目通过 [markdown.ts](file:///e:/Sources/note-station-plus/src/utils/markdown.ts) 约定协议：
  在保存时，将 Markdown 转为 HTML，同时在 HTML 开头嵌入隐式 HTML 注释：
  ```html
  <!-- syno-markdown-source: <base64编码的原始内容> -->
  <div>...生成的富文本HTML...</div>
  ```
  这样官方 DS note 或 Web 端查看时展示标准 HTML，本项目拉取到便签时，如果检测到该注释则以 Base64 解码出 100% 原汁原味的 Markdown；若无注释，则通过 Turndown 算法优雅降级将官方 HTML 逆向转成 Markdown。

---

## 📂 五、项目核心目录速览

```text
note-station-plus/
├── build/                      # 打包资源（icon.ico, icon.png, installer.nsh）
├── electron/                   # Electron 主进程与 Preload 脚本
│   ├── main.ts                 # 主进程入口（单实例锁、退出拦截、窗口状态持久化）
│   └── preload.ts              # 上下文桥接（安全 IPC 通信）
├── public/                     # 静态公共资源
├── scripts/                    # 构建与打包自动化脚本
│   └── build-electron.cjs      # 动态计算 yyyyMMdd.HH.mm 并调用 electron-builder
├── src/
│   ├── api/
│   │   └── SynologyApiClient.ts# 群晖 Web API 核心封装（全 API 支持与统一错误处理）
│   ├── components/
│   │   ├── TabBar.vue          # 顶部多服务 Tabs 栏
│   │   ├── NotebookSidebar.vue # 笔记本目录树、标签筛选、自定义重命名/删除模态框、右键菜单
│   │   ├── NoteList.vue        # 便签列表、独占单行搜索栏、年月分组吸顶头
│   │   ├── MarkdownEditor.vue  # 编辑器核心、标签管理、工具栏“更多”操作下拉
│   │   ├── SyncModal.vue       # 跨服务同步弹窗（带源便签标签展示与同步日志）
│   │   ├── ServerModal.vue     # 服务配置/添加/编辑弹窗
│   │   ├── ImportModal.vue     # Markdown 文件导入（支持 GBK/UTF-8 自动识别编码）
│   │   ├── ShareModal.vue      # 便签公开链接与 DSM 用户权限管理弹窗
│   │   ├── HistoryModal.vue    # 便签历史版本快照时间轴与还原弹窗
│   │   ├── PinSettingsModal.vue# PIN 码设置/修改/关闭弹窗
│   │   └── PinVerifyScreen.vue # 启动 PIN 验证锁屏界面（防暴击5次锁定30分钟）
│   ├── services/
│   │   ├── configManager.ts    # 本地服务器配置与安全持久化
│   │   └── pinManager.ts       # PIN 密码学加密算法与锁定状态管理器
│   ├── stores/
│   │   ├── sessionStore.ts     # 多服务会话管理
│   │   ├── noteStore.ts        # 便签与笔记本核心 Store（过滤、分组、重命名、删除）
│   │   ├── syncStore.ts        # 跨服务同步 Store（含标签同步）
│   │   └── layoutStore.ts      # 界面折叠与专注模式
│   ├── types/
│   │   └── synology.ts         # 全量 TypeScript 接口与类型定义
│   └── utils/
│       ├── markdown.ts         # Markdown 与 Note Station HTML 双向转换协议
│       ├── exportMarkdown.ts   # 导出单篇 / 导出笔记本为 Zip
│       └── importMarkdown.ts   # 导入 Markdown 文件解析与字符编码识别
├── tests/                      # 自动化测试套件
│   ├── api/
│   │   ├── notebook_crud.test.ts          # 笔记本增删改查实机联调
│   │   ├── pagination.test.ts             # 400+ 便签分页算法单测
│   │   ├── sync-coordinator.test.ts       # 跨服务同步联调
│   │   ├── synology-client.test.ts        # API Client 实机测试 (180/182)
│   │   └── synology-share-history.test.ts # 分享与历史版本 API 实机测试
│   ├── services/
│   │   └── pinManager.test.ts             # PIN 码安全性与锁定单测
│   └── stores/
│       ├── noteFilterGrouping.test.ts     # 便签过滤、笔记本计数、重命名删除单测
│       └── syncStore.test.ts              # 跨服务同步带标签单测
└── docs/
    ├── PROJECT_CONTEXT.md      # [当前文档] 跨设备智能体上下文与备忘录
    ├── 可行性分析及开发方案.md
    └── 开发方案及计划.md
```

---

## 🛠️ 六、常用命令备忘

### 1. 开发运行
```bash
# 启动本地开发（自动拉起 Vite 与 Electron）
pnpm dev

# Windows 专用启动命令
pnpm dev:win
```

### 2. 自动化测试与类型检查
```bash
# 运行离线逻辑单元测试（Pinia Store、分页算法、PIN 管理器等）
npx vitest run tests/stores/noteFilterGrouping.test.ts tests/stores/syncStore.test.ts tests/services/pinManager.test.ts

# 运行针对真实群晖 NAS 的端到端 API 联调测试 (需要内网可达 172.28.10.180 / 172.28.10.182)
npx vitest run tests/api/synology-client.test.ts tests/api/notebook_crud.test.ts

# TypeScript 完整类型检查
npx vue-tsc --noEmit
```

### 3. 构建与打包
```bash
# 检查前端构建
npx vite build

# Windows 安装包与便携版打包 (自动注入 yyyyMMdd.HH.mm 版本号)
pnpm build:win

# Linux 安装包打包 (.deb & .AppImage)
pnpm build:linux
```

---

## 🧭 七、给后续协同智能体（AI Agent）的开发约定

1. **保持 Git 工作区干净**：
   - 每次任务完成后，必须先跑通 `npx vue-tsc --noEmit` 和对应单测，确认 `npx vite build` 成功。
   - 必须通过 `git add`、`git commit` 提交改动，并执行 `git push origin main` 推送至远端。
   - **绝对不要动态修改 `package.json` 中的 `version` 字段**，版本号由 `scripts/build-electron.cjs` 在打包时动态传入环境变量。
2. **多服务会话独立原则**：
   - 任何涉及群晖网络请求的操作，必须通过 `sessionStore.getClient(serverId)` 或 `sessionStore.activeClient` 获取对应的客户端实例，切忌全局共享单个实例导致会话串扰。
3. **Electron 原生弹窗禁令**：
   - 任何用户交互、文本输入、二次确认操作，一律使用 Vue 自定义模态框，杜绝使用 `window.prompt` 或 `window.confirm`。
4. **群晖兼容性规范**：
   - 便签内容无论如何修改，都必须经由 [markdown.ts](file:///e:/Sources/note-station-plus/src/utils/markdown.ts) 序列化后存储，严禁向群晖服务端直接提交纯 Markdown 纯文本（否则群晖官方客户端会报错或显示为未排版的单行文本）。
