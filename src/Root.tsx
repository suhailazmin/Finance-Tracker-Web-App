import App from './App'
import { useAmountsHidden } from './lib/privacy'

// Re-renders the whole app when "hide amounts" is switched, so every formatted RM figure updates
export default function Root() {
  useAmountsHidden()
  return <App />
}
