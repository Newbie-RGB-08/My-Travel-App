import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { ModalHost } from '@/components/common/ModalHost'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { AmbientBackground } from '@/components/common/AmbientBackground'

export function AppLayout() {
  return (
    <div className="relative flex h-full w-full">
      <AmbientBackground />
      <Sidebar />
      {/* 手机端底部悬浮胶囊导航占位：留出安全区高度，避免遮挡内容 */}
      <main className="relative z-10 flex-1 overflow-auto pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        <Outlet />
      </main>
      <MobileNav />
      <ModalHost />
      <ConfirmDialog />
    </div>
  )
}
