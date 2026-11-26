import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, LogOut, PiggyBank, ReceiptText, Target, UserRound, WandSparkles, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/goals', label: 'Goals', icon: PiggyBank },
  { to: '/rules', label: 'Rules', icon: WandSparkles },
]

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4',
    isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  )

export default function Layout() {
  const { session } = useAuth()

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-2 font-semibold">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Wallet className="size-4" aria-hidden="true" />
              </span>
              Finance Tracker
            </span>
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden truncate text-muted-foreground sm:inline">{session?.user.email}</span>
              {/* icon-only on phones so the header stays one line */}
              <NavLink to="/account" className={navClass} aria-label="Account">
                <UserRound aria-hidden="true" />
                <span className="hidden sm:inline">Account</span>
              </NavLink>
              <Button variant="outline" onClick={() => supabase.auth.signOut()} aria-label="Sign out">
                <LogOut aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
          {/* Own row so it fits a phone; scrolls sideways if more links are added */}
          <nav className="-mx-2.5 flex gap-1 overflow-x-auto pb-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end className={navClass}>
                <Icon aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
