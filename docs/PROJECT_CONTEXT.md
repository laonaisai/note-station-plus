# Note Station Plus 项目上下文与开发备忘录 (Agent Context)

> 本文档由开发端智能体整理并持久化于代码仓库中，旨在帮助不同开发环境（Windows / Linux / macOS）以及后续协同接入的智能体快速掌握当前项目的全貌、架构设计、已实现的功能矩阵、已攻坚的技术坑点以及后续开发协作规范。

---

## 📌 一、项目定位与核心价值

**Note Station Plus** 是一个专为解决群晖（Synology）官方 Note Station 痛点而生的跨平台增强桌面客户端（Windows 10/11 & Linux Ubuntu 24.04），基于群晖官方 Web API 重构。

### 核心痛点与对应方案：
1. **官方富文本排版混乱** ➔ 原生 **Markdown 编辑体验**（分屏/单栏/预览切换、语法高亮、GFM 表格、LaTeX 公式、待办清单），并采用隐式注释实现与群晖官方 DS note / 网页端 **100% 双向无损兼容**。
2. **多群晖实例无法同时使用** ➔ **多服务 Tabs 并行会话架构**，公司 NAS、家庭 NAS 毫秒级切换，底层网络请求与 Session 完全物理隔离。
3. **跨 NAS 便签迁移与同步困难** ➔ 内置 **跨服务同步协同器 (Sync Coordinator)**，通过标题匹配自动执行新建或覆盖更新，并**完整保留并同步所有便签标签**。
4. **便签协作与外链分享受限** ➔ 原生**便签分享管理 (Share Management)**，支持开启专属公开外链（只读/读写）、一键复制/浏览器直达，并支持配置 DSM 系统用户与群组的协同权限。
5. **历史编辑丢失无回滚机制** ➔ **历史版本记录与一键还原 (Version History & Restore)**，可视化时间轴追溯历次保存快照，支持 Markdown 预览与源码对照，服务端一键回滚还原。
6. **文件导入导出与中文乱码** ➔ 支持单篇导出为带 Frontmatter 的 Markdown、整本导出为 Zip；导入支持文件拖拽并具备 **GB2312 / GBK / GB18030 / UTF-8** 智能编码识别，彻底解决 Windows 中文乱码。
7. **大体量便签丢失/加载不全** ➔ 攻坚群晖 Note Station API `total` 批次数量陷阱，实现 400+ 大容量便签的**全量自动分页拉取与内存索引**。
8. **沉浸式写作空间** ➔ 支持笔记本目录与便签列表**双侧栏自由折叠**，支持一键**全屏专注模式**。
9. **安全与隐私保障** ➔ 支持 **6 位数字启动 PIN 码**，本地 AES-GCM + PBKDF2 高强度加密存储，输错 5 次触发 30 分钟防暴力破解锁定。

---

## 🏗️ 二、系统技术架构与核心模块

### 1. 技术栈选型
- **宿主运行时**：Electron 33+ (原生支持 Windows 10/11 与 Linux Ubuntu 24.04 LTS)
- **前端视图层**：Vue 3 (Composition API, `<script setup lang="ts">`)
- **语言与规范**：TypeScript 5 (全代码库严格类型约束，`vue-tsc` 0 报错)
- **状态管理**：Pinia 2 (多 Store 模块化解耦：`sessionStore`、`noteStore`、`syncStore`、`layoutStore`)
- **样式与设计**：Tailwind CSS (响应式设计、毛玻璃与渐变吸顶、群晖蓝视觉基调)
- **Markdown 引擎**：
  - 渲染与解析：`markdown-it` (GFM, 任务清单, 表格, 代码块)
  - HTML 反转 Markdown：`turndown` + `turndown-plugin-gfm`
- **自动化测试**：Vitest 2 (包含离线单元测试以及针对真实群晖 NAS 的端到端 API 联调实机测试，共 11 个测试套件)
- **打包分发**：`electron-builder` + 动态时间戳版本号注入 + NSIS 安装升级控制

### 2. 核心架构拓扑图

