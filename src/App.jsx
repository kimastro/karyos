import { useState, useEffect } from 'react'
import Lock      from './components/Lock'
import Dashboard from './components/Dashboard'
import { UserContext } from './lib/UserContext'
import { startPresence } from './lib/presence'

export default function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!user) return
    return startPresence(user.id)
  }, [user])

  return (
    <UserContext.Provider value={user}>
      {user ? <Dashboard /> : <Lock onUnlock={setUser} />}
    </UserContext.Provider>
  )
}
