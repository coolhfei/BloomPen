# 字体归属与许可（FONTS）

本软件**自托管**以下字体（经 fontsource 打包，构建产物内置，离线可用）。
全部字体采用 **SIL Open Font License 1.1**（可自由使用、研究、修改与再分发，含商业用途；
不得单独售卖字体本身；保留本许可声明即可）。字体许可**独立于**程序代码的 AGPL-3.0。

| 字体 | 用途 | 许可 | 来源 |
|---|---|---|---|
| Noto Serif SC（思源宋体，可变字重） | 物料标题候选 / 界面显示 | OFL-1.1 | Google Fonts / fontsource |
| Noto Sans SC（思源黑体，可变字重） | 物料正文候选 / 界面正文 | OFL-1.1 | Google Fonts / fontsource |
| ZCOOL XiaoWei（站酷小薇） | 物料标题候选 | OFL-1.1 | Google Fonts / fontsource |
| ZCOOL QingKe HuangYou（站酷庆科黄油） | 物料标题候选 | OFL-1.1 | Google Fonts / fontsource |
| Ma Shan Zheng（马善政楷书） | 物料标题候选 | OFL-1.1 | Google Fonts / fontsource |
| Long Cang（龙藏体） | 物料标题候选 | OFL-1.1 | Google Fonts / fontsource |
| IBM Plex Mono | 界面遥测/标签字体 | OFL-1.1 | fontsource |

- 各字体完整许可原文见 `node_modules/@fontsource*/LICENSE`（随依赖分发）；
- 品牌生成时模型只能从上述字体白名单中选择，保证渲染与导出稳定；
- 打印/PDF 文档通过内联 `@font-face` 注入同一批字体文件，PDF 内嵌子集由渲染器完成。
