import { formatRMCompact } from './format'

// Chart palette from the Monetra brand, checked with the dataviz palette validator on white:
// lightness, chroma, colour-blind separation (protan ΔE 17) and normal vision all pass.
// Income green is a slightly more vivid step of the brand's forest green (#285c45 reads grey in charts).
// The orange is under 3:1 against white, so every chart keeps its "Show as table" view.
// Income and expenses keep the same colour in every chart.
export const chartColors = {
  income: '#2b7f57',
  expenses: '#e9a15c',
  // goal progress; amounts are always shown as text beside the bar
  savings: '#2b7f57',
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