```mermaid
graph TD
  User([用户交互]) --> UI[Vue 3 前端界面]
  
  subgraph UI Layer
    TabBar[TabBar: 多服务切换 / 服务增删改]
    Sidebar[NotebookSidebar: 笔记本折叠手风琴 / 独占搜索 / 标签气泡 / 年月便签列表 / 模态框]
    Editor[MarkdownEditor: 分屏编辑 / 预览 / 工具栏 / 标签编辑 / 撤销重做支持]
    Modals[Modals: 跨服务同步 / 导入导出 / 分享管理 / 历史版本 / PIN安全]
  end

  subgraph State Management [Pinia Stores]
    SessionStore[sessionStore: 多账号配置 / 客户端实例池 / 会话态隔离]
    NoteStore[noteStore: 笔记本 / 便签缓存 / 标签关联 / 过滤检索 / 历史回滚]
    SyncStore[syncStore: 跨服务便签与标签同步引擎]
    LayoutStore[layoutStore: 侧边栏折叠 / 专注全屏模式]
  end

  subgraph Service & API Layer
    PinMgr[pinManager: Web Crypto PBKDF2 + AES-GCM 加密]
    ApiClient[SynologyApiClient: 群晖 Web API 封装与错误处理]
    MdEngine[markdown.ts: Markdown <-> Note HTML 隐式无损协议]
    Codec[importMarkdown.ts: GBK/UTF-8 字符集探测与解码]
  end

  subgraph Electron Main Process
    Main[electron/main.ts: 单实例锁 / 退出二次确认 / 安全策略 / 凭证加解密]
  end

  UI --> State Management
  State Management --> Service & API Layer
  State Management --> Electron Main Process
  ApiClient -->|HTTP/HTTPS WebAPI| SynoNAS[(群晖 Note Station 服务端 180 / 182)]
```

---

## 🚀 三、已实现的核心功能矩阵与现状

### 1. 单列手风琴折叠侧边栏（两栏合一与最大化编辑空间）
- **左侧两栏合并为单列手风琴**：
  - 将原「笔记本目录」与「便签列表」合并为单一左侧栏组件，大幅释放右侧 Markdown 编辑与预览区域。
  - 保留一个置顶的「全部笔记」折叠面板，下方依次呈现各个笔记本。
  - **严格单展开手风琴 (Single-Expanded Accordion)**：同时只能展开一个折叠面板，点击另一笔记本时自动收起前一面板并无缝切换便签上下文。
### 2. 折叠面板内部独立搜索与全文检索联动
- **多维度标题与正文全文检索 (Full-Text Search)**：
  - 搜索框内嵌于各折叠面板内部，检索范围严格限制在当前折叠面板对应的笔记本（在全部笔记面板内则全库检索）。
  - **混合全文搜索架构 (Hybrid Search)**：
    1. **本地 0ms 即时过滤**：即时匹配便签标题（`title`）、便签标签（`tag`）、摘要（`brief`）及已缓存的 Markdown/HTML 完整正文内容。
    2. **服务端全文检索 (SYNO.NoteStation.FTS)**：防抖 250ms 自动发起 `SYNO.NoteStation.FTS` API 查询，穿透检索未在本地缓存正文的大量历史便签，并在搜索框左侧提供轻量加载指示动画，服务端匹配的便签 ID 与本地结果实时融合去重。
- **标签下拉多选组合筛选（节省垂直空间）**：
  - 彻底解决便签标签过多时平铺气泡占用多行垂直空间的痛点，重构为极简单行下拉多选触发器。
  - 触发栏显示已选标签数量及标签名摘要，支持一键清空；展开浮层支持多选复选框，多选时按交集组合联动筛选便签列表。
- **便签项操作菜单（菜单按钮与右键上下文菜单完全同步）**：
  - 去除卡片右侧拥挤的多个小按钮，重构为整洁统一的**菜单样式按钮（···）**，悬浮/激活时呈现。
  - 点击菜单按钮或在卡片上点击右键，均弹出定位精准的统一下拉操作菜单，菜单项保持 100% 相同同步：
    1. **同步**：唤起跨服务便签同步向导（支持标签双向同步与同名智能匹配）；
    2. **分享**：开启/管理公开外链与 DSM 用户协作授权；
    3. **历史版本**：浏览历次版本快照对比与一键还原；
    4. **导出.md文件**：直接下载带 Frontmatter 的标准 Markdown 并触发 Toast 反馈；
    5. **移动至其他笔记本**：唤起自定义笔记本迁移模态框；
    6. **删除**：安全移至废纸篓确认。
