import type { Table } from 'dexie'
import { db } from './schema'
import { getOwnerId } from './ownerContext'

// 读取侧账号收口：所有列表/单查必须经过这里，保证只返回当前账号的数据。

/** 当前账号的全表数据（未登录时返回全部——仅供无守卫的底层测试使用） */
export function ownerAll<T>(table: Table<T, string>): Promise<T[]> {
  const owner = getOwnerId()
  if (!owner) return table.toArray()
  return table.where('ownerId').equals(owner).toArray()
}

/** 当前账号 + 指定行程的数据（复合索引 [ownerId+tripId]） */
export function ownerByTrip<T extends { tripId: string | null }>(
  table: Table<T, string>,
  tripId: string,
): Promise<T[]> {
  const owner = getOwnerId()
  if (!owner) return table.where('tripId').equals(tripId).toArray()
  return table
    .where('[ownerId+tripId]')
    .equals([owner, tripId])
    .toArray()
}

/** 当前账号内按主键取单条；不属于当前账号时返回 undefined */
export function ownerGet<T>(
  table: Table<T, string>,
  id: string,
): Promise<T | undefined> {
  const owner = getOwnerId()
  // 用 then 而非 async/await：与 db.xx.get 保持相同的微任务时序，
  // 避免页面内多个 liveQuery 的解析顺序因额外跳数而翻转。
  return table.get(id).then((item) =>
    owner && item && (item as { ownerId?: string }).ownerId !== owner
      ? undefined
      : item,
  )
}

/** 当前账号的行程：按开始日期升序 */
export async function ownerTripsAsc(): Promise<
  import('@/types').Trip[]
> {
  const list = await ownerAll(db.trips)
  return list.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/** 当前账号的行程：按开始日期降序（列表页默认） */
export async function ownerTripsDesc(): Promise<
  import('@/types').Trip[]
> {
  const list = await ownerAll(db.trips)
  return list.sort((a, b) => b.startDate.localeCompare(a.startDate))
}
