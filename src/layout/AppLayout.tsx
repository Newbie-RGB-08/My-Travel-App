import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ModalHost } from '@/components/common/ModalHost'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

export function AppLayout() {
  return (
    <div className="flex h-full w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
      <ModalHost />
      <ConfirmDialog />
    </div>
  )
}
