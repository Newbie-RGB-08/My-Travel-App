import { db } from './schema'
import type { User } from '@/types'

// ===== 业务错误（UI 层据此映射中文提示） =====
export type AuthErrorCode =
  | 'phone-invalid' // 手机号格式错误
  | 'phone-exists' // 手机号已注册
  | 'code-wrong' // 验证码错误
  | 'phone-not-found' // 手机号未注册
  | 'password-wrong' // 密码错误

export class AuthError extends Error {
  code: AuthErrorCode
  constructor(code: AuthErrorCode) {
    super(code)
    this.code = code
    this.name = 'AuthError'
  }
}

// ===== 模拟短信验证码（纯本地，不真实发送） =====
// 第一版固定验证码并在注册界面明文提示，方便自测。
export const MOCK_SMS_CODE = '123456'

export async function sendSmsCode(_phone: string): Promise<void> {
  // 本地模拟：无需网络与真实发送。参数保留以贴近真实签名。
  void _phone
}

// ===== 密码哈希（Web Crypto：SHA-256(salt + password)，不存明文） =====
function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function randomSaltHex(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes.buffer)
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  return sha256Hex(salt + password)
}

async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const actual = await hashPassword(password, salt)
  return actual === expectedHash
}

// ===== 手机号校验（中国大陆 11 位，1 开头） =====
export function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone)
}

// ===== 注册 =====
export interface RegisterInput {
  phone: string
  code: string
  password: string
}

export async function registerUser(input: RegisterInput): Promise<User> {
  const phone = input.phone.trim()
  if (!isValidPhone(phone)) throw new AuthError('phone-invalid')
  if (input.code !== MOCK_SMS_CODE) throw new AuthError('code-wrong')

  const existed = await db.users.where('phone').equals(phone).first()
  if (existed) throw new AuthError('phone-exists')

  const salt = randomSaltHex()
  const passwordHash = await hashPassword(input.password, salt)
  const user: User = {
    id: crypto.randomUUID(),
    phone,
    passwordHash,
    salt,
    createdAt: Date.now(),
  }

  // 是否为本机第一个账号：是则继承全部无主历史数据
  const userCount = await db.users.count()
  const isFirstUser = userCount === 0

  await db.transaction(
    'rw',
    [
      db.users,
      db.trips,
      db.activities,
      db.transports,
      db.expenses,
      db.guides,
      db.mapMarks,
      db.routes,
      db.attachments,
    ],
    async () => {
      await db.users.add(user)
      if (isFirstUser) await migrateOwnerlessData(user.id)
    },
  )
  return user
}

// 把所有"没有所属账号"的历史数据一次性划归指定账号（仅应在首个账号注册时执行一次）
async function migrateOwnerlessData(ownerId: string): Promise<void> {
  const names = [
    'trips',
    'activities',
    'transports',
    'expenses',
    'guides',
    'mapMarks',
    'routes',
    'attachments',
  ] as const
  for (const name of names) {
    const t = db.table<Record<string, unknown>, string>(name)
    await t
      .toCollection()
      .filter((rec) => !rec.ownerId)
      .modify({ ownerId })
  }
}

// ===== 登录 =====
export interface LoginInput {
  phone: string
  password: string
}

export async function loginUser(input: LoginInput): Promise<User> {
  const phone = input.phone.trim()
  const user = await db.users.where('phone').equals(phone).first()
  if (!user) throw new AuthError('phone-not-found')
  const ok = await verifyPassword(input.password, user.salt, user.passwordHash)
  if (!ok) throw new AuthError('password-wrong')
  return user
}

// ===== 登录态恢复辅助：按 id 取用户 =====
export async function getUserById(id: string): Promise<User | undefined> {
  return db.users.get(id)
}

// ===== 业务错误 → 中文提示（UI 层使用） =====
export function authErrorText(err: unknown): string {
  if (err instanceof AuthError) {
    switch (err.code) {
      case 'phone-invalid':
        return '手机号格式不正确，应为 11 位数字且以 1 开头'
      case 'phone-exists':
        return '该手机号已注册，请直接登录'
      case 'code-wrong':
        return '验证码错误，请重新输入'
      case 'phone-not-found':
        return '该手机号尚未注册，请先注册'
      case 'password-wrong':
        return '密码错误，请重试'
    }
  }
  return '操作失败，请重试'
}