- **便签迁移（移动至其他笔记本）**：
  - 新增便签迁移能力，通过自定义 Vue 模态框列出所有候选目标笔记本并提示文章数量，确认后调用群晖 `SYNO.NoteStation.Note` `set` 接口无缝迁移并即时刷新笔记本计数。
- **侧边栏展开独占与无外层滚动条架构**：
  - 展开任一折叠面板（“全部笔记”或各笔记本）后，侧边栏自动隐藏其他所有面板，当前展开面板全高独占展示。
  - 外层容器严格保持无滚动条（`overflow-hidden`），仅展开面板内的便签列表拥有纵向滚动条，杜绝嵌套双滚动条。
  - 再次点击当前展开面板头部即可一键收起，侧边栏重新完整列出所有笔记本面板。
- **自定义模态框与桌面右键菜单**：
  - 彻底淘汰在 Electron 环境下会阻塞的原生 `window.prompt` / `window.confirm`。
  - 提供新建笔记本、重命名笔记本、删除笔记本（级联警告）、移动便签、移至废纸篓（删除便签）等全套自定义 Vue 模态框。
  - 支持右键任意笔记本或便签项弹出定制右键快捷菜单。

### 2. Markdown 编辑与预览强化（Bug 攻坚）
- **工具栏插入内容的 Ctrl+Z 原生撤销栈兼容**：
  - 攻坚根因：直接对 `<textarea>` 的 `value` 字符串赋值会破坏浏览器的原生 Undo 历史栈，导致工具栏插入的粗体/代码/表格无法通过快捷键 `Ctrl+Z` 撤销。
  - 攻坚方案：采用 `document.execCommand('insertText', false, replacement)` 执行选区替换，精准维护原生光标选区并自动压入浏览器撤销历史栈，全面恢复 `Ctrl+Z` 撤销支持。
- **Markdown 预览样式美化与 Preflight 重置修复**：
  - 攻坚根因：Tailwind CSS 的 Preflight 重置了标题、列表、表格、代码块等默认样式，缺少排版组件。
  - 攻坚方案：引入 `@tailwindcss/typography` 并在 `src/style.css` 中构建专属的 `.markdown-preview` 排版规范（标题下划线、有序/无序列表圆点缩进、任务复选框、群晖蓝引用块、暗黑代码块高亮、斑马纹表格等）。
- **工具栏操作布局**：保存状态指示灯、手动保存、导入、导出、分享管理、历史版本、同步、模式切换整齐排列。
- **便签内标签编辑**：编辑器上方专属标签条，支持现有标签胶囊展示、一键移除、输入模糊联想已有标签。
- **侧栏折叠与专注模式**：侧边栏支持一键折叠，并支持开启“专注全屏模式”，最大化编辑工作区。

### 4. 便签分享管理 (Share Management)
- **公开外链分享**：
  - 一键开启或关闭便签公开访问专属链接（调用 `SYNO.NoteStation.Shard.Link` 与 `SYNO.NoteStation.Permission.Public`）。
  - 自动呈现公开 URL，支持**一键复制到剪贴板**与**在浏览器中直接打开**。
  - 支持设置公开访问权限：**只读 (ro)** 或 **读写 (rw)**。
- **DSM 用户与群组协作授权**：
  - 动态从群晖服务器拉取可分享的 DSM 用户（👤）与群组（👥）列表（`SYNO.NoteStation.Share.Priv`）。
  - 可为指定成员分配「只读」或「可读写」权限，并支持动态移除成员授权，保存后即时同步至 NAS 服务端。
- **弹窗与入口**：[`ShareModal.vue`](../src/components/ShareModal.vue)，在编辑器顶部与列表卡片操作区均有快捷入口。

