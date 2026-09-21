import { db } from '@/db/schema'
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
  return db.trips.orderBy('startDate').reverse().toArray()
}
export async function getTrip(id: string): Promise<Trip | undefined> {
  return db.trips.get(id)
}
export async function addTrip(data: NewTrip): Promise<Trip> {
  const trip: Trip = { ...data, id: uid(), createdAt: Date.now() }
  await db.trips.add(trip)
  return trip
}
export async function updateTrip(
  id: string,
  patch: Partial<Trip>,
): Promise<Trip | undefined> {
  await db.trips.update(id, patch)
  return db.trips.get(id)
}
export async function removeTrip(id: string): Promise<void> {
  // 软关联解除：把子数据的 tripId 置 null，不删除子数据
  await db.activities.where('tripId').equals(id).modify({ tripId: null })
  await db.transports.where('tripId').equals(id).modify({ tripId: null })
  await db.expenses.where('tripId').equals(id).modify({ tripId: null })
  await db.guides.where('tripId').equals(id).modify({ tripId: null })
  await db.mapMarks.where('tripId').equals(id).modify({ tripId: null })
  await db.routes.where('tripId').equals(id).modify({ tripId: null })
  await db.trips.delete(id)
}

// ===== Activity =====
export async function listActivities(): Promise<Activity[]>
export async function listActivities(tripId: string): Promise<Activity[]>
export async function listActivities(tripId?: string): Promise<Activity[]> {
  if (tripId === undefined) return db.activities.toArray()
  return db.activities.where('tripId').equals(tripId).toArray()
}
export async function listActivitiesByDate(
  tripId: string,
  date: string,
): Promise<Activity[]> {
  return db.activities
    .where('tripId')
    .equals(tripId)
    .and((a) => a.date === date)
    .toArray()
}
export async function getActivity(id: string): Promise<Activity | undefined> {
  return db.activities.get(id)
}
export async function addActivity(data: NewActivity): Promise<Activity> {
  const item: Activity = {
    ...data,
    linkedExpenseIds: data.linkedExpenseIds ?? [],
    linkedTransportIds: data.linkedTransportIds ?? [],
    linkedGuideIds: data.linkedGuideIds ?? [],
    id: uid(),
  }
  await db.activities.add(item)
  return item
}
export async function updateActivity(
  id: string,
  patch: Partial<Activity>,
): Promise<Activity | undefined> {
  await db.activities.update(id, patch)
  return db.activities.get(id)
}
export async function removeActivity(id: string): Promise<void> {
  await db.activities.delete(id)
}

// ===== Transport =====
export async function listTransports(tripId?: string): Promise<Transport[]> {
  if (tripId === undefined) return db.transports.toArray()
  return db.transports.where('tripId').equals(tripId).toArray()
}
export async function listTransportsSorted(tripId?: string): Promise<Transport[]> {
  const items = await listTransports(tripId)
  return items.sort((a, b) => (a.departAt ?? '').localeCompare(b.departAt ?? ''))
}
export async function getTransport(id: string): Promise<Transport | undefined> {
  return db.transports.get(id)
}
export async function addTransport(data: NewTransport): Promise<Transport> {
  const item: Transport = { ...data, id: uid() }
  await db.transports.add(item)
  return item
}
export async function updateTransport(
  id: string,
  patch: Partial<Transport>,
): Promise<Transport | undefined> {
  await db.transports.update(id, patch)
  return db.transports.get(id)
}
export async function removeTransport(id: string): Promise<void> {
  await db.transports.delete(id)
}

