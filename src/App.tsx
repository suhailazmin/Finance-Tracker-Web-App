import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import Layout from './components/Layout'
import Account from './pages/Account'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Rules from './pages/Rules'
import Transactions from './pages/Transactions'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/account" element={<Account />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