### 5. 便签历史版本记录与版本回滚 (Version History & Restore)
- **版本时间轴**：可视化列出便签在群晖 NAS 上的历次修改版本快照（`SYNO.NoteStation.Note.Version`），展示序号（#1, #2...）、修改具体时间、作者账号、提交设备（如 desktop）以及“当前最新”徽章。
- **历史内容对比与预览**：点击任意版本，右侧实时获取该版本时刻的完整便签内容（`SYNO.NoteStation.Note` `ver` 接口），支持 **「Markdown 渲染预览」** 与 **「Markdown 源码」** 无缝对照。
- **一键版本安全还原**：选定任一历史版本后，点击「还原此版本」，调用群晖原生接口将便签回滚，服务端自动生成还原快照，客户端本地编辑器与便签列表即时同步刷新。
- **弹窗与入口**：[`HistoryModal.vue`](../src/components/HistoryModal.vue)，在编辑器顶部与列表卡片操作区均有快捷入口。

### 6. Markdown 导入与导出
- **导出功能与全局 Toast 提示反馈**：
  - 单篇导出为带 YAML Frontmatter（标题、标签、时间）的标准 `.md` 文件，文件名自动执行跨平台安全字符清洗；
  - 笔记本批量导出：使用 `jszip` 将当前笔记本全量便签打包为 `.zip`，同名便签自动编号去重；
  - **优雅 Toast 状态反馈**：构建轻量级全局 Toast 通知系统（[`toast.ts`](../src/utils/toast.ts)），在单篇便签导出（无论在侧栏还是在编辑器）或笔记本全量打包导出完成时，即时弹出无阻塞的友好成功提示（如“便签【xxx】已成功导出为 Markdown 文件！”或“笔记本【xxx】全部便签 (N 篇) 已成功打包导出！”），失败时同步提示具体错误。
- **导入功能与智能编码探测**：
  - 支持文件选择对话框与本地文件拖拽直接释放导入；
  - 攻坚字符集编码识别：内置 UTF-8、UTF-8 BOM、GB2312、GBK、GB18030 智能探测（基于字节模式与乱码统计探测），彻底解决 Windows 平台导入旧中文 Markdown 文件乱码的问题；
  - 支持“覆盖当前便签”或“在当前笔记本新建便签”。

### 7. 跨服务便签与标签同步 (Sync Coordinator)
- **便签双向同步**：在编辑器中点击“同步”，自动前置保存最新便签内容及标签，然后唤起同步弹窗。
- **智能覆盖/新建**：在目标服务上按标题检索，若存在同名便签则执行覆盖更新；若不存在则新建便签。
- **标签无缝同步**：无论是新建还是覆盖更新，均提取源便签的 `tag: string[]` 数组传递给目标服务，确保目标服务生成对应的标签挂载。
- **可视化日志**：同步弹窗实时输出带时间戳的连接状态、同名匹配探测、便签与标签写入结果。

### 8. 安全与启动 PIN 锁
- **PIN 设置与验证**：支持设置 6 位纯数字启动 PIN。
- **加密存储**：PIN 经 PBKDF2 (100,000 次哈希) + 随机加盐并用 AES-GCM 本地加密保存于存储中，不保存任何明文。
- **防暴力破解**：输错 5 次强制锁定半小时（30 分钟），期间完全阻止任何解锁尝试。
- **应用退出二次确认**：拦截 Electron 窗口关闭及退出快捷键，弹出“确认退出 / 取消”提示，防止误关丢失未保存便签。
- **干净重置与首装引导**：当删除所有服务后，彻底清理界面遗留的便签数据，并自动弹出服务添加向导。

### 9. 打包、版本号与安装包控制
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
- **解决方案**：在 [SynologyApiClient.ts](../src/api/SynologyApiClient.ts) 中，以 `res.notes.length < pageSize` 作为单页未满的唯一定界条件，配合 `Set<string>` 判重与偏移累加，直至完整拉取所有便签。

