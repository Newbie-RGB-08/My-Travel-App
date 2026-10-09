import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db, resetDB } from '@/db/schema'
import { MOCK_SMS_CODE } from '@/db/auth'
import { getOwnerId } from '@/db/ownerContext'
import { useAuthStore } from '@/store/useAuthStore'
import type { Trip } from '@/types'

function resetStore(): void {
  useAuthStore.setState({ currentUser: null })
}

beforeEach(async () => {
  resetStore()
  await resetDB()
})

describe('useAuthStore', () => {
  it('注册成功：写入 currentUser 并同步 ownerContext（新增数据带 ownerId）', async () => {
    await useAuthStore
      .getState()
      .register('13812345678', MOCK_SMS_CODE, 'abc123')
    const cur = useAuthStore.getState().currentUser
    expect(cur?.phone).toBe('13812345678')
    expect(getOwnerId()).toBe(cur!.id)

    await db.trips.add({
      id: 't1',
      name: 'X',
      destination: '',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      companions: [] as string[],
      budget: 0,
      status: 'planning',
    } as Trip)
    expect((await db.trips.get('t1'))?.ownerId).toBe(cur!.id)
  })

  it('登录成功 / 密码错误', async () => {
    await useAuthStore
      .getState()
      .register('13812345678', MOCK_SMS_CODE, 'abc123')
    useAuthStore.setState({ currentUser: null })

    await useAuthStore.getState().login('13812345678', 'abc123')
    expect(useAuthStore.getState().currentUser?.phone).toBe('13812345678')

    useAuthStore.setState({ currentUser: null })
    await expect(
      useAuthStore.getState().login('13812345678', 'bad'),
    ).rejects.toMatchObject({ code: 'password-wrong' })
  })

  it('退出登录：清空 currentUser 与 ownerContext', async () => {
    await useAuthStore
      .getState()
      .register('13812345678', MOCK_SMS_CODE, 'abc123')
    await useAuthStore.getState().logout()
    expect(useAuthStore.getState().currentUser).toBeNull()
    expect(getOwnerId()).toBeNull()
  })

  it('restoreSession：用户存在恢复归属；用户不存在视为未登录', async () => {
    const { registerUser } = await import('@/db/auth')
    const user = await registerUser({
      phone: '13812345678',
      code: MOCK_SMS_CODE,
      password: 'abc123',
    })
    useAuthStore.setState({ currentUser: { id: user.id, phone: user.phone } })
    await useAuthStore.getState().restoreSession()
    expect(getOwnerId()).toBe(user.id)

    // 用户被删（清库后残留登录态）
    await resetDB()
    await useAuthStore.getState().restoreSession()
    expect(useAuthStore.getState().currentUser).toBeNull()
    expect(getOwnerId()).toBeNull()
  })
})
