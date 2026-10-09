import { db } from '@/db/schema'
import { hashPassword } from '@/db/auth'
import { setOwnerId } from '@/db/ownerContext'
import { useAuthStore } from '@/store/useAuthStore'

export const TEST_PHONE = '13800000000'

/**
 * 测试统一登录前置：确保存在测试账号并处于登录态。
 * 在 resetDB() 之后调用。直插 users 表（绕过注册流程），
 * 随后设置 ownerContext 与 auth store，使钩子为测试数据注入 ownerId。
 */
export async function ensureTestSession(): Promise<string> {
  let user = await db.users.where('phone').equals(TEST_PHONE).first()
  if (!user) {
    const salt = '0'.repeat(32)
    user = {
      id: 'test-user',
      phone: TEST_PHONE,
      passwordHash: await hashPassword('test123', salt),
      salt,
      createdAt: Date.now(),
    }
    await db.users.add(user)
  }
  setOwnerId(user.id)
  useAuthStore.setState({
    currentUser: { id: user.id, phone: user.phone },
  })
  return user.id
}