### 3. 便签列表（List）默认省略 Tags 陷阱
- **现象**：调用 `SYNO.NoteStation.Note` 的 `method: 'list'` 批量查询便签时，群晖 NAS 服务端为了轻量传输，**默认不返回便签的 `tag` 字段**！只有单个查看 `method: 'get'` 时才附带 `tag` 数组。
- **解决方案**：在 [SynologyApiClient.ts](../src/api/SynologyApiClient.ts) 的 `listNotes` 中，使用 `Promise.all` 并行拉取 `SYNO.NoteStation.Tag` 标签清单（群晖以倒排索引格式保存：`{ title: '标签名', items: ['note_id_1', ...] }`），在客户端内存自动反转生成 `noteId -> tags` 映射，一次性为所有便签注入完整的 `tag: string[]`。

### 4. 创建便签（Create）忽略 Tags 陷阱
- **现象**：在调用 `SYNO.NoteStation.Note` `method: 'create'` 时即使传入 `tag` 参数，群晖服务端也**不会持久化保存标签**。
- **解决方案**：创建便签成功后，若存在标签，必须立即调用一次 `method: 'set'` 附带 `tag: JSON.stringify(tags)`，才能确保标签在服务端写入成功。

### 5. 历史版本管理（Version History）参数陷阱
- **历史版本查询**：使用 `SYNO.NoteStation.Note.Version` (version: 2, method: 'list')，建议附带 `filter: { listable: true }` 剔除群晖内部中间版本。
- **历史版本内容获取**：必须调用 `SYNO.NoteStation.Note` (version: 3, method: 'get', params: { object_id, ver })。
  > ⚠️ 踩坑提示：参数名必须是 `ver`（版本哈希），且 API 的版本号必须用 `version: 3`（如果误用 version 1 或把哈希传给 `version` 字段，会导致 API 报 104 错误或被静默忽略）。
- **版本还原**：调用 `SYNO.NoteStation.Note.Version` (version: 2, method: 'restore', params: { object_id, ver })。还原后群晖会自动将该版本提升为新的当前最新版本。

### 6. 便签外链分享与 DSM 协同权限机制
- **公开外链**：通过 `SYNO.NoteStation.Shard.Link` (version: 1, method: 'get', params: { object_id, mode: 'public' }) 获取外链专属 URL。
- **生效权限**：必须配套调用 `SYNO.NoteStation.Permission.Public` (version: 1, method: 'set'/'delete', params: { object_id, perm: 'ro'|'rw' }) 才能真正放行外网未登录访问。
- **DSM 用户与群组**：通过 `SYNO.NoteStation.Share.Priv` (version: 2, method: 'list') 检索可分享的系统用户与群组；通过 `Permission.User` 与 `Permission.Group` (version: 1, method: 'set'/'delete') 分配读写权限。

### 7. Markdown 无损存储协议
- 群晖服务端只原生解析 HTML，不支持直接存原生 Markdown。
- 本项目通过 [markdown.ts](../src/utils/markdown.ts) 约定协议：
  在保存时，将 Markdown 转为 HTML，同时在 HTML 开头嵌入隐式 HTML 注释：
  ```html
  <!-- syno-markdown-source: <base64编码的原始内容> -->
  <div>...生成的富文本HTML...</div>
  ```
  这样官方 DS note 或 Web 端查看时展示标准 HTML，本项目拉取到便签时，如果检测到该注释则以 Base64 解码出 100% 原汁原味的 Markdown；若无注释，则通过 Turndown 算法优雅降级将官方 HTML 逆向转成 Markdown。

### 8. Windows 下 `pnpm-workspace.yaml` 的 packages 校验陷阱
- **现象**：Windows 用户拉取代码后运行 `pnpm dev` 报错 `ERROR packages field missing or empty`。
- **原因**：pnpm 9/10 在检测到工作区存在 `pnpm-workspace.yaml` 时，强制要求声明 `packages:` 字段。
- **解决方案**：在 [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) 中明确写入 `packages: - '.'`，并同时支持 `allowBuilds`（pnpm 11+）和 `onlyBuiltDependencies`（pnpm 9/10），杜绝多平台跨版本报错。

