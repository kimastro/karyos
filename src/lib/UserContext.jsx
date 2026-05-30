import { createContext, useContext } from 'react'

export const PROFILES = {
  yoe: { id: 'yoe', name: 'Yoe', avatar: '👧', color: '#c9a96e', password: import.meta.env.VITE_PASSWORD_YOE },
  kim: { id: 'kim', name: 'Kim', avatar: '👦', color: '#6b46c1', password: import.meta.env.VITE_PASSWORD_KIM },
}

export const UserContext = createContext(null)
export const useUser    = () => useContext(UserContext)
