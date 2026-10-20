import { formatRMCompact } from './format'

// Chart palette (validated for colour-blind separation on a white surface).
// Income and expenses keep the same colour in every chart.
export const chartColors = {
  income: '#2a78d6',
  expenses: '#eb6834',
  grid: '#e1e0d9',
  baseline: '#c3c2b7',
  axisText: '#898781',
}

// Shared axis/grid styling so every chart looks the same
export const axisTick = { fill: chartColors.axisText, fontSize: 12 }
export const yAxisProps = {
  tickFormatter: formatRMCompact,
  tickLine: false,
  axisLine: false,
  tick: axisTick,
  width: 56,
} as const
export const hoverCursor = { fill: 'rgba(15, 23, 42, 0.05)' }
