import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { startOfMonth } from 'date-fns'
import {
  ChevronDown,
  CloudOff,
  LayoutDashboard,
  Ellipsis,
  LogOut,
  Moon,
  PiggyBank,
  Plus,
  ReceiptText,
  Repeat,
  Shapes,
  Sun,
  Upload,
  Target,
  UserRound,
  WandSparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import ConfirmDialog from './ConfirmDialog'
import HideAmountsButton from './HideAmountsButton'
import { runRecurringOnce } from '../lib/recurringRunner'
import { useOnline } from '../lib/online'
import { setThemePref, useTheme } from '../lib/theme'
import { flushOutbox, usePending } from '../lib/outbox'
import { refreshAll } from '../lib/refresh'
import { toast } from 'sonner'
import PageLoading from './PageLoading'
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
import { useBudgets } from '../hooks/useBudgets'
import monetraIcon from '../assets/monetra-icon.png'
import { friendlyError } from '../lib/errors'

// One name per page, used in the sidebar, the phone tab bar, the More menu and the page title
const links = [
  { to: '/', label: 'Dashboard', hint: 'Your month at a glance', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', hint: 'Everything you earned and spent', icon: ReceiptText },
  { to: '/budgets', label: 'Budgets', hint: 'Monthly spending limits', icon: Target },
  { to: '/goals', label: 'Savings goals', hint: 'What you’re saving towards', icon: PiggyBank },
  { to: '/recurring', label: 'Recurring', hint: 'Salary, rent and bills each month', icon: Repeat },
  { to: '/import', label: 'Import statement', hint: 'Add transactions from a bank CSV', icon: Upload },
  { to: '/categories', label: 'Categories', hint: 'Groups for spending and income', icon: Shapes },
  { to: '/rules', label: 'Auto-categorize', hint: 'Keywords that pick a category', icon: WandSparkles },
]
// phones: the first three are tabs, the rest (and Account) sit under "More"
const tabLinks = links.slice(0, 3)
const moreLinks = [...links.slice(3), { to: '/account', label: 'Account', hint: 'Password, appearance and your data', icon: UserRound }]

export default function Layout() {
  const { session } = useAuth()
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  const online = useOnline()
  const { dark } = useTheme()
  const pending = usePending(session?.user.id)

  useEffect(() => {
    // add any recurring items that have come due (once per app launch)
    runRecurringOnce()
    // send anything added offline last time
    void flushOutbox()

    async function onOnline() {
      const sent = await flushOutbox()
      if (sent === 0) await refreshAll() // flushOutbox already refreshed if it sent something
      toast.success('Back online', {
        description: sent ? `Added ${sent} transaction${sent === 1 ? '' : 's'} you saved offline.` : 'Showing the latest data.',
      })
    }
    function onOffline() {
      toast('You’re offline', { description: 'Showing your last saved data. New transactions will sync when you’re back.' })
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])
  const email = session?.user.email ?? ''
  const { pathname } = useLocation()
  const moreActive = moreLinks.some((l) => pathname.startsWith(l.to))

  return (
    <div className="app-backdrop min-h-svh">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border/70 bg-card/80 px-4 py-6 backdrop-blur-md lg:flex">
        <Link to="/" className="flex items-center gap-2.5 px-2 text-xl font-extrabold tracking-tight text-brand-forest dark:text-primary">
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

        {/* re-checked on every page change, so it goes away once a budget is set */}
        {pathname !== '/budgets' && <BudgetTip key={pathname} />}
      </aside>

      <div className="lg:pl-64">
        {/* ---------- Top bar: green on phones, light on desktop ---------- */}
        <header className="sticky top-0 z-10 bg-brand-forest pt-[env(safe-area-inset-top)] text-white lg:border-b lg:border-border/70 lg:bg-card/70 lg:text-foreground lg:backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 lg:px-8">
            <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight lg:hidden">
              <img src={monetraIcon} alt="" width={36} height={36} className="size-9 rounded-full bg-white/90 p-0.5" />
              Monetra
            </Link>
            <p className="hidden text-sm text-muted-foreground lg:block">
              Welcome back{email ? ',' : ''} <span className="font-bold text-foreground">{email.split('@')[0]}</span>
            </p>

            <div className="flex items-center gap-1">
              {(!online || pending.length > 0) && (
                <span
                  role="status"
                  title={online ? 'Waiting to send transactions added offline' : 'No connection: showing your last saved data'}
                  className="mr-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold whitespace-nowrap lg:bg-brand-orange/20 lg:text-brand-orange-ink"
                >
                  <CloudOff className="size-3.5" aria-hidden="true" />
                  {/* phones: icon + count only, so the header doesn't overflow */}
                  <span className="sr-only sm:not-sr-only">
                    {online ? '' : 'Offline'}
                    {pending.length > 0 && `${online ? '' : ' · '}${pending.length} to sync`}
                  </span>
                  {pending.length > 0 && (
                    <span className="sm:hidden" aria-hidden="true">
                      {pending.length}
                    </span>
                  )}
                </span>
              )}
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
                  <DropdownMenuItem onSelect={() => setThemePref(dark ? 'light' : 'dark')}>
                    {dark ? <Sun /> : <Moon />} {dark ? 'Light mode' : 'Dark mode'}
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
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* ---------- Phone: floating tab bar with the add button inside ---------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
        aria-label="Main"
      >
        <div className="mx-auto flex h-16 max-w-sm items-center justify-between rounded-full bg-brand-ink px-2 shadow-xl shadow-brand-ink/30 ring-1 ring-white/10">
          {tabLinks.slice(0, 2).map((l) => (
            <TabLink key={l.to} {...l} />
          ))}
          <Link
            to="/transactions#add"
            aria-label="Add transaction"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-orange text-brand-ink shadow-md shadow-black/20 transition-transform outline-none focus-visible:ring-3 focus-visible:ring-white/60 active:scale-95"
          >
            <Plus className="size-6" strokeWidth={2.5} aria-hidden="true" />
          </Link>
          <TabLink {...tabLinks[2]} />
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'flex h-12 min-w-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-bold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-white/50',
                moreActive ? 'bg-white/12 text-brand-sage' : 'text-white/55 hover:text-white'
              )}
            >
              <Ellipsis className="size-5" aria-hidden="true" />
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" sideOffset={12} className="w-72 rounded-2xl p-1.5">
              {moreLinks.map(({ to, label, hint, icon: Icon }) => (
                <DropdownMenuItem key={to} asChild className="gap-3 rounded-xl px-2.5 py-2">
                  <Link to={to} aria-current={pathname.startsWith(to) ? 'page' : undefined}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                      <Icon className="size-[18px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        icon={LogOut}
        title="Sign out of Monetra?"
        description={
          pending.length > 0
            ? `${pending.length} transaction${pending.length === 1 ? '' : 's'} you added offline ${pending.length === 1 ? 'hasn’t' : 'haven’t'} synced yet. ${pending.length === 1 ? 'It stays' : 'They stay'} on this device and will sync next time you sign in here.`
            : 'You’ll need to sign in again to see your transactions, budgets and goals.'
        }
        confirmLabel="Sign out"
        destructive
        onConfirm={async () => {
          const { error } = await supabase.auth.signOut()
          return friendlyError(error) || undefined
        }}
      />
    </div>
  )
}

function TabLink({ to, label, icon: Icon }: (typeof links)[number]) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex h-12 min-w-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-white/50',
          isActive ? 'bg-white/12 text-brand-sage' : 'text-white/55 hover:text-white'
        )
      }
    >
      <Icon className="size-5" aria-hidden="true" />
      {label}
    </NavLink>
  )
}

// Sidebar tip, like a promo panel: shown only while this month has no budgets
function BudgetTip() {
  const [month] = useState(() => startOfMonth(new Date()))
  const { budgets, loading } = useBudgets(month)
  if (loading || budgets.length > 0) return null
  return (
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
  )
}
