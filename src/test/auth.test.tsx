import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db, resetDB } from '@/db/schema'
import {
  AuthError,
  MOCK_SMS_CODE,
  hashPassword,
  isValidPhone,
  loginUser,
  registerUser,
} from '@/db/auth'
import { setOwnerId, getOwnerId } from '@/db/ownerContext'
import { ownerAll, ownerByTrip, ownerGet } from '@/db/scope'
import * as crud from '@/db/crud'
import type { NewTrip, Trip, MapMark } from '@/types'

beforeEach(async () => {
  setOwnerId(null)
  await resetDB()
})

describe('密码哈希', () => {
  it('相同 salt+密码 哈希一致；不同 salt 哈希不同', async () => {
    const h1 = await hashPassword('abc123', 'salt-a')
    const h2 = await hashPassword('abc123', 'salt-a')
    const h3 = await hashPassword('abc123', 'salt-b')
    expect(h1).toBe(h2)
    expect(h1).not.toBe(h3)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('手机号校验', () => {
  it('合法 11 位 1 开头通过，其它拒绝', () => {
    expect(isValidPhone('13812345678')).toBe(true)
    expect(isValidPhone('23812345678')).toBe(false)
    expect(isValidPhone('1381234567')).toBe(false)
    expect(isValidPhone('138123456789')).toBe(false)
    expect(isValidPhone('')).toBe(false)
  })
})

describe('注册', () => {
  it('校验失败：格式错误 / 验证码错 / 重复注册', async () => {
    await expect(
      registerUser({ phone: '123', code: MOCK_SMS_CODE, password: 'abc123' }),
    ).rejects.toMatchObject({ code: 'phone-invalid' })

    await expect(
      registerUser({ phone: '13812345678', code: '000000', password: 'abc123' }),
    ).rejects.toMatchObject({ code: 'code-wrong' })

    await registerUser({
      phone: '13812345678',
      code: MOCK_SMS_CODE,
      password: 'abc123',
    })
    await expect(
      registerUser({
        phone: '13812345678',
        code: MOCK_SMS_CODE,
        password: 'xyz789',
      }),
    ).rejects.toMatchObject({ code: 'phone-exists' })
  })

  it('注册成功：手机号唯一、密码以哈希+salt 存储（无明文）', async () => {
    const user = await registerUser({
      phone: '13812345678',
      code: MOCK_SMS_CODE,
      password: 'abc123',
    })
    const all = await db.users.toArray()
    expect(all).toHaveLength(1)
    expect(all[0]!.phone).toBe('13812345678')
    expect(all[0]!.passwordHash).toMatch(/^[0-9a-f]{64}$/)
    expect(all[0]!.salt).toMatch(/^[0-9a-f]{32}$/)
    expect(JSON.stringify(all[0])).not.toContain('abc123')
    expect(user.id).toBeTruthy()
  })

  it('首个注册账号继承全部无主历史数据', async () => {
    // 预置无主数据（ownerContext 为空，钩子不注入 ownerId）
    const t: NewTrip = {
      name: '旧行程',
      destination: '北京',
      startDate: '2026-01-01',
      endDate: '2026-01-03',
      companions: [],
      budget: 1000,
      status: 'planning',
    }
    // ownerId 不写：ownerContext 为空时 creating 钩子不注入，保持无主状态
    await db.trips.add({ ...t, id: 'trip-old', createdAt: Date.now() } as Trip)
    await db.mapMarks.add({
      id: 'mark-old',
      tripId: 'trip-old',
      name: '旧标注',
      type: 'sight',
      lat: 1,
      lng: 2,
      note: '',
    } as MapMark)

    const user = await registerUser({
      phone: '13812345678',
      code: MOCK_SMS_CODE,
      password: 'abc123',
    })

    const trip = await db.trips.get('trip-old')
    const mark = await db.mapMarks.get('mark-old')
    expect(trip?.ownerId).toBe(user.id)
    expect(mark?.ownerId).toBe(user.id)
  })

  it('第二个账号注册时不再迁移（首个账号数据保持归属）', async () => {
    const first = await registerUser({
      phone: '13812345678',
      code: MOCK_SMS_CODE,
      password: 'abc123',
    })
    setOwnerId(first.id)
    await db.trips.add({
      id: 'trip-first',
      name: '首账号行程',
      destination: '',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      companions: [] as string[],
      budget: 0,
      status: 'planning',
    } as Trip)
    setOwnerId(null)

    await registerUser({
      phone: '13998765432',
      code: MOCK_SMS_CODE,
      password: 'xyz789',
    })

    const trip = await db.trips.toArray()
    expect(trip).toHaveLength(1)
    expect(trip[0]!.ownerId).toBe(first.id)
  })
})

describe('登录', () => {
  it('未注册手机号 / 密码错误 / 正确登录', async () => {
    await registerUser({
      phone: '13812345678',
      code: MOCK_SMS_CODE,
      password: 'abc123',
    })

    await expect(
      loginUser({ phone: '13900000000', password: 'abc123' }),
    ).rejects.toMatchObject({ code: 'phone-not-found' })

    await expect(
      loginUser({ phone: '13812345678', password: 'wrong!' }),
    ).rejects.toMatchObject({ code: 'password-wrong' })

    const user = await loginUser({ phone: '13812345678', password: 'abc123' })
    expect(user.phone).toBe('13812345678')
  })
})

describe('ownerContext', () => {
  it('set/get 正确读写', () => {
    expect(getOwnerId()).toBeNull()
    setOwnerId('u1')
    expect(getOwnerId()).toBe('u1')
    setOwnerId(null)
    expect(getOwnerId()).toBeNull()
  })
})

describe('AuthError', () => {
  it('携带 code 且为 Error 实例', () => {
    const e = new AuthError('phone-exists')
    expect(e).toBeInstanceOf(Error)
    expect(e.code).toBe('phone-exists')
  })
})

describe('多账号数据隔离', () => {
  const newTrip = (name: string): NewTrip => ({
    name,
    destination: '',
    startDate: '2026-10-01',
    endDate: '2026-10-02',
    companions: [],
    budget: 0,
    status: 'planning',
  })

  it('A/B 账号列表与单查互不可见', async () => {
    const a = await registerUser({
      phone: '13812345678',
      code: MOCK_SMS_CODE,
      password: 'abc123',
    })
    setOwnerId(a.id)
    const tripA = await crud.addTrip(newTrip('A的行程'))
    expect((await ownerAll(db.trips)).map((t) => t.name)).toEqual(['A的行程'])

    const b = await registerUser({
      phone: '13912345678',
      code: MOCK_SMS_CODE,
      password: 'xyz789',
    })
    setOwnerId(b.id)

    // B 看不到 A 的数据
    expect(await ownerAll(db.trips)).toEqual([])
    expect(await ownerGet(db.trips, tripA.id)).toBeUndefined()
    expect(await crud.getTrip(tripA.id)).toBeUndefined()

    // B 自己写入后只看到自己的
    await crud.addTrip(newTrip('B的行程'))
    const bTrips = await ownerAll(db.trips)
    expect(bTrips).toHaveLength(1)
    expect(bTrips[0]!.name).toBe('B的行程')
  })

  it('ownerByTrip 按 [ownerId+tripId] 隔离', async () => {
    const a = await registerUser({
      phone: '13812345678',
      code: MOCK_SMS_CODE,
      password: 'abc123',
    })
    setOwnerId(a.id)
    const tripA = await crud.addTrip(newTrip('A的行程'))
    await crud.addActivity({
      tripId: tripA.id,
      date: '2026-10-01',
      slot: 'morning',
      time: null,
      place: '故宫',
      type: 'sight',
      note: '',
      linkedExpenseIds: [],
      linkedTransportIds: [],
      linkedGuideIds: [],
    })
    expect(await ownerByTrip(db.activities, tripA.id)).toHaveLength(1)

    const b = await registerUser({
      phone: '13912345678',
      code: MOCK_SMS_CODE,
      password: 'xyz789',
    })
    setOwnerId(b.id)
    // B 用同一个 tripId 也查不到 A 的活动
    expect(await ownerByTrip(db.activities, tripA.id)).toEqual([])

    // B 自己的行程+活动正常可见
    const tripB = await crud.addTrip(newTrip('B的行程'))
    await crud.addActivity({
      tripId: tripB.id,
      date: '2026-10-01',
      slot: 'morning',
      time: null,
      place: '长城',
      type: 'sight',
      note: '',
      linkedExpenseIds: [],
      linkedTransportIds: [],
      linkedGuideIds: [],
    })
    const bActs = await ownerByTrip(db.activities, tripB.id)
    expect(bActs).toHaveLength(1)
    expect(bActs[0]!.place).toBe('长城')
  })
})
