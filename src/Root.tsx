import App from './App'
import { Toaster } from '@/components/ui/sonner'
import { useAmountsHidden } from './lib/privacy'

// Re-renders the whole app when "hide amounts" is switched, so every formatted RM figure updates
export default function Root() {
  useAmountsHidden()
  return (
    <>
      <App />
      {/* on phones, sit above the floating tab bar */}
      <Toaster position="bottom-center" mobileOffset={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }} />
    </>
  )
}
