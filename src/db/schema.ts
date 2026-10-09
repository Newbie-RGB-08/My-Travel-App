import Dexie, { type Table } from 'dexie'
import type {
  Activity,
  Attachment,
  Expense,
  Guide,
  MapMark,
  Route,
  Transport,
  Trip,
  User,
} from '@/types'
import { getOwnerId } from './ownerContext'

// 应用数据库。test 环境下 db 名称可被 fake-indexeddb 接管。
export class TravelDB extends Dexie {
  users!: Table<User, string>
  trips!: Table<Trip, string>
  activities!: Table<Activity, string>
  transports!: Table<Transport, string>
  expenses!: Table<Expense, string>
  guides!: Table<Guide, string>
  mapMarks!: Table<MapMark, string>
  routes!: Table<Route, string>
  attachments!: Table<Attachment, string>

  constructor(name = 'my-travel-db') {
    super(name)
    // v1：无账号体系（历史版本）
    this.version(1).stores({
      trips: 'id, status, startDate, endDate',
      activities: 'id, tripId, date, slot',
      transports: 'id, tripId, type, departAt, status',
      expenses: 'id, tripId, activityId, category, time',
      guides: 'id, destination, category, favorite, tripId',
      mapMarks: 'id, tripId, type',
      routes: 'id, tripId',
      attachments: 'id, createdAt',
    })
    // v2：登录与多账号数据隔离。
    // 不做批量改数升级（无主数据归属在"首个账号注册"时一次性迁移）。
    this.version(2)
      .stores({
        users: 'id, &phone, createdAt',
        trips: 'id, ownerId, status, startDate, endDate, [ownerId+status]',
        activities:
          'id, ownerId, tripId, date, slot, [ownerId+tripId], [ownerId+date]',
        transports:
          'id, ownerId, tripId, type, departAt, status, [ownerId+tripId]',
        expenses:
          'id, ownerId, tripId, activityId, category, time, [ownerId+tripId], [ownerId+activityId]',
        guides:
          'id, ownerId, destination, category, favorite, tripId, [ownerId+tripId]',
        mapMarks: 'id, ownerId, tripId, type, [ownerId+tripId]',
        routes: 'id, ownerId, tripId, [ownerId+tripId]',
        attachments: 'id, ownerId, createdAt',
      })
      .upgrade(async (tx) => {
        // 结构性升级占位：保留旧数据原样（ownerId 为空 = 无主，注册首账号时迁移）
        await tx.table('users').toCollection().count()
      })

    // 写入钩子：新增数据自动注入当前账号 ownerId。
    // 测试与业务代码的 add 调用无需感知该字段。
    const injectOwner = (owner: string | null, obj: Record<string, unknown>) => {
      if (owner && obj.ownerId === undefined) obj.ownerId = owner
      return obj
    }
    const tables = [
      'trips',
      'activities',
      'transports',
      'expenses',
      'guides',
      'mapMarks',
      'routes',
      'attachments',
    ] as const
    for (const t of tables) {
      const table = this.table<Record<string, unknown>, string>(t)
      table.hook('creating', (_primKey, obj) => {
        injectOwner(getOwnerId(), obj)
      })
    }
  }
}

// 默认实例；测试里可直接 import 后用 fake-indexeddb 替换底层
export const db = new TravelDB()

// 测试辅助：重置数据库（清空所有表）
export async function resetDB(): Promise<void> {
  await Promise.all([
    db.users.clear(),
    db.trips.clear(),
    db.activities.clear(),
    db.transports.clear(),
    db.expenses.clear(),
    db.guides.clear(),
    db.mapMarks.clear(),
    db.routes.clear(),
    db.attachments.clear(),
  ])
}
