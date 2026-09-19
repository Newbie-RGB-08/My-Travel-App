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
} from '@/types'

// 应用数据库。test 环境下 db 名称可被 fake-indexeddb 接管。
export class TravelDB extends Dexie {
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
  }
}

// 默认实例；测试里可直接 import 后用 fake-indexeddb 替换底层
export const db = new TravelDB()

// 测试辅助：重置数据库（清空所有表）
export async function resetDB(): Promise<void> {
  await Promise.all([
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
