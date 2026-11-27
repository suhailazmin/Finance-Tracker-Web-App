import { SunMoon } from 'lucide-react'
import SectionCard from './SectionCard'
import SegmentedControl from './SegmentedControl'
import { setThemePref, useTheme, type ThemePref } from '../lib/theme'

// Account page: Light / Dark / System (follows the phone or computer setting)
export default function AppearanceCard() {
  const { pref, dark } = useTheme()
  return (
    <SectionCard title="Appearance" description="Saved on this device." icon={SunMoon}>
      <SegmentedControl
        label="Theme"
        className="sm:max-w-sm"
        value={pref}
        onChange={(v: ThemePref) => setThemePref(v)}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'system', label: 'System' },
        ]}
      />
      {pref === 'system' && (
        <p className="mt-2 text-xs text-muted-foreground">
          Following your device, which is set to {dark ? 'dark' : 'light'} right now.
        </p>
      )}
    </SectionCard>
  )
}
