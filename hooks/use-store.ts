// hooks/use-store.ts
import { useEffect, useState } from 'react'
import { subscribe, getCurrentUser, type AuthUser } from '@/lib/store'

export function useStore<T>(selector: () => T): T {
  const [value, setValue] = useState<T>(selector())

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setValue(selector())
    })
    return unsubscribe
  }, [selector])

  return value
}

export function useCurrentUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser())

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setUser(getCurrentUser())
    })
    return unsubscribe
  }, [])

  return user
}