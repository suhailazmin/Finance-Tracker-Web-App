import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  label: string
  value: string
  icon: LucideIcon
  detail?: string
  // colour of the matching chart series; tints the icon so it doubles as a chart key
  keyColor?: string
}

export default function StatTile({ label, value, icon: Icon, detail, keyColor }: Props) {
  return (
    <Card size="sm" className="gap-1">
      <CardHeader>
        <CardDescription className="flex items-center justify-between gap-2">
          {label}
          <Icon
            className="size-4 shrink-0"
            style={keyColor ? { color: keyColor } : undefined}
            aria-hidden="true"
          />
        </CardDescription>
        <CardTitle className="text-lg font-semibold tabular-nums sm:text-xl">{value}</CardTitle>
      </CardHeader>
      {detail && (
        <CardContent>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </CardContent>
      )}
    </Card>
  )
}