### 9. Vitest 实机联调并发竞争避坑
- **现象**：当 Vitest 默认并发运行针对真实群晖 NAS（`172.28.10.180` / `172.28.10.182`）的测试套件时，同一测试账号并发高频写入导致 NAS 响应超时（15s）。
- **解决方案**：在 [`vitest.config.ts`](../vitest.config.ts) 中配置 `fileParallelism: false` 顺序执行测试文件，并将单用例超时时间 `testTimeout` 调整为 `40000ms`，确保 11 个测试套件 100% 稳定通过。

### 10. `SYNO.NoteStation.FTS` 全文检索机制
- **API 规范**：`api: 'SYNO.NoteStation.FTS'`, `version: '1'`, `method: 'search'`, `keyword: '...'`。
- **作用**：群晖官方在服务端对便签正文 HTML 与标签建立了倒排索引，调用此接口可检索到包含目标正文关键词的所有便签对象（`matches: SynoNote[]`）。
- **客户端联动**：用于与本地内存索引互补，当便签正文尚未在前端通过 `getNote()` 加载至本地时，服务端检索可精准返回对应便签 ID 并自动归并。

### 11. 移动便签（迁移至目标笔记本）API 机制
- **接口名与版本**：`api: 'SYNO.NoteStation.Note'`, `version: '1'`, `method: 'set'`。
- **关键参数**：
  - `_sid`: 当前有效会话 ID
  - `object_id`: 需要移动的目标便签 ID（如 `note_xxxx`）
  - `parent_id`: 目标笔记本 ID（如 `notebook_xxxx`）
- **避坑提示**：
  - 群晖官方并未提供名为 `move` 的独立接口，而是通过 `Note` 对象的 `method: 'set'` 更新其 `parent_id` 属性实现迁移。
  - 迁移成功后应立即触发 `listNotebooks()` 刷新所有笔记本中的 `items` 关联列表与计数徽标。

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
│   │   ├── SynologyApiClient.ts# 群晖 Web API 核心封装（含标签注水、历史版本、分享管理等）
│   │   └── syncCoordinator.ts  # 跨服务便签与标签同步引擎
│   ├── components/
│   │   ├── TabBar.vue          # 顶部多服务 Tabs 栏
│   │   ├── NotebookSidebar.vue # 统一折叠手风琴侧边栏（单展开手风琴、独立搜索、标签气泡、年月便签卡片、自定义模态框）
│   │   ├── MarkdownEditor.vue  # 编辑器核心、排版预览、工具栏、标签编辑、侧栏折叠与专注模式
│   │   ├── SyncModal.vue       # 跨服务同步弹窗（带源便签标签展示与时间戳日志）
│   │   ├── ServerModal.vue     # 服务配置/添加/编辑弹窗
│   │   ├── ImportModal.vue     # Markdown 文件导入（含 GBK/UTF-8 编码智能识别）
│   │   ├── ShareModal.vue      # 便签公开链接与 DSM 用户/群组协作权限管理弹窗
│   │   ├── HistoryModal.vue    # 便签历史版本快照时间轴、Markdown 预览与一键还原弹窗
│   │   ├── PinSettingsModal.vue# PIN 码设置/修改/关闭弹窗
│   │   └── PinVerifyScreen.vue # 启动 PIN 验证锁屏界面（防暴力破解锁定）
│   ├── services/
│   │   ├── configManager.ts    # 本地服务器配置与安全持久化
│   │   └── pinManager.ts       # PIN 密码学加密算法与锁定状态管理器
│   ├── stores/
│   │   ├── sessionStore.ts     # 多服务会话管理与客户端实例池
│   │   ├── noteStore.ts        # 便签与笔记本核心 Store（过滤、分组、重命名、删除、分享与历史动作）
│   │   ├── syncStore.ts        # 跨服务同步 Store（含标签同步）
│   │   └── layoutStore.ts      # 侧边栏折叠与专注全屏模式 Store
│   ├── types/
│   │   └── synology.ts         # 全量 TypeScript 接口（NoteVersion, NoteShareInfo, NoteAcl 等）
│   └── utils/
│       ├── markdown.ts         # Markdown 与 Note Station HTML 双向转换协议
│       ├── exportMarkdown.ts   # 导出单篇 / 导出笔记本为 Zip
│       ├── importMarkdown.ts   # 导入 Markdown 解析与 GBK/UTF-8 编码自动识别
│       └── toast.ts            # 全局 Toast 状态反馈通知系统
├── tests/                      # 自动化测试套件（全面覆盖离线与实机）
│   ├── api/
│   │   ├── notebook_crud.test.ts          # 笔记本增删改查实机联调
│   │   ├── pagination.test.ts             # 400+ 便签分页算法单测
│   │   ├── sync-coordinator.test.ts       # 跨服务同步实机联调
│   │   ├── synology-client.test.ts        # API Client 实机测试 (180/182)
│   │   └── synology-share-history.test.ts # 分享与历史版本 API 实机测试
│   ├── services/
│   │   └── pinManager.test.ts             # PIN 码安全性与锁定单测
│   ├── stores/
│   │   ├── layoutStore.test.ts            # 侧边栏折叠与专注模式状态单测
│   │   ├── noteFilterGrouping.test.ts     # 便签过滤、笔记本计数、重命名删除单测
│   │   └── syncStore.test.ts              # 跨服务同步带标签单测
│   └── utils/
│       ├── exportMarkdown.test.ts         # 导出 Markdown 与 Zip 打包单测
│       ├── importMarkdown.test.ts         # 导入 Markdown 与 GBK/UTF-8 编码检测单测
│       └── toast.test.ts                  # Toast 消息通知调度单测
├── pnpm-workspace.yaml         # pnpm 工作区与原生构建白名单配置
└── docs/
    ├── PROJECT_CONTEXT.md      # [当前文档] 跨设备智能体上下文与备忘录
    ├── 开发文档.md
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
# 运行离线逻辑单元测试（Pinia Store、分页算法、PIN 管理器、导入导出等）
npx vitest run tests/stores/noteFilterGrouping.test.ts tests/stores/syncStore.test.ts tests/services/pinManager.test.ts tests/utils/importMarkdown.test.ts tests/utils/exportMarkdown.test.ts

