# 贡献指南（CONTRIBUTING）

感谢有兴趣让 BrandForge 更好！本文件帮你 10 分钟内建立正确的心智模型。

## 许可

提交 PR 即表示同意你的贡献以 **AGPL-3.0-only** 授权并入本仓库。
字体相关改动需保持 SIL OFL 归属（见 FONTS.md）。

## 心智模型：三层分离

```
src/lib/          模型无关的领域逻辑
  providers/      ← 唯一碰模型 API 的地方（适配器层）
  orchestrator.ts ← 管线编排（只依赖 providers 接口）
  prompts.ts      ← 提示词文本（改文案质量改这里）
  tokens.ts       ← brand.json → CSS 变量（"全局一致"的根基）
  exports.ts      ← PDF/PNG 导出（桌面/Web 双路径）
src/components/   展示层
  templates.css   ← 物料样式，只消费 --brand-* 变量，禁止硬编码颜色
  BrandKit 模板组件 ← 纯展示，props 进、DOM 出
electron/         桌面壳（IPC 桥 + printToPDF），渲染进程零 Node 权限
```

**铁律**：
1. 物料样式里出现硬编码色值 = bug（必须走 `var(--brand-*)`）；
2. 新增模型服务商 = 在 `providers/` 加适配器 + 设置页一个 option，编排层零改动；
3. 渲染进程不得直接 `require` Node 能力，一律走 `window.bfBridge`（Web 模式自动降级 fetch）。

## 本地开发

```bash
npm install
npm run dev             # Web 模式
npm run electron:dev    # 桌面联调（需先能跑通 dev）
```

模型自配：设置页填 Ollama（`ollama pull qwen3:14b` + `ollama serve`）即可全离线开发。

## PR 检查清单

- [ ] `npm run build` 通过（tsc 严格模式）
- [ ] 未配置生图时全流程可走通（程序化视觉兜底不被破坏）
- [ ] 框选编辑后四个 tab 同步变化（token 链路未断）
- [ ] PDF 导出含文字层（Acrobat 可选中文字）
- [ ] 新依赖许可兼容 AGPL 与 OFL（抄进 FONTS.md / README 致谢）
- [ ] 中文文案：界面文案保持克制、无营销腔

## 好_issue_ 长什么样

- 生图适配器请求/响应样例（脱敏）；
- 本地模型 id 与版本（JSON 遵循度问题尤其需要）；
- 导出产物的问题截图 + 期望效果。

## 路线图（欢迎认领）

- [ ] 字体子集化脚本（常用 3500 汉字），缩小安装包
- [ ] 物料模板市场（用户自定义 HTML 模板 + token 契约）
- [ ] 服务端可选渲染（headless 出 zip 包）
- [ ] 英文化界面（i18n）
