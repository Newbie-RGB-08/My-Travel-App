// ===== 实体类型定义（对应 DEV_PLAN 第三章 Schema）=====

export type TripStatus = 'planning' | 'ongoing' | 'done'
export type ActivitySlot = 'morning' | 'afternoon' | 'evening'
export type ActivityType = 'sight' | 'food' | 'shop' | 'rest'
export type TransportType =
  | 'flight'
  | 'train'
  | 'bus'
  | 'metro'
  | 'taxi'
  | 'self'
export type TransportStatus = 'pending' | 'done' | 'cancelled'
export type ExpenseCategory =
  | 'transport'
  | 'stay'
  | 'food'
  | 'ticket'
  | 'shop'
  | 'other'
export type GuideCategory =
  | 'sight'
  | 'food'
  | 'shop'
  | 'culture'
  | 'pitfall'
  | 'gear'
export type MapMarkType =
  | 'sight'
  | 'hotel'
  | 'food'
  | 'station'
  | 'custom'

export interface User {
  id: string
  phone: string // 唯一
  passwordHash: string // SHA-256(salt + password) 十六进制
  salt: string // 每用户随机 16 字节 hex
  createdAt: number
}

export interface Trip {
  id: string
  ownerId: string // 所属账号
  name: string
  destination: string
  startDate: string // ISO date
  endDate: string // ISO date
  companions: string[]
  budget: number
  status: TripStatus
  createdAt: number
}

export interface Activity {
  id: string
  ownerId: string
  tripId: string | null
  date: string // ISO date
  slot: ActivitySlot
  time: string | null
  place: string
  type: ActivityType
  note: string
  linkedExpenseIds: string[]
  linkedTransportIds: string[]
  linkedGuideIds: string[]
}

export interface Transport {
  id: string
  ownerId: string
  tripId: string | null
  type: TransportType
  no: string
  from: string
  to: string
  departAt: string // ISO datetime
  arriveAt: string | null // ISO datetime
  seat: string
  terminal: string
  checkinInfo: string
  note: string
  status: TransportStatus
}

export interface Expense {
  id: string
  ownerId: string
  tripId: string | null
  activityId: string | null
  amount: number
  currency: string // 默认 'CNY'
  category: ExpenseCategory
  time: string // ISO datetime
  place: string
  note: string
}

export interface Guide {
  id: string
  ownerId: string
  title: string
  destination: string
  category: GuideCategory
  content: string
  favorite: boolean
  tags: string[]
  tripId: string | null
  attachmentIds: string[]
  createdAt: number
}

export interface MapMark {
  id: string
  ownerId: string
  tripId: string | null
  name: string
  type: MapMarkType
  lat: number
  lng: number
  note: string
}

export interface Route {
  id: string
  ownerId: string
  tripId: string | null
  name: string
  markIds: string[] // 顺序连接
}

export interface Attachment {
  id: string
  ownerId: string
  blob: Blob
  mime: string
  createdAt: number
}

// 通用创建输入类型（不含 id / 自动时间戳 / 归属账号——ownerId 由数据库钩子注入）
export type NewTrip = Omit<Trip, 'id' | 'createdAt' | 'ownerId'>
export type NewActivity = Omit<Activity, 'id' | 'ownerId'>
export type NewTransport = Omit<Transport, 'id' | 'ownerId'>
export type NewExpense = Omit<Expense, 'id' | 'ownerId'>
export type NewGuide = Omit<Guide, 'id' | 'createdAt' | 'ownerId'>
export type NewMapMark = Omit<MapMark, 'id' | 'ownerId'>
export type NewRoute = Omit<Route, 'id' | 'ownerId'>
export type NewAttachment = Omit<Attachment, 'id' | 'createdAt' | 'ownerId'>
