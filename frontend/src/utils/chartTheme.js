/**
 * ECharts 统一主题：品牌四色 + 坐标系/提示框样式
 * 主色 #99B6B4 / 浅主色 #BACFCE / 强调 #D48982 / 暖调 #DFB199
 */
export const PALETTE = [
  '#99B6B4',
  '#D48982',
  '#DFB199',
  '#BACFCE',
  '#7E9E9C',
  '#C89B85',
  '#8FA9A2',
  '#E0C3B0'
]

export const C_TEXT = '#2F3E3D'
export const C_SUB = '#667977'
export const C_MUTE = '#93A5A3'
export const C_LINE = '#E3EDEC'

export const tooltip = {
  backgroundColor: 'rgba(47, 62, 61, 0.92)',
  borderWidth: 0,
  padding: [8, 12],
  textStyle: { color: '#F5F9F8', fontSize: 12 },
  extraCssText: 'border-radius:10px;box-shadow:0 10px 24px -10px rgba(47,62,61,.45);'
}

export const axisBase = {
  axisLine: { lineStyle: { color: C_LINE } },
  axisTick: { show: false },
  axisLabel: { color: C_SUB, fontSize: 11 },
  splitLine: { lineStyle: { color: '#EEF4F3', type: 'dashed' } }
}

/** 类目轴（不显示网格线） */
export const catAxis = {
  type: 'category',
  axisLine: { lineStyle: { color: C_LINE } },
  axisTick: { show: false },
  axisLabel: { color: C_SUB, fontSize: 11 },
  splitLine: { show: false }
}

export const valAxis = {
  type: 'value',
  ...axisBase,
  splitLine: { lineStyle: { color: '#EEF4F3', type: 'dashed' } }
}

export const legendBase = {
  icon: 'roundRect',
  itemWidth: 10,
  itemHeight: 10,
  itemGap: 16,
  textStyle: { color: C_SUB, fontSize: 12 }
}

export const gridBase = { left: 8, right: 16, top: 42, bottom: 4, containLabel: true }

/** 面积渐变 */
export function areaGradient(color, from = 0.34, to = 0.02) {
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: hexA(color, from) },
      { offset: 1, color: hexA(color, to) }
    ]
  }
}

/** 柱状渐变 */
export function barGradient(color, from = 1, to = 0.55) {
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: hexA(color, from) },
      { offset: 1, color: hexA(color, to) }
    ]
  }
}

export function hexA(hex, alpha) {
  const value = parseInt(hex.slice(1), 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
