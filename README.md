# BrandForge · 一句话生成整套品牌视觉物料

> 输入一句品牌简报，产出一套风格统一、可编辑、可导出的上市传播物料：
> **品牌规范页 · 宣传册 5 页（PDF 带文字层）· 主视觉海报 · 社媒三件套（1:1 / 3:4 / 16:9）**

免费、开源（AGPL-3.0）、本地优先的客户端工具。**不内置任何模型与密钥**——文本模型与生图服务完全由你自配（本地 Ollama / ComfyUI / A1111，或云端兼容端点）。

```
一句话简报
   │
   ├─ 品牌系统 Agent ──→ brand.json（色彩/字体/Slogan/语气/视觉母题）
   │        │
   │        ├─ 文案 Agent ──→ 宣言/简介/内容矩阵/排期/社媒配文
   │        └─ 主视觉 Agent ─→ 英雄图（可选；失败自动程序化视觉兜底）
   │
   └─ 版式 / 社媒 Agent ──→ HTML 模板 + 品牌 token（CSS 变量）程序化渲染
```

**核心设计：物料不是"画"出来的，是"渲染"出来的。**
所有版式只消费一份结构化品牌文件（brand.json → CSS 变量），因此：

- **风格 100% 统一**：同一套 token 驱动全部物料，物理上不可能漂移；
- **一处修改、全局一致**：框选任意区域 + 一句自然语言（"主色向深绿偏移一档"），
  模型把话翻译成 token 补丁，全部物料秒级同步重渲染——不是承诺，是架构；
- **输出真可编辑**：PDF 保留真实文字层（Acrobat 可继续改字），PNG 为精确像素尺寸。

## 快速开始

### 桌面客户端（推荐）

```bash
npm install
npm run dist:win        # 打包 Windows 安装包（release/ 目录）
# 或开发态直接跑：
npm run electron:start
```

桌面端所有模型请求经本地主进程转发，**无 CORS 问题**，Ollama / ComfyUI / A1111 开箱即用。

### Web 模式（贡献者 / 自托管）

```bash
npm install
npm run dev             # http://localhost:5173
```

Web 模式浏览器直连你配置的端点，本地服务需开启 CORS：

| 服务 | 开启方式 |
|---|---|
| Ollama | 环境变量 `OLLAMA_ORIGINS=http://localhost:5173` 后重启 |
| AUTOMATIC1111 / Forge | 启动参数 `--api --cors-allow-origins=http://localhost:5173` |
| ComfyUI | 启动参数 `--enable-cors-header` |
| LM Studio | 本地服务器设置中打开 CORS |

### 配置模型

打开应用内 **⚙ 模型设置**：

- **文本模型**（必需）：任意 OpenAI 兼容端点。推荐本地 `qwen3:14b` 起步（`ollama pull qwen3:14b`），
  云端可填阿里百炼 / DeepSeek / OpenAI 等兼容端点。设置页内置一键测试连接。
- **生图适配器**（可选）：A1111 / ComfyUI / 百炼 / OpenAI-images。
  未配置或生成失败时，英雄区自动使用程序化视觉（等高线+声波），**其余物料不受任何影响**。

配置仅保存在本机 localStorage，不上传任何服务器。

## 功能一览

- **多 Agent 管线可视化**：品牌→(文案 ∥ 主视觉)→版式/社媒 的并行依赖图，流式日志；
- **四个交付 tab**：品牌规范单页 / 宣传册 3+2 全览 / 海报 / 社媒三件套；
- **框选编辑**：拖框圈选物料区域 → 自然语言指令 → token 补丁 → 全局闪变重渲染；
- **brand.json 实时检视器**：色板/字体/口号/语气/母题，点色板复制 hex，可展开源文件；
- **导出**：宣传册 PDF（桌面端主进程 printToPDF / Web 端打印对话框，均保留文字层）、
  海报与社媒 PNG（1080²、1080×1440、1920×1080 精确尺寸）；
- **演示模式**：成功结果缓存于 IndexedDB，可离线回放（断网演示/模型故障兜底）。

## 字体

物料与界面字体全部**自托管**（构建产物内置，离线可用），均为 **SIL Open Font License 1.1**，
可自由商用与再分发。归属清单与许可原文见 [FONTS.md](FONTS.md)。

## 许可

- 程序代码：**AGPL-3.0-only**（见 [LICENSE](LICENSE)）
- 字体：SIL OFL 1.1（独立许可，不并入 AGPL）
- 模型权重：**不随本软件分发**，由用户自行提供；请遵守各自模型许可（部分模型含非商用条款）

## 开发

```bash
npm run dev             # Web 开发态
npm run electron:dev    # Electron + Vite 热更新联调
npm run build           # 类型检查 + 构建
npm run dist            # 三平台打包（win/mac/linux）
```

目录结构、贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 致谢与边界

本项目起源于 FDE 竞赛演示原型；技术路线参考了"结构化品牌文件驱动多物料"的行业共识
（Design Rails 的品牌身份导出、腾讯 Miora 的多 Agent 画布等公开产品形态），代码为独立实现。
