import { db } from '@/db/schema'
import {
  ownerAll,
  ownerByTrip,
  ownerGet,
  ownerTripsDesc,
} from '@/db/scope'
import { getOwnerId } from '@/db/ownerContext'
import { uid } from '@/utils/id'
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
import type {
  NewActivity,
  NewAttachment,
  NewExpense,
  NewGuide,
  NewMapMark,
  NewRoute,
  NewTransport,
  NewTrip,
} from '@/types'

// ===== Trip =====
export async function listTrips(): Promise<Trip[]> {
  return ownerTripsDesc()
}
export async function getTrip(id: string): Promise<Trip | undefined> {
  return ownerGet(db.trips, id)
}
export async function addTrip(data: NewTrip): Promise<Trip> {
  // ownerId 由 schema 的 creating 钩子按当前登录账号自动注入，这里仅补齐其余字段
  const trip = { ...data, id: uid(), createdAt: Date.now() } as Trip
  await db.trips.add(trip)
  return trip
}
export async function updateTrip(
  id: string,
  patch: Partial<Trip>,
): Promise<Trip | undefined> {
  const owned = await getTrip(id)
  if (!owned) return undefined
  await db.trips.update(id, patch)
  return db.trips.get(id)
}
export async function removeTrip(id: string): Promise<void> {
  // 软关联解除：把子数据的 tripId 置 null，不删除子数据（仅限当前账号数据）
  const owned = await getTrip(id)
  if (!owned) return
  const owner = getOwnerId()
  if (owner) {
    await db.activities.where('[ownerId+tripId]').equals([owner, id]).modify({ tripId: null })
    await db.transports.where('[ownerId+tripId]').equals([owner, id]).modify({ tripId: null })
    await db.expenses.where('[ownerId+tripId]').equals([owner, id]).modify({ tripId: null })
    await db.guides.where('[ownerId+tripId]').equals([owner, id]).modify({ tripId: null })
    await db.mapMarks.where('[ownerId+tripId]').equals([owner, id]).modify({ tripId: null })
    await db.routes.where('[ownerId+tripId]').equals([owner, id]).modify({ tripId: null })
  } else {
    await db.activities.where('tripId').equals(id).modify({ tripId: null })
    await db.transports.where('tripId').equals(id).modify({ tripId: null })
    await db.expenses.where('tripId').equals(id).modify({ tripId: null })
    await db.guides.where('tripId').equals(id).modify({ tripId: null })
    await db.mapMarks.where('tripId').equals(id).modify({ tripId: null })
    await db.routes.where('tripId').equals(id).modify({ tripId: null })
  }
  await db.trips.delete(id)
}

// ===== Activity =====
export async function listActivities(): Promise<Activity[]>
export async function listActivities(tripId: string): Promise<Activity[]>
export async function listActivities(tripId?: string): Promise<Activity[]> {
  if (tripId === undefined) return ownerAll(db.activities)
  return ownerByTrip(db.activities, tripId)
}
export async function listActivitiesByDate(
  tripId: string,
  date: string,
): Promise<Activity[]> {
  const items = await ownerByTrip(db.activities, tripId)
  return items.filter((a) => a.date === date)
}
export async function getActivity(id: string): Promise<Activity | undefined> {
  return ownerGet(db.activities, id)
}
export async function addActivity(data: NewActivity): Promise<Activity> {
  const item = {
    ...data,
    linkedExpenseIds: data.linkedExpenseIds ?? [],
    linkedTransportIds: data.linkedTransportIds ?? [],
    linkedGuideIds: data.linkedGuideIds ?? [],
    id: uid(),
  } as Activity
  await db.activities.add(item)
  return item
}
export async function updateActivity(
  id: string,
  patch: Partial<Activity>,
): Promise<Activity | undefined> {
  const owned = await getActivity(id)
  if (!owned) return undefined
  await db.activities.update(id, patch)
  return db.activities.get(id)
}
export async function removeActivity(id: string): Promise<void> {
  const owned = await getActivity(id)
  if (!owned) return
  await db.activities.delete(id)
}

// ===== Transport =====
export async function listTransports(tripId?: string): Promise<Transport[]> {
  if (tripId === undefined) return ownerAll(db.transports)
  return ownerByTrip(db.transports, tripId)
}
export async function listTransportsSorted(tripId?: string): Promise<Transport[]> {
  const items = await listTransports(tripId)
  return items.sort((a, b) => (a.departAt ?? '').localeCompare(b.departAt ?? ''))
}
export async function getTransport(id: string): Promise<Transport | undefined> {
  return ownerGet(db.transports, id)
}
export async function addTransport(data: NewTransport): Promise<Transport> {
  const item = { ...data, id: uid() } as Transport
  await db.transports.add(item)
  return item
}
export async function updateTransport(
  id: string,
  patch: Partial<Transport>,
): Promise<Transport | undefined> {
  const owned = await getTransport(id)
  if (!owned) return undefined
  await db.transports.update(id, patch)
  return db.transports.get(id)
}
export async function removeTransport(id: string): Promise<void> {
  const owned = await getTransport(id)
  if (!owned) return
  await db.transports.delete(id)
}

