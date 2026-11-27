import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { refreshAll } from '../lib/refresh'
import monetraIcon from '../assets/monetra-icon.png'

const THRESHOLD = 72 // indicator travel (after resistance) needed to trigger a refresh
const MAX_PULL = 120
const RESTING = 64 // where the indicator sits while refreshing
const RESISTANCE = 0.5 // the indicator moves half as far as the finger
const MIN_SPIN_MS = 700 // keep the spinner up long enough to be noticed

// Phone pull-to-refresh: pull down at the top of any page and the squirrel slides out from
// under the header; let go past the threshold and every page's data reloads in place.
// The browser's own bounce/refresh is turned off on phones (see index.css), so this replaces it.
export default function PullToRefresh() {
  const [pull, setPull] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const gesture = useRef({ startY: 0, active: false, pull: 0, refreshing: false })

  useEffect(() => {
    const phone = window.matchMedia('(max-width: 1023px)')

    // don't hijack typing, open dialogs or menus
    function blocked(target: EventTarget | null) {
      if (!(target instanceof Element)) return true
      if (target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="menu"]')) {
        return true
      }
      return document.body.style.pointerEvents === 'none' // Radix sets this while a dialog or menu is open
    }

    function onStart(e: TouchEvent) {
      const g = gesture.current
      if (!phone.matches || g.refreshing || e.touches.length !== 1 || window.scrollY > 0 || blocked(e.target)) return
      g.startY = e.touches[0].clientY
      g.active = true
      g.pull = 0
    }

    function onMove(e: TouchEvent) {
      const g = gesture.current
      if (!g.active) return
      if (window.scrollY > 0) {
        g.active = false
        return
      }
      const next = Math.min(MAX_PULL, Math.max(0, (e.touches[0].clientY - g.startY) * RESISTANCE))
      if (next === g.pull) return
      g.pull = next
      setDragging(true)
      setPull(next)
    }

    async function onEnd() {
      const g = gesture.current
      if (!g.active) return
      g.active = false
      setDragging(false)
      if (g.pull >= THRESHOLD) {
        g.refreshing = true
        setRefreshing(true)
        setPull(RESTING)
        const started = performance.now()
        await refreshAll()
        const left = MIN_SPIN_MS - (performance.now() - started)
        if (left > 0) await new Promise((resolve) => window.setTimeout(resolve, left))
        g.refreshing = false
        setRefreshing(false)
      }
      g.pull = 0
      setPull(0)
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  const progress = Math.min(1, pull / THRESHOLD)
  const ready = progress >= 1 && !refreshing

  return (
    <>
      {/* sits just under the header (z-10) and slides down from behind it */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none fixed left-1/2 z-[9] lg:hidden',
          !dragging && 'transition-transform duration-300 ease-out'
        )}
        style={{ top: 'calc(4rem + env(safe-area-inset-top))', transform: `translate(-50%, ${pull - 56}px)` }}
      >
        <div
          className={cn(
            'flex size-11 items-center justify-center rounded-full bg-card shadow-lg ring-1 ring-border transition-[opacity,scale] duration-200',
            pull > 0 || refreshing ? 'opacity-100' : 'opacity-0',
            ready && 'scale-110'
          )}
        >
          <img
            src={monetraIcon}
            alt=""
            width={32}
            height={32}
            className={cn('size-8', refreshing && 'motion-safe:animate-spin')}
            style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)`, opacity: 0.45 + progress * 0.55 }}
          />
        </div>
      </div>
      <p role="status" className="sr-only">
        {refreshing ? 'Refreshing…' : ''}
      </p>
    </>
  )
}
