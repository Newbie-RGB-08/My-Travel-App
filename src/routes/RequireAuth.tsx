import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

// 登录守卫：未登录一律回到 /login；已登录渲染 children
export function RequireAuth({ children }: { children: ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  return <>{children}</>
}
