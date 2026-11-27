import { formatRMCompact } from './format'
import { isDark } from './theme'

// Chart palettes from the Monetra brand, each checked with the dataviz palette validator against
// its own surface (lightness band, chroma, colour-blind separation, normal vision, contrast).
//
// Light (white cards): income #2b7f57, expenses #e9a15c — protan ΔE 17. The brand's forest green
// #285c45 reads grey in charts, so income is a more vivid step of it. The orange is under 3:1
// against white, so every chart keeps its "Show as table" view.
//
// Dark (#17221d cards): income #2d855a, expenses #d4883f — protan ΔE 8.7, both above 3:1.
// The light-mode orange is too bright for the dark band, and the greens need more lightness
// difference from the orange to stay apart for colour-blind readers.
//
// Income and expenses keep the same colour in every chart. Values are read at render time, so
// they follow the theme (the app re-renders when it changes).

const LIGHT = {
  income: '#2b7f57',
  expenses: '#e9a15c',
  savings: '#2b7f57', // goal progress; amounts are always shown as text beside the bar
  grid: '#e1e0d9',
  baseline: '#c3c2b7',
  axisText: '#898781',
  cursor: 'rgba(15, 23, 42, 0.05)',
}

const DARK: typeof LIGHT = {
  income: '#2d855a',
  expenses: '#d4883f',
  savings: '#2d855a',
  grid: '#26342d',
  baseline: '#3a4a42',
  axisText: '#8fa398',
  cursor: 'rgba(255, 255, 255, 0.06)',
}

const current = () => (isDark() ? DARK : LIGHT)

export const chartColors = {
  get income() { return current().income },
  get expenses() { return current().expenses },
  get savings() { return current().savings },
  get grid() { return current().grid },
  get baseline() { return current().baseline },
  get axisText() { return current().axisText },
}

// Shared axis/grid styling so every chart looks the same
export const axisTick = {
  get fill() { return current().axisText },
  fontSize: 12,
}
export const yAxisProps = {
  tickFormatter: formatRMCompact,
  tickLine: false,
  axisLine: false,
  tick: axisTick,
  width: 56,
} as const
export const hoverCursor = {
  get fill() { return current().cursor },
}
