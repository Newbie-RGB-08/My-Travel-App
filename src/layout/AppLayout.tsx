import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ModalHost } from '@/components/common/ModalHost'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { AmbientBackground } from '@/components/common/AmbientBackground'

export function AppLayout() {
  return (
    <div className="relative flex h-full w-full">
      <AmbientBackground />
      <Sidebar />
      <main className="relative z-10 flex-1 overflow-auto">
        <Outlet />
      </main>
      <ModalHost />
      <ConfirmDialog />
    </div>
  )
}
