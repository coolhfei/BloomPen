/**
 * 字体自托管（SIL OFL 许可，见 FONTS.md 归属清单）。
 * - 应用 UI 与物料在 main.tsx 正常 import 各包 css；
 * - 打印 iframe / Electron PDF 需要把 @font-face 注入独立文档，故此处以 ?inline 取 css 文本。
 */
import notoSerifSc from '@fontsource-variable/noto-serif-sc/index.css?inline'
import notoSansSc from '@fontsource-variable/noto-sans-sc/index.css?inline'
import zcoolXiaowei from '@fontsource/zcool-xiaowei/index.css?inline'
import zcoolHuangyou from '@fontsource/zcool-qingke-huangyou/index.css?inline'
import maShanZheng from '@fontsource/ma-shan-zheng/index.css?inline'
import longCang from '@fontsource/long-cang/index.css?inline'
import plex400 from '@fontsource/ibm-plex-mono/400.css?inline'
import plex500 from '@fontsource/ibm-plex-mono/500.css?inline'
import plex600 from '@fontsource/ibm-plex-mono/600.css?inline'

export const FONTS_CSS = [
  notoSerifSc,
  notoSansSc,
  zcoolXiaowei,
  zcoolHuangyou,
  maShanZheng,
  longCang,
  plex400,
  plex500,
  plex600,
].join('\n')
