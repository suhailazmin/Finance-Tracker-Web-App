import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import Layout from './components/Layout'
import Account from './pages/Account'
import Budgets from './pages/Budgets'
import Categories from './pages/Categories'
import Dashboard from './pages/Dashboard'
import Goals from './pages/Goals'
import Import from './pages/Import'
import Login from './pages/Login'
import Rules from './pages/Rules'
import Transactions from './pages/Transactions'
import { hideSplash } from './lib/splash'

function App() {
  const { loading } = useAuth()
  // the splash in index.html stays up until we know whether you are signed in
  useEffect(() => {
    if (!loading) hideSplash()
  }, [loading])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/import" element={<Import />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/account" element={<Account />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
