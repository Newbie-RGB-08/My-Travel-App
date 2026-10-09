import { LogOut, UserRound } from 'lucide-react'

import { useAuthStore } from '@/store/useAuthStore'
import { useModalStore } from '@/store/useModalStore'

export default function Settings() {
  const { currentUser, logout } = useAuthStore()
  const { openConfirm } = useModalStore()

  const handleLogout = () => {
    if (!currentUser) return
    openConfirm({
      title: '退出登录',
      message: `退出当前账号 ${currentUser.phone}？退出后需重新登录才能查看该账号的数据。`,
      confirmLabel: '确认退出',
      danger: true,
      onConfirm: () => void logout(),
    })
  }

  return (
    <div className="px-6 py-6">
      <h1 className="text-xl font-semibold text-fg-1">设置</h1>

      {/* 账号 */}
      <section className="card mt-4 p-4" data-testid="account-section">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/15">
            <UserRound className="h-5 w-5 text-brand-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-fg-1">当前账号</div>
            <div className="text-xs text-fg-2" data-testid="current-phone">
              {currentUser ? currentUser.phone : '未登录'}
            </div>
          </div>
          {currentUser && (
            <button
              type="button"
              className="btn-secondary text-danger"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          )}
        </div>
      </section>

      {/* 数据说明（保留原说明文案） */}
      <section className="card mt-3 p-4">
        <div className="text-sm font-medium text-fg-1">数据存储</div>
        <p className="mt-1 text-xs text-fg-2">
          数据保存在浏览器本地 IndexedDB，关闭/重启后不丢。不同账号的数据相互隔离，各自独立保存。
        </p>
      </section>
    </div>
  )
}
