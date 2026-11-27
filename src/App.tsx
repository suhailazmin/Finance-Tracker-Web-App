import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import Layout from './components/Layout'

// Each page is its own file, downloaded the first time it is opened, so launching only
// loads the shell and the page you land on (charts, CSV tools etc. come with their pages)
const Account = lazy(() => import('./pages/Account'))
const Budgets = lazy(() => import('./pages/Budgets'))
const Categories = lazy(() => import('./pages/Categories'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Goals = lazy(() => import('./pages/Goals'))
const Import = lazy(() => import('./pages/Import'))
const Recurring = lazy(() => import('./pages/Recurring'))
const Login = lazy(() => import('./pages/Login'))
const Rules = lazy(() => import('./pages/Rules'))
const Transactions = lazy(() => import('./pages/Transactions'))
import { hideSplash } from './lib/splash'

function App() {
  const { loading } = useAuth()
  // the splash in index.html stays up until we know whether you are signed in
  useEffect(() => {
    if (!loading) hideSplash()
  }, [loading])

  return (
    // pages inside Layout have their own Suspense, so the header and menu stay while a page loads
    <Suspense fallback={null}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/import" element={<Import />} />
          <Route path="/recurring" element={<Recurring />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/account" element={<Account />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

export default App
