// The splash screen lives in index.html so it shows before the app loads.
// The app calls hideSplash() once it knows whether you're signed in.

// Long enough for the intro animation to play; counted from when the page started loading
const MIN_VISIBLE_MS = 1600
const MIN_VISIBLE_REDUCED_MS = 400

export function hideSplash() {
  const splash = document.getElementById('splash')
  if (!splash || splash.classList.contains('leaving')) return

  // already skipped for this session (see the script in index.html)
  if (document.documentElement.classList.contains('no-splash')) {
    splash.remove()
    return
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const wait = Math.max(0, (reduced ? MIN_VISIBLE_REDUCED_MS : MIN_VISIBLE_MS) - performance.now())

  window.setTimeout(() => {
    splash.classList.add('leaving')
    // fade-out lasts 0.45s (0.2s with Reduce Motion)
    window.setTimeout(() => splash.remove(), reduced ? 250 : 500)
  }, wait)
}
