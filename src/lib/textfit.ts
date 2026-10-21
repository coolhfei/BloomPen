/**
 * 文字长度自适应分档：模板按内容长度自动调字号，任何品牌/文案长度进来都不破版。
 * 返回 ''（标准档）| 't-m'（中）| 't-l'（长，缩字号）
 */
export function textTier(text: string, sMax: number, mMax: number): '' | 't-m' | 't-l' {
  const len = text.length
  if (len <= sMax) return ''
  if (len <= mMax) return 't-m'
  return 't-l'
}
