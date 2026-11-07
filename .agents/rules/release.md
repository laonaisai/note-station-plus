---
trigger: "发布应用"
description: "当用户提出发布应用时，全平台编译打包安装包，推送标签并生成GitHub Releases发布描述"
---

# 发布应用规范 (Release Application Rule)

当用户提出 **“发布应用”**、**“发布版本”** 或 **“发版”** 时，按照以下流程执行：

1. **类型检查**：运行 `npx vue-tsc --noEmit`，确保 0 错误。
2. **多平台打包**：运行 `node scripts/build.cjs --win --linux`。
   - 禁止修改 `package.json` 中的 `version` 字段，构建脚本会自动动态生成基于时间戳的版本号 `yyyyMMdd.HH.mm`。
   - 产物在 `release/` 目录中：包含 Windows Setup、Windows 便携版、Linux AppImage、Linux deb。
3. **标签与双端推送**：
   - 提取生成的动态版本号 `<version>`。
   - `git tag v<version>`
   - `git push origin main && git push gitea main:v2`
   - `git push origin v<version> && git push gitea v<version>`
4. **计算校验和**：
   - 对 `release/` 下本次生成的 4 个安装包计算 `sha256sum` 与文件大小。
5. **生成 GitHub Releases 描述**：
   - 自动生成 Markdown 格式的 Releases 描述，包含版本特性、修复项、校验码清单及直达链接。