# 运行全量自动化测试套件（包含真实群晖 NAS 180 / 182 实机联调测试）
pnpm test

# TypeScript 完整类型检查（0 错误规范）
pnpm vue-tsc --noEmit
```

### 3. 构建与打包
```bash
# 检查前端生产构建
pnpm vite build

# Windows 安装包与便携版打包 (自动动态注入 yyyyMMdd.HH.mm 版本号)
pnpm build:win

# Linux 安装包打包 (.deb & .AppImage)
pnpm build:linux
```

---

## 🧭 七、给后续协同智能体（AI Agent）的开发约定

1. **保持 Git 工作区干净与双远端同步**：
   - 每次任务完成后，必须先跑通 `pnpm vue-tsc --noEmit` 和对应单测，确认 `pnpm vite build` 成功。
   - 必须通过 `git add`、`git commit` 提交改动，并**同时推送至 GitHub 与 Gitea 两个远端仓库**：
     ```bash
     git push origin main
     git push gitea main:v2
     ```
   - **绝对不要动态修改 `package.json` 中的 `version` 字段**，版本号由 `scripts/build-electron.cjs` 在打包时动态传入环境变量。
2. **多服务会话独立原则**：
   - 任何涉及群晖网络请求的操作，必须通过 `sessionStore.getClient(serverId)` 或 `sessionStore.activeClient` 获取对应的客户端实例，切忌全局共享单个实例导致会话串扰。
3. **Electron 原生弹窗禁令**：
   - 任何用户交互、文本输入、二次确认操作，一律使用 Vue 自定义模态框，杜绝使用 `window.prompt` 或 `window.confirm`。
4. **群晖兼容性规范**：
   - 便签内容无论如何修改，都必须经由 [markdown.ts](../src/utils/markdown.ts) 序列化后存储，严禁向群晖服务端直接提交纯 Markdown 纯文本（否则群晖官方客户端会报错或显示为未排版的单行文本）。
5. **跨平台兼容与路径规范**：
   - 文档与代码引用避免硬编码类似 `E:\...` 或 `/home/...` 的平台特定绝对路径，使用工程相对路径以保证跨平台协同顺畅。
