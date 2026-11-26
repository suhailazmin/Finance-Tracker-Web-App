import { createElement } from 'react'
import {
  Banknote,
  BriefcaseBusiness,
  Car,
  Clapperboard,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Category } from '../lib/types'

// Picks an icon from the category's name; anything unrecognised gets a tag
const rules: [RegExp, LucideIcon][] = [
  [/grocer|market|mart/i, ShoppingBasket],
  [/petrol|fuel|gas/i, Fuel],
  [/food|eat|dining|restaurant|makan|coffee|drink/i, Utensils],
  [/bill|utilit|phone|internet|electric|water/i, Receipt],
  [/transport|grab|taxi|car|parking|toll|bus|train/i, Car],
  [/shop|cloth|fashion/i, ShoppingBag],
  [/health|medic|doctor|clinic|pharma|hospital/i, HeartPulse],
  [/rent|house|home|mortgage/i, House],
  [/travel|trip|holiday|flight/i, Plane],
  [/entertain|movie|game|fun|stream/i, Clapperboard],
  [/educat|school|course|tuition|book/i, GraduationCap],
  [/gift|donat|charity|zakat/i, Gift],
  [/salary|wage|pay/i, Banknote],
  [/freelance|business|side/i, BriefcaseBusiness],
  [/invest|dividend|interest/i, TrendingUp],
]

function iconFor(category?: Category): LucideIcon {
  if (!category) return Tag
  return rules.find(([re]) => re.test(category.name))?.[1] ?? Tag
}

// Tinted rounded square with the category's icon, in the category's own colour
export default function CategoryIcon({ category, className }: { category?: Category; className?: string }) {
  const color = category?.color ?? '#7b8a82'
  return (
    <span
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', className)}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, white)`, color }}
      aria-hidden="true"
    >
      {createElement(iconFor(category), { className: 'size-[18px]' })}
    </span>
  )
}
