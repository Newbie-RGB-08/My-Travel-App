import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'

import Settings from '@/pages/Settings'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { resetDB } from '@/db/schema'
import { ensureTestSession } from '@/test/helpers'
import { useAuthStore } from '@/store/useAuthStore'
import { useModalStore } from '@/store/useModalStore'
import { getOwnerId } from '@/db/ownerContext'

function renderPage() {
  return render(
    <MemoryRouter>
      <Settings />
      <ConfirmDialog />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await resetDB()
  await ensureTestSession()
  useModalStore.setState({ content: null })
  useModalStore.setState((s) => ({ confirm: { ...s.confirm, open: false } }))
})

describe('阶段 7：设置页', () => {
  it('显示当前登录手机号与数据说明', () => {
    renderPage()
    const cur = useAuthStore.getState().currentUser
    expect(screen.getByTestId('current-phone').textContent).toBe(cur!.phone)
    expect(screen.getByText(/数据保存在浏览器本地 IndexedDB/)).toBeInTheDocument()
  })

  it('退出登录：二次确认后清空登录态与归属', async () => {
    const user = userEvent.setup()
    renderPage()
    const before = useAuthStore.getState().currentUser
    expect(before).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /退出登录/ }))
    // 二次确认弹窗出现
    expect(screen.getByText(/退出当前账号/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认退出' }))

    expect(useAuthStore.getState().currentUser).toBeNull()
    expect(getOwnerId()).toBeNull()
  })

  it('退出登录：取消则保持登录态', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /退出登录/ }))
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(useAuthStore.getState().currentUser).not.toBeNull()
    expect(getOwnerId()).not.toBeNull()
  })
})
