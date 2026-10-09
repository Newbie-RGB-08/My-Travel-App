import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getUserById, loginUser, registerUser } from '@/db/auth'
import { setOwnerId } from '@/db/ownerContext'

// 当前登录用户（只保留非敏感字段）
export interface AuthUser {
  id: string
  phone: string
}

interface AuthState {
  currentUser: AuthUser | null
  register: (phone: string, code: string, password: string) => Promise<void>
  login: (phone: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** 启动时恢复登录态：校验用户仍存在，并同步 ownerContext */
  restoreSession: () => Promise<void>
}

function syncOwner(user: AuthUser | null): void {
  setOwnerId(user?.id ?? null)
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,

      register: async (phone, code, password) => {
        const user = await registerUser({ phone, code, password })
        const u: AuthUser = { id: user.id, phone: user.phone }
        set({ currentUser: u })
        syncOwner(u)
      },

      login: async (phone, password) => {
        const user = await loginUser({ phone, password })
        const u: AuthUser = { id: user.id, phone: user.phone }
        set({ currentUser: u })
        syncOwner(u)
      },

      logout: async () => {
        set({ currentUser: null })
        syncOwner(null)
      },

      restoreSession: async () => {
        const cur = get().currentUser
        if (!cur) {
          syncOwner(null)
          return
        }
        const user = await getUserById(cur.id)
        if (!user || user.phone !== cur.phone) {
          // 登录态指向的用户已不存在（如清库），视为未登录
          set({ currentUser: null })
          syncOwner(null)
          return
        }
        syncOwner(cur)
      },
    }),
    {
      name: 'my-travel-auth',
      partialize: (s) => ({ currentUser: s.currentUser }),
    },
  ),
)
