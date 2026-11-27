import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Plus,
  ReceiptText,
  Shapes,
  Upload,
  Target,
  UserRound,
  WandSparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import ConfirmDialog from './ConfirmDialog'
import HideAmountsButton from './HideAmountsButton'
import PullToRefresh from './PullToRefresh'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import monetraIcon from '../assets/monetra-icon.png'

const links = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', short: 'Activity', icon: ReceiptText },
  { to: '/budgets', label: 'Budgets', short: 'Budgets', icon: Target },
  { to: '/goals', label: 'Savings goals', short: 'Goals', icon: PiggyBank },
  { to: '/categories', label: 'Categories', short: 'Categories', icon: Shapes },
  { to: '/rules', label: 'Auto-categorize', short: 'Rules', icon: WandSparkles },
]

export default function Layout() {
  const { session } = useAuth()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const email = session?.user.email ?? ''

  return (
    <div className="app-backdrop min-h-svh">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border/70 bg-white/80 px-4 py-6 backdrop-blur-md lg:flex">
        <Link to="/" className="flex items-center gap-2.5 px-2 text-xl font-extrabold tracking-tight text-brand-forest">
          <img src={monetraIcon} alt="" width={40} height={40} className="size-10" />
          Monetra
        </Link>

        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive
                    ? 'bg-primary font-bold text-primary-foreground shadow-md shadow-primary/20'
                    : 'font-semibold text-muted-foreground hover:bg-secondary hover:text-primary'
                )
              }
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Tip card, like a promo panel */}
        <div className="relative mt-auto overflow-hidden rounded-2xl bg-brand-ink p-4 text-white">
          <span className="pointer-events-none absolute -top-8 -right-8 size-28 rounded-full bg-white/5" aria-hidden="true" />
          <span className="pointer-events-none absolute -right-2 bottom-10 size-14 rounded-full bg-brand-orange/20" aria-hidden="true" />
          <img src={monetraIcon} alt="" width={44} height={44} className="relative size-11" />
          <p className="relative mt-3 text-sm font-bold">Stay on track</p>
          <p className="relative mt-1 text-xs leading-relaxed text-white/75">
            Set a monthly limit for each category and Monetra warns you before you overspend.
          </p>
          <Button asChild size="sm" className="relative mt-3 bg-brand-orange font-bold text-brand-ink hover:bg-brand-orange/90">
            <Link to="/budgets">Set budgets</Link>
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        {/* ---------- Top bar: green on phones, light on desktop ---------- */}
        <header className="sticky top-0 z-10 bg-primary pt-[env(safe-area-inset-top)] text-primary-foreground lg:border-b lg:border-border/70 lg:bg-white/70 lg:text-foreground lg:backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 lg:px-8">
            <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight lg:hidden">
              <img src={monetraIcon} alt="" width={36} height={36} className="size-9 rounded-full bg-white/90 p-0.5" />
              Monetra
            </Link>
            <p className="hidden text-sm text-muted-foreground lg:block">
              Welcome back{email ? ',' : ''} <span className="font-bold text-foreground">{email.split('@')[0]}</span>
            </p>

            <div className="flex items-center gap-1">
              <HideAmountsButton className="hover:bg-white/10 lg:text-muted-foreground lg:hover:bg-muted lg:hover:text-foreground" />
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-2 rounded-full p-1 pr-2 outline-none hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-ring/50 lg:hover:bg-muted"
                  aria-label="Account menu"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand-orange text-sm font-extrabold text-brand-ink uppercase">
                    {email.charAt(0) || '?'}
                  </span>
                  <span className="hidden max-w-48 truncate text-sm font-semibold sm:inline">{email}</span>
                  <ChevronDown className="size-4 opacity-70" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account">
                      <UserRound /> Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/import">
                      <Upload /> Import statement
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="lg:hidden">
                    <Link to="/categories">
                      <Shapes /> Categories
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="lg:hidden">
                    <Link to="/rules">
                      <WandSparkles /> Auto-categorize rules
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setConfirmSignOut(true)}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <PullToRefresh />

        <main className="mx-auto max-w-6xl px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:px-8 lg:pt-8 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* ---------- Phone: floating tab bar with the add button inside ---------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
        aria-label="Main"
      >
        <div className="mx-auto flex h-16 max-w-sm items-center justify-between rounded-full bg-brand-ink px-2 shadow-xl shadow-brand-ink/30 ring-1 ring-white/10">
          {links.slice(0, 2).map((l) => (
            <TabLink key={l.to} {...l} />
          ))}
          <Link
            to="/transactions#add"
            aria-label="Add transaction"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-orange text-brand-ink shadow-md shadow-black/20 transition-transform outline-none focus-visible:ring-3 focus-visible:ring-white/60 active:scale-95"
          >
            <Plus className="size-6" strokeWidth={2.5} aria-hidden="true" />
          </Link>
          {links.slice(2, 4).map((l) => (
            <TabLink key={l.to} {...l} />
          ))}
        </div>
      </nav>

      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        icon={LogOut}
        title="Sign out of Monetra?"
        description="You’ll need to sign in again to see your transactions, budgets and goals."
        confirmLabel="Sign out"
        destructive
        onConfirm={async () => {
          const { error } = await supabase.auth.signOut()
          return error?.message
        }}
      />
    </div>
  )
}

function TabLink({ to, short, icon: Icon }: (typeof links)[number]) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex h-12 w-14 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-bold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-white/50',
          isActive ? 'bg-white/12 text-brand-sage' : 'text-white/55 hover:text-white'
        )
      }
    >
      <Icon className="size-5" aria-hidden="true" />
      {short}
    </NavLink>
  )
}
