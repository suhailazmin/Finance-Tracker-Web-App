import { OFFLINE_NAME } from './online'

// Turns database and network errors into a sentence that says what happened and what to do,
// instead of showing text like "duplicate key value violates unique constraint".

type ErrorLike = { message?: string; code?: string } | string | null | undefined

const RULES: { test: (message: string, code: string) => boolean; text: string }[] = [
  {
    test: (m) => m.startsWith(OFFLINE_NAME) || /failed to fetch|load failed|networkerror|network request failed/i.test(m),
    text: 'You’re offline or the connection dropped. Check your internet and try again.',
  },
  {
    test: (m, c) => c === 'PGRST301' || c === 'PGRST303' || /jwt|invalid claim|refresh token/i.test(m),
    text: 'Your sign-in has expired. Sign out, sign in again, then retry.',
  },
  {
    test: (m, c) => c === '23505' || /duplicate key|unique constraint/i.test(m),
    text: 'That already exists. Change the name or edit the existing one instead.',
  },
  {
    test: (m, c) => c === '23503' || /foreign key/i.test(m),
    text: 'Something it depends on was deleted, such as its category. Refresh the page and pick another.',
  },
  {
    test: (m, c) => c === '22003' || /numeric field overflow|out of range/i.test(m),
    text: 'That amount is too large. Amounts can be up to RM 9,999,999,999.99.',
  },
  {
    test: (m, c) => c === '23514' || /check constraint/i.test(m),
    text: 'One of the values isn’t allowed. Amounts must be above RM 0.',
  },
  {
    test: (m, c) => c === '22001' || /value too long/i.test(m),
    text: 'That text is too long. Shorten it and try again.',
  },
  {
    test: (m, c) => c === '42501' || /row-level security|permission denied/i.test(m),
    text: 'Monetra couldn’t save this to your account. Sign out and sign in again, then retry.',
  },
  {
    test: (m) => /rate limit|too many requests/i.test(m),
    text: 'Too many tries in a short time. Wait a minute and try again.',
  },
  {
    test: (m, c) => /^5\d\d$/.test(c) || /internal server error|bad gateway|service unavailable|timeout|timed out/i.test(m),
    text: 'Monetra’s server didn’t respond. Wait a moment and try again.',
  },
]

// keepUnknown: show messages no rule knows as they are (sign-in messages are already readable)
export function friendlyError(error: ErrorLike, { keepUnknown = false } = {}): string {
  if (!error) return ''
  const message = (typeof error === 'string' ? error : error.message) ?? ''
  const code = typeof error === 'string' ? '' : String(error.code ?? '')
  if (!message && !code) return ''
  const match = RULES.find((r) => r.test(message, code))
  if (match) return match.text
  if (keepUnknown && message) return message
  // unknown: still say what to do, and keep the original text for anyone reporting it
  return `Something went wrong. Try again, or refresh the page if it keeps happening. (${message || code})`
}
