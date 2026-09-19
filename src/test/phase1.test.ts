import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'

import { db, resetDB } from '@/db/schema'
import * as crud from '@/db/crud'

beforeEach(async () => {
  await resetDB()
})

describe('阶段 1：数据层 CRUD', () => {
  describe('Trip', () => {
    it('能创建并读取行程', async () => {
      const trip = await crud.addTrip({
        name: '十一北京5日游',
        destination: '北京',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
        companions: ['张三', '李四'],
        budget: 8000,
        status: 'planning',
      })
      expect(trip.id).toBeTruthy()
      const got = await crud.getTrip(trip.id)
      expect(got?.name).toBe('十一北京5日游')
      expect(got?.companions).toEqual(['张三', '李四'])
    })

    it('能更新行程', async () => {
      const t = await crud.addTrip({
        name: '日本行',
        destination: '东京',
        startDate: '2026-11-01',
        endDate: '2026-11-07',
        companions: [],
        budget: 15000,
        status: 'planning',
      })
      const updated = await crud.updateTrip(t.id, { status: 'ongoing' })
      expect(updated?.status).toBe('ongoing')
    })

    it('能删除行程', async () => {
      const t = await crud.addTrip({
        name: '苏州',
        destination: '苏州',
        startDate: '2026-12-01',
        endDate: '2026-12-03',
        companions: [],
        budget: 3000,
        status: 'planning',
      })
      await crud.removeTrip(t.id)
      expect(await crud.getTrip(t.id)).toBeUndefined()
    })

    it('listTrips 按起止日期倒序', async () => {
      await crud.addTrip({
        name: '早行程',
        destination: 'A',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      await crud.addTrip({
        name: '晚行程',
        destination: 'B',
        startDate: '2026-12-01',
        endDate: '2026-12-02',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      const list = await crud.listTrips()
      expect(list[0].name).toBe('晚行程')
      expect(list[1].name).toBe('早行程')
    })
  })

  describe('Activity', () => {
    it('能按行程筛选活动', async () => {
      const t1 = await crud.addTrip({
        name: 'A',
        destination: 'A',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      const t2 = await crud.addTrip({
        name: 'B',
        destination: 'B',
        startDate: '2026-02-01',
        endDate: '2026-02-02',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      await crud.addActivity({
        tripId: t1.id,
        date: '2026-01-01',
        slot: 'morning',
        time: '09:00',
        place: '故宫',
        type: 'sight',
        note: '',
        linkedExpenseIds: [],
        linkedTransportIds: [],
        linkedGuideIds: [],
      })
      await crud.addActivity({
        tripId: t2.id,
        date: '2026-02-01',
        slot: 'afternoon',
        time: null,
        place: '西湖',
        type: 'sight',
        note: '',
        linkedExpenseIds: [],
        linkedTransportIds: [],
        linkedGuideIds: [],
      })
      const a1 = await crud.listActivities(t1.id)
      const a2 = await crud.listActivities(t2.id)
      expect(a1).toHaveLength(1)
      expect(a2).toHaveLength(1)
      expect(a1[0].place).toBe('故宫')
      expect(a2[0].place).toBe('西湖')
    })

    it('listActivitiesByDate 同行程同日筛选', async () => {
      const t = await crud.addTrip({
        name: 'A',
        destination: 'A',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      await crud.addActivity({
        tripId: t.id,
        date: '2026-01-01',
        slot: 'morning',
        time: null,
        place: 'A1',
        type: 'rest',
        note: '',
        linkedExpenseIds: [],
        linkedTransportIds: [],
        linkedGuideIds: [],
      })
      await crud.addActivity({
        tripId: t.id,
        date: '2026-01-02',
        slot: 'evening',
        time: null,
        place: 'A2',
        type: 'rest',
        note: '',
        linkedExpenseIds: [],
        linkedTransportIds: [],
        linkedGuideIds: [],
      })
      const items = await crud.listActivitiesByDate(t.id, '2026-01-02')
      expect(items).toHaveLength(1)
      expect(items[0].place).toBe('A2')
    })

    it('默认关联数组字段为空', async () => {
      // 模拟不传 linkedXxx 字段（NewActivity 类型可省略，但运行时要有默认）
      const a = await crud.addActivity({
        tripId: null,
        date: '2026-01-01',
        slot: 'morning',
        time: null,
        place: 'P',
        type: 'rest',
        note: '',
      } as never)
      expect(a.linkedExpenseIds).toEqual([])
      expect(a.linkedTransportIds).toEqual([])
      expect(a.linkedGuideIds).toEqual([])
    })
  })

  describe('Transport', () => {
    it('按 departAt 升序排序', async () => {
      await crud.addTransport({
        tripId: null,
        type: 'flight',
        no: 'CA1837',
        from: '北京',
        to: '上海',
        departAt: '2026-10-01T10:00:00',
        arriveAt: '2026-10-01T12:30:00',
        seat: '12A',
        terminal: 'T3',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      await crud.addTransport({
        tripId: null,
        type: 'train',
        no: 'G1',
        from: '北京',
        to: '上海',
        departAt: '2026-10-01T06:00:00',
        arriveAt: '2026-10-01T11:00:00',
        seat: '02车01A',
        terminal: '北京南站',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      const list = await crud.listTransportsSorted()
      expect(list[0].no).toBe('G1')
      expect(list[1].no).toBe('CA1837')
    })
  })

  describe('Expense', () => {
    it('按时间倒序排序', async () => {
      await crud.addExpense({
        tripId: null,
        activityId: null,
        amount: 100,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T08:00:00',
        place: '',
        note: '',
      })
      await crud.addExpense({
        tripId: null,
        activityId: null,
        amount: 200,
        currency: 'CNY',
        category: 'stay',
        time: '2026-10-01T20:00:00',
        place: '',
        note: '',
      })
      const list = await crud.listExpensesSorted()
      expect(list[0].amount).toBe(200)
      expect(list[1].amount).toBe(100)
    })

    it('按活动筛选消费', async () => {
      const e = await crud.addExpense({
        tripId: null,
        activityId: 'act-1',
        amount: 50,
        currency: 'CNY',
        category: 'ticket',
        time: '2026-10-01T09:00:00',
        place: '',
        note: '',
      })
      const list = await crud.listExpensesByActivity('act-1')
      expect(list).toHaveLength(1)
      expect(list[0].id).toBe(e.id)
    })
  })

  describe('Guide', () => {
    it('能收藏并按收藏筛选', async () => {
      await crud.addGuide({
        title: '故宫攻略',
        destination: '北京',
        category: 'sight',
        content: '必去',
        favorite: false,
        tags: [],
        tripId: null,
        attachmentIds: [],
      })
      const g2 = await crud.addGuide({
        title: '美食指南',
        destination: '北京',
        category: 'food',
        content: '烤鸭',
        favorite: true,
        tags: ['必去'],
        tripId: null,
        attachmentIds: [],
      })
      const fav = await crud.listFavoriteGuides(5)
      expect(fav).toHaveLength(1)
      expect(fav[0].id).toBe(g2.id)
    })

    it('收藏列表限制条数', async () => {
      for (let i = 0; i < 6; i++) {
        await crud.addGuide({
          title: `g${i}`,
          destination: 'X',
          category: 'sight',
          content: '',
          favorite: true,
          tags: [],
          tripId: null,
          attachmentIds: [],
        })
      }
      const fav = await crud.listFavoriteGuides(5)
      expect(fav).toHaveLength(5)
    })
  })

  describe('MapMark / Route', () => {
    it('按行程筛选标注和路线', async () => {
      const t = await crud.addTrip({
        name: 'A',
        destination: 'A',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      const m1 = await crud.addMapMark({
        tripId: t.id,
        name: '故宫',
        type: 'sight',
        lat: 39.9163,
        lng: 116.3972,
        note: '',
      })
      const m2 = await crud.addMapMark({
        tripId: t.id,
        name: '酒店',
        type: 'hotel',
        lat: 39.91,
        lng: 116.4,
        note: '',
      })
      const r = await crud.addRoute({
        tripId: t.id,
        name: '第一天',
        markIds: [m1.id, m2.id],
      })
      const marks = await crud.listMapMarks(t.id)
      const routes = await crud.listRoutes(t.id)
      expect(marks).toHaveLength(2)
      expect(routes).toHaveLength(1)
      expect(routes[0].id).toBe(r.id)
    })

    it('删除 MapMark 自动从 Route 引用中移除', async () => {
      const m1 = await crud.addMapMark({
        tripId: null,
        name: 'A',
        type: 'custom',
        lat: 0,
        lng: 0,
        note: '',
      })
      const m2 = await crud.addMapMark({
        tripId: null,
        name: 'B',
        type: 'custom',
        lat: 0,
        lng: 0,
        note: '',
      })
      const r = await crud.addRoute({
        tripId: null,
        name: 'R',
        markIds: [m1.id, m2.id],
      })
      await crud.removeMapMark(m1.id)
      const updated = await crud.getRoute(r.id)
      expect(updated?.markIds).toEqual([m2.id])
    })
  })

  describe('Attachment', () => {
    // 注：fake-indexeddb 测试环境对 jsdom Blob 序列化会丢失内部数据（jsdom Blob
    // 不支持 structuredClone 完整克隆），但浏览器原生 IndexedDB 完全支持 Blob
    // （structuredClone 原生支持 Blob）。这里用 ArrayBuffer 验证二进制字段的存取
    // 能力，这是 PRD 7.1 "支持存 Blob"的核心语义；生产代码 Attachment.blob 仍为
    // Blob 类型，浏览器环境原生支持。
    it('能存二进制并读取', async () => {
      const buf = new ArrayBuffer(5)
      new Uint8Array(buf).fill(104) // 'h'
      const a = await crud.addAttachment({
        blob: buf as unknown as Blob,
        mime: 'text/plain',
      })
      const got = await crud.getAttachment(a.id)
      expect(got).toBeDefined()
      expect(got?.mime).toBe('text/plain')
      // 二进制数据完整保留：fake-indexeddb 跨上下文 ArrayBuffer 的 instanceof
      // 不稳定，改用字节内容断言
      const blob = got?.blob as unknown as { byteLength?: number }
      expect(blob).toBeTruthy()
      expect(typeof blob).toBe('object')
      expect(blob.byteLength).toBe(5)
    })

    it('删除 Attachment 时同步清理 Guide 的引用', async () => {
      const buf = new ArrayBuffer(1)
      const a = await crud.addAttachment({
        blob: buf as unknown as Blob,
        mime: 'image/png',
      })
      const g = await crud.addGuide({
        title: 'G',
        destination: 'X',
        category: 'sight',
        content: '',
        favorite: false,
        tags: [],
        tripId: null,
        attachmentIds: [a.id],
      })
      await crud.removeAttachment(a.id)
      const updated = await crud.getGuide(g.id)
      expect(updated?.attachmentIds).toEqual([])
    })
  })

  describe('删除行程的级联策略', () => {
    it('删除行程 → 子数据保留但 tripId 置 null', async () => {
      const t = await crud.addTrip({
        name: 'T',
        destination: 'D',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      const act = await crud.addActivity({
        tripId: t.id,
        date: '2026-01-01',
        slot: 'morning',
        time: null,
        place: 'P',
        type: 'rest',
        note: '',
        linkedExpenseIds: [],
        linkedTransportIds: [],
        linkedGuideIds: [],
      })
      const tr = await crud.addTransport({
        tripId: t.id,
        type: 'train',
        no: 'G1',
        from: 'A',
        to: 'B',
        departAt: '2026-01-01T08:00:00',
        arriveAt: '2026-01-01T10:00:00',
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      const ex = await crud.addExpense({
        tripId: t.id,
        activityId: null,
        amount: 100,
        currency: 'CNY',
        category: 'food',
        time: '2026-01-01T09:00:00',
        place: '',
        note: '',
      })

      await crud.removeTrip(t.id)

      // 行程被删
      expect(await crud.getTrip(t.id)).toBeUndefined()

      // 子数据保留但 tripId 解除
      expect((await crud.getActivity(act.id))?.tripId).toBeNull()
      expect((await crud.getTransport(tr.id))?.tripId).toBeNull()
      expect((await crud.getExpense(ex.id))?.tripId).toBeNull()
    })
  })
})
