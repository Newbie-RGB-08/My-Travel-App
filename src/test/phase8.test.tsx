import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { resetDB } from '@/db/schema'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import Home from '@/pages/Home'

const FIND_OPTS = { timeout: 3000 } as const

function renderPage() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await resetDB()
  useTripStore.setState({ currentTripId: null })
})

async function makeTrip(over: Partial<Parameters<typeof crud.addTrip>[0]> = {}) {
  return crud.addTrip({
    name: '北京三日游',
    destination: '北京',
    startDate: '2026-10-01',
    endDate: '2026-10-03',
    companions: [],
    budget: 1000,
    status: 'planning',
    ...over,
  })
}

describe('阶段 8：首页总览模块', () => {
  describe('无行程引导', () => {
    it('未选行程时显示"先创建一次行程吧"并带去创建链接', async () => {
      renderPage()
      expect(
        await screen.findByText('先创建一次行程吧', {}, FIND_OPTS),
      ).toBeInTheDocument()
      const link = screen.getByRole('link', { name: '去创建行程' })
      expect(link).toHaveAttribute('href', '/trips')
    })
  })

  describe('四宫格摘要', () => {
    it('选中行程后显示四个区块', async () => {
      const t = await makeTrip()
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      // 当前行程名出现在标题副标题
      await screen.findByText('北京三日游', {}, FIND_OPTS)
      expect(screen.getByText('行程概况')).toBeInTheDocument()
      expect(screen.getByText('临近交通')).toBeInTheDocument()
      expect(screen.getByText('消费汇总')).toBeInTheDocument()
      expect(screen.getByText('收藏攻略')).toBeInTheDocument()
    })

    it('行程概况：显示名称/目的地/日期/预算 vs 实际', async () => {
      const t = await makeTrip({ budget: 1000 })
      useTripStore.setState({ currentTripId: t.id })
      await crud.addExpense({
        tripId: t.id,
        activityId: null,
        amount: 300,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T12:00',
        place: '故宫餐厅',
        note: '',
      })
      renderPage()
      await screen.findByText('北京三日游', {}, FIND_OPTS)
      expect(screen.getByText('北京')).toBeInTheDocument()
      expect(screen.getByText('2026-10-01 ~ 2026-10-03')).toBeInTheDocument()
      // 预算 ¥1,000.00 / 已花费 ¥300.00 / 剩余 ¥700.00（限定行程区块避免与消费区块重复）
      const tripBlock = document.querySelector(
        '[data-home-block="trip"]',
      ) as HTMLElement
      const tripWithin = within(tripBlock)
      expect(tripWithin.getByText('¥1,000.00')).toBeInTheDocument()
      expect(tripWithin.getByText('¥300.00')).toBeInTheDocument()
      expect(tripWithin.getByText('¥700.00')).toBeInTheDocument()
    })

    it('临近交通：展示待出行并高亮 pending', async () => {
      const t = await makeTrip()
      await crud.addTransport({
        tripId: t.id,
        type: 'flight',
        no: 'CA1234',
        from: '上海',
        to: '北京',
        departAt: '2099-01-01T08:00',
        arriveAt: '2099-01-01T10:30',
        seat: '12A',
        terminal: 'T2',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      await crud.addTransport({
        tripId: t.id,
        type: 'train',
        no: 'G5',
        from: '北京',
        to: '天津',
        departAt: '2099-01-02T08:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'done',
      })
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      // 两条临近交通都出现
      expect(await screen.findByText('CA1234', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('G5')).toBeInTheDocument()
      // pending 的高亮：找到带 data-transport-status=pending 的条目
      const pendingItem = document.querySelector(
        '[data-transport-status="pending"]',
      ) as HTMLElement
      expect(pendingItem).toBeTruthy()
      expect(pendingItem.className).toContain('bg-amber-50')
    })

    it('消费汇总：分类占比小图出现各分类段', async () => {
      const t = await makeTrip({ budget: 0 })
      await crud.addExpense({
        tripId: t.id,
        activityId: null,
        amount: 100,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T12:00',
        place: '',
        note: '',
      })
      await crud.addExpense({
        tripId: t.id,
        activityId: null,
        amount: 200,
        currency: 'CNY',
        category: 'stay',
        time: '2026-10-01T18:00',
        place: '',
        note: '',
      })
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      await screen.findByText('消费汇总', {}, FIND_OPTS)
      const bar = await screen.findByTestId('expense-bar')
      expect(bar).toBeInTheDocument()
      // 两类各占一段
      expect(bar.querySelector('[data-category="food"]')).toBeTruthy()
      expect(bar.querySelector('[data-category="stay"]')).toBeTruthy()
      // 总花费 ¥300.00（限定消费区块）
      const expBlock = document.querySelector(
        '[data-home-block="expenses"]',
      ) as HTMLElement
      expect(within(expBlock).getByText('¥300.00')).toBeInTheDocument()
    })

    it('收藏攻略：最多展示 5 条收藏', async () => {
      const t = await makeTrip()
      for (let i = 0; i < 6; i++) {
        await crud.addGuide({
          title: `攻略${i}`,
          destination: '',
          category: 'sight',
          content: '',
          favorite: true,
          tags: [],
          tripId: t.id,
          attachmentIds: [],
        })
      }
      // 一条非收藏，不应出现
      await crud.addGuide({
        title: '不收藏的',
        destination: '',
        category: 'sight',
        content: '',
        favorite: false,
        tags: [],
        tripId: t.id,
        attachmentIds: [],
      })
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      await screen.findByText('收藏攻略', {}, FIND_OPTS)
      await waitFor(() => {
        const items = screen.getAllByText(/攻略\d/)
        expect(items).toHaveLength(5)
      })
      expect(screen.queryByText('不收藏的')).not.toBeInTheDocument()
    })
  })

  describe('各区块跳转', () => {
    it('四个"查看全部"链接指向正确路由', async () => {
      const t = await makeTrip()
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      await screen.findByText('北京三日游', {}, FIND_OPTS)
      expect(screen.getByRole('link', { name: '查看全部行程' })).toHaveAttribute(
        'href',
        '/trips',
      )
      expect(
        screen.getByRole('link', { name: '查看全部交通安排' }),
      ).toHaveAttribute('href', '/transports')
      expect(
        screen.getByRole('link', { name: '查看全部消费记录' }),
      ).toHaveAttribute('href', '/expenses')
      expect(screen.getByRole('link', { name: '查看全部攻略' })).toHaveAttribute(
        'href',
        '/guides',
      )
    })
  })
})