// ===== Expense =====
export async function listExpenses(tripId?: string): Promise<Expense[]> {
  if (tripId === undefined) return db.expenses.toArray()
  return db.expenses.where('tripId').equals(tripId).toArray()
}
export async function listExpensesSorted(tripId?: string): Promise<Expense[]> {
  const items = await listExpenses(tripId)
  return items.sort((a, b) => (b.time ?? '').localeCompare(a.time ?? ''))
}
export async function listExpensesByActivity(
  activityId: string,
): Promise<Expense[]> {
  return db.expenses.where('activityId').equals(activityId).toArray()
}
export async function getExpense(id: string): Promise<Expense | undefined> {
  return db.expenses.get(id)
}
export async function addExpense(data: NewExpense): Promise<Expense> {
  const item: Expense = { ...data, id: uid() }
  await db.expenses.add(item)
  return item
}
export async function updateExpense(
  id: string,
  patch: Partial<Expense>,
): Promise<Expense | undefined> {
  await db.expenses.update(id, patch)
  return db.expenses.get(id)
}
export async function removeExpense(id: string): Promise<void> {
  await db.expenses.delete(id)
}

// ===== Guide =====
export async function listGuides(): Promise<Guide[]>
export async function listGuides(tripId: string): Promise<Guide[]>
export async function listGuides(tripId?: string): Promise<Guide[]> {
  if (tripId === undefined) return db.guides.toArray()
  return db.guides.where('tripId').equals(tripId).toArray()
}
export async function listFavoriteGuides(limit = 5): Promise<Guide[]> {
  // Dexie 对 boolean 索引支持不稳定，改用 filter 查询
  const all = await db.guides.toArray()
  return all
    .filter((g) => g.favorite === true)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
}
export async function getGuide(id: string): Promise<Guide | undefined> {
  return db.guides.get(id)
}
export async function addGuide(data: NewGuide): Promise<Guide> {
  const item: Guide = {
    ...data,
    attachmentIds: data.attachmentIds ?? [],
    tags: data.tags ?? [],
    id: uid(),
    createdAt: Date.now(),
  }
  await db.guides.add(item)
  return item
}
export async function updateGuide(
  id: string,
  patch: Partial<Guide>,
): Promise<Guide | undefined> {
  await db.guides.update(id, patch)
  return db.guides.get(id)
}
export async function removeGuide(id: string): Promise<void> {
  await db.guides.delete(id)
}

// ===== MapMark =====
export async function listMapMarks(): Promise<MapMark[]>
export async function listMapMarks(tripId: string): Promise<MapMark[]>
export async function listMapMarks(tripId?: string): Promise<MapMark[]> {
  if (tripId === undefined) return db.mapMarks.toArray()
  return db.mapMarks.where('tripId').equals(tripId).toArray()
}
export async function getMapMark(id: string): Promise<MapMark | undefined> {
  return db.mapMarks.get(id)
}
export async function addMapMark(data: NewMapMark): Promise<MapMark> {
  const item: MapMark = { ...data, id: uid() }
  await db.mapMarks.add(item)
  return item
}
export async function updateMapMark(
  id: string,
  patch: Partial<MapMark>,
): Promise<MapMark | undefined> {
  await db.mapMarks.update(id, patch)
  return db.mapMarks.get(id)
}
export async function removeMapMark(id: string): Promise<void> {
  // markIds 字段未建索引（数组索引场景复杂），改用 toArray + filter 清理引用
  const routes = await db.routes.toArray()
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
  if (tripId === undefined) return db.routes.toArray()
  return db.routes.where('tripId').equals(tripId).toArray()
}
export async function getRoute(id: string): Promise<Route | undefined> {
  return db.routes.get(id)
}
export async function addRoute(data: NewRoute): Promise<Route> {
  const item: Route = { ...data, id: uid() }
  await db.routes.add(item)
  return item
}
export async function updateRoute(
  id: string,
  patch: Partial<Route>,
): Promise<Route | undefined> {
  await db.routes.update(id, patch)
  return db.routes.get(id)
}
export async function removeRoute(id: string): Promise<void> {
  await db.routes.delete(id)
}

// ===== Attachment =====
export async function getAttachment(id: string): Promise<Attachment | undefined> {
  return db.attachments.get(id)
}
export async function addAttachment(data: NewAttachment): Promise<Attachment> {
  const item: Attachment = { ...data, id: uid(), createdAt: Date.now() }
  await db.attachments.add(item)
  return item
}
export async function removeAttachment(id: string): Promise<void> {
  // 检查 guides.attachmentIds 并移除引用
  const guides = await db.guides.toArray()
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