// ===== Expense =====
export async function listExpenses(tripId?: string): Promise<Expense[]> {
  if (tripId === undefined) return ownerAll(db.expenses)
  return ownerByTrip(db.expenses, tripId)
}
export async function listExpensesSorted(tripId?: string): Promise<Expense[]> {
  const items = await listExpenses(tripId)
  return items.sort((a, b) => (b.time ?? '').localeCompare(a.time ?? ''))
}
export async function listExpensesByActivity(
  activityId: string,
): Promise<Expense[]> {
  const owner = getOwnerId()
  if (!owner) return db.expenses.where('activityId').equals(activityId).toArray()
  return db.expenses
    .where('[ownerId+activityId]')
    .equals([owner, activityId])
    .toArray()
}
export async function getExpense(id: string): Promise<Expense | undefined> {
  return ownerGet(db.expenses, id)
}
export async function addExpense(data: NewExpense): Promise<Expense> {
  const item = { ...data, id: uid() } as Expense
  await db.expenses.add(item)
  return item
}
export async function updateExpense(
  id: string,
  patch: Partial<Expense>,
): Promise<Expense | undefined> {
  const owned = await getExpense(id)
  if (!owned) return undefined
  await db.expenses.update(id, patch)
  return db.expenses.get(id)
}
export async function removeExpense(id: string): Promise<void> {
  const owned = await getExpense(id)
  if (!owned) return
  await db.expenses.delete(id)
}

// ===== Guide =====
export async function listGuides(): Promise<Guide[]>
export async function listGuides(tripId: string): Promise<Guide[]>
export async function listGuides(tripId?: string): Promise<Guide[]> {
  if (tripId === undefined) return ownerAll(db.guides)
  return ownerByTrip(db.guides, tripId)
}
export async function listFavoriteGuides(limit = 5): Promise<Guide[]> {
  // Dexie 对 boolean 索引支持不稳定，改用 filter 查询
  const all = await ownerAll(db.guides)
  return all
    .filter((g) => g.favorite === true)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
}
export async function getGuide(id: string): Promise<Guide | undefined> {
  return ownerGet(db.guides, id)
}
export async function addGuide(data: NewGuide): Promise<Guide> {
  const item = {
    ...data,
    attachmentIds: data.attachmentIds ?? [],
    tags: data.tags ?? [],
    id: uid(),
    createdAt: Date.now(),
  } as Guide
  await db.guides.add(item)
  return item
}
export async function updateGuide(
  id: string,
  patch: Partial<Guide>,
): Promise<Guide | undefined> {
  const owned = await getGuide(id)
  if (!owned) return undefined
  await db.guides.update(id, patch)
  return db.guides.get(id)
}
export async function removeGuide(id: string): Promise<void> {
  const owned = await getGuide(id)
  if (!owned) return
  await db.guides.delete(id)
}

// ===== MapMark =====
export async function listMapMarks(): Promise<MapMark[]>
export async function listMapMarks(tripId: string): Promise<MapMark[]>
export async function listMapMarks(tripId?: string): Promise<MapMark[]> {
  if (tripId === undefined) return ownerAll(db.mapMarks)
  return ownerByTrip(db.mapMarks, tripId)
}
export async function getMapMark(id: string): Promise<MapMark | undefined> {
  return ownerGet(db.mapMarks, id)
}
export async function addMapMark(data: NewMapMark): Promise<MapMark> {
  const item = { ...data, id: uid() } as MapMark
  await db.mapMarks.add(item)
  return item
}
export async function updateMapMark(
  id: string,
  patch: Partial<MapMark>,
): Promise<MapMark | undefined> {
  const owned = await getMapMark(id)
  if (!owned) return undefined
  await db.mapMarks.update(id, patch)
  return db.mapMarks.get(id)
}
export async function removeMapMark(id: string): Promise<void> {
  // markIds 字段未建索引（数组索引场景复杂），改用账号内 toArray + filter 清理引用
  const owned = await getMapMark(id)
  if (!owned) return
  const routes = await ownerAll(db.routes)
  await Promise.all(
    routes
      .filter((r) => r.markIds.includes(id))
      .map((r) =>
        db.routes.update(r.id, {
          markIds: r.markIds.filter((mId) => mId !== id),
        }),
      ),
  )
  await db.mapMarks.delete(id)
}

// ===== Route =====
export async function listRoutes(): Promise<Route[]>
export async function listRoutes(tripId: string): Promise<Route[]>
export async function listRoutes(tripId?: string): Promise<Route[]> {
  if (tripId === undefined) return ownerAll(db.routes)
  return ownerByTrip(db.routes, tripId)
}
export async function getRoute(id: string): Promise<Route | undefined> {
  return ownerGet(db.routes, id)
}
export async function addRoute(data: NewRoute): Promise<Route> {
  const item = { ...data, id: uid() } as Route
  await db.routes.add(item)
  return item
}
export async function updateRoute(
  id: string,
  patch: Partial<Route>,
): Promise<Route | undefined> {
  const owned = await getRoute(id)
  if (!owned) return undefined
  await db.routes.update(id, patch)
  return db.routes.get(id)
}
export async function removeRoute(id: string): Promise<void> {
  const owned = await getRoute(id)
  if (!owned) return
  await db.routes.delete(id)
}

// ===== Attachment =====
export async function getAttachment(id: string): Promise<Attachment | undefined> {
  return ownerGet(db.attachments, id)
}
export async function addAttachment(data: NewAttachment): Promise<Attachment> {
  const item = { ...data, id: uid(), createdAt: Date.now() } as Attachment
  await db.attachments.add(item)
  return item
}
export async function removeAttachment(id: string): Promise<void> {
  // 检查当前账号 guides.attachmentIds 并移除引用
  const owned = await getAttachment(id)
  if (!owned) return
  const guides = await ownerAll(db.guides)
  await Promise.all(
    guides
      .filter((g) => g.attachmentIds.includes(id))
      .map((g) =>
        db.guides.update(g.id, {
          attachmentIds: g.attachmentIds.filter((aId) => aId !== id),
        }),
      ),
  )
  await db.attachments.delete(id)
}
