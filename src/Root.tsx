import App from './App'
import { Toaster } from '@/components/ui/sonner'
import { useAmountsHidden } from './lib/privacy'
import { useTheme } from './lib/theme'

// Re-renders the whole app when "hide amounts" is switched, so every formatted RM figure updates
export default function Root() {
  useAmountsHidden()
  const { dark } = useTheme() // chart colours etc. are read during render
  return (
    <>
      <App />
      {/* on phones, sit above the floating tab bar */}
      <Toaster theme={dark ? 'dark' : 'light'} position="bottom-center" mobileOffset={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }} />
    </>
  )
}
