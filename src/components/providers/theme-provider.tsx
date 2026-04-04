'use client'
import { createContext, useContext, ReactNode } from 'react'

type Theme = 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  return ctx
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Hardcoded to light mode as per MD3 requested design requirement
  const contextValue: ThemeContextType = {
    theme: 'light',
    toggleTheme: () => {},
    setTheme: () => {},
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}
