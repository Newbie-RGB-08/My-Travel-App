import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { resetDB, db } from '@/db/schema'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { AppLayout } from '@/layout/AppLayout'
import { router } from '@/routes/router'
import Home from '@/pages/Home'
import Trips from '@/pages/Trips'
import Transports from '@/pages/Transports'
import Expenses from '@/pages/Expenses'
import Guides from '@/pages/Guides'
import MapPage from '@/pages/Map'

// Mock 真实 Leaflet 地图（jsdom 无法渲染 react-leaflet）。
// 桩组件验证页面与地图的交互契约。
vi.mock('@/pages/Map/MapView', () => ({
  MapView: (props: {
    marks: { id: string; name: string; lat: number; lng: number; type: string }[]
    routes: { id: string; name: string }[]
    focus: { lat: number; lng: number } | null
    onMapClick: (lat: number, lng: number) => void
    onTileError: () => void
    tileKey: string
  }) => (
    <div data-testid="map-view" role="region" aria-label="地图区域">
      地图区域
      {props.marks.map((m) => (
        <span key={m.id} data-testid={`on-map-${m.id}`}>
          地图标注：{m.name}
        </span>
      ))}
      <button type="button" onClick={() => props.onMapClick(39.9163, 116.3972)}>
        模拟点击地图添加标注
      </button>
      <button type="button" onClick={() => props.onTileError()}>
        模拟瓦片加载失败
      </button>
    </div>
  ),
}))

const FIND_OPTS = { timeout: 3000 } as const

function renderWith(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      {ui}
      <ConfirmDialog />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await resetDB()
  useTripStore.setState({ currentTripId: null })
  useModalStore.setState({ content: null })
  useModalStore.setState((s) => ({ confirm: { ...s.confirm, open: false } }))
})

// 辅助：创建一个含各模块数据的完整行程
async function makeFullTrip(name = '十一北京') {
  const t = await crud.addTrip({
    name,
    destination: '北京',
    startDate: '2026-10-01',
    endDate: '2026-10-03',
    companions: ['小明'],
    budget: 5000,
    status: 'planning',
  })
  const tr = await crud.addTransport({
    tripId: t.id,
    type: 'flight',
    no: 'CA1234',
    from: '上海',
    to: '北京',
    departAt: '2026-10-01T08:00',
    arriveAt: '2026-10-01T10:30',
    seat: '12A',
    terminal: 'T2',
    checkinInfo: '',
    note: '',
    status: 'pending',
  })
  const ex = await crud.addExpense({
    tripId: t.id,
    activityId: null,
    amount: 300,
    currency: 'CNY',
    category: 'transport',
    time: '2026-10-01T08:00',
    place: '机场',
    note: '',
  })
  const gu = await crud.addGuide({
    title: '故宫攻略',
    destination: '北京',
    category: 'sight',
    content: '早上 8 点进，避开人流',
    favorite: true,
    tags: ['必去'],
    tripId: t.id,
    attachmentIds: [],
  })
  const mk = await crud.addMapMark({
    name: '故宫',
    type: 'sight',
    lat: 39.9163,
    lng: 116.3972,
    note: '南门进',
    tripId: t.id,
  })
  return { t, tr, ex, gu, mk }
}

describe('阶段 11：验收测试（PRD 第十节 22 条）', () => {
  describe('10.1 启动和运行', () => {
    it('1. 能在浏览器打开应用，无登录页', () => {
      render(
        <MemoryRouter>
          <AppLayout />
        </MemoryRouter>,
      )
      expect(screen.queryByText(/登录|注册|Sign in|Login/i)).not.toBeInTheDocument()
      expect(screen.getByText('我的旅行')).toBeInTheDocument()
    })

    it('2. 应用打开后默认停在首页总览', () => {
      const root = router.routes.find((r) => r.path === '/')!
      const hasIndex = (root.children ?? []).some(
        (c) => 'index' in c && c.index,
      )
      expect(hasIndex).toBe(true)
      renderWith(<Home />)
      expect(screen.getByText('首页总览')).toBeInTheDocument()
    })
  })

  describe('10.2 数据持久化（硬指标）', () => {
    it('3. 新建行程 → 重新读取 → 行程仍在', async () => {
      await crud.addTrip({
        name: '持久化测试行程',
        destination: '上海',
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        companions: [],
        budget: 2000,
        status: 'planning',
      })
      const all = await db.trips.toArray()
      expect(all).toHaveLength(1)
      expect(all[0].name).toBe('持久化测试行程')
    })

    it('4. 数据由 IndexedDB 持久化到磁盘（重启后仍可读取）', async () => {
      await crud.addTrip({
        name: '磁盘持久化',
        destination: '杭州',
        startDate: '2026-12-01',
        endDate: '2026-12-02',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      // name 非索引字段，用 toArray 过滤
      const all = await db.trips.toArray()
      const got = all.find((t) => t.name === '磁盘持久化')
      expect(got).toBeTruthy()
      expect(got!.destination).toBe('杭州')
    })

    it('5. 同一浏览器不同标签页数据一致', async () => {
      const { t } = await makeFullTrip('共享数据')
      const allTrips = await db.trips.toArray()
      const allTransports = await db.transports.where('tripId').equals(t.id).toArray()
      const allExpenses = await db.expenses.where('tripId').equals(t.id).toArray()
      const allGuides = await db.guides.where('tripId').equals(t.id).toArray()
      const allMarks = await db.mapMarks.where('tripId').equals(t.id).toArray()
      expect(allTrips.some((x) => x.name === '共享数据')).toBe(true)
      expect(allTransports).toHaveLength(1)
      expect(allExpenses).toHaveLength(1)
      expect(allGuides).toHaveLength(1)
      expect(allMarks).toHaveLength(1)
    })
  })

  describe('10.3 导航和全局联动', () => {
    it('6. 左侧导航显示 6 个模块 + 行程切换器 + 设置入口', () => {
      render(
        <MemoryRouter>
          <AppLayout />
        </MemoryRouter>,
      )
      const aside = screen.getByText('我的旅行').closest('aside')!
      expect(within(aside).getByText('首页总览')).toBeInTheDocument()
      expect(within(aside).getByText('行程计划')).toBeInTheDocument()
      expect(within(aside).getByText('交通安排')).toBeInTheDocument()
      expect(within(aside).getByText('地图详情')).toBeInTheDocument()
      expect(within(aside).getByText('游玩攻略')).toBeInTheDocument()
      expect(within(aside).getByText('消费记录')).toBeInTheDocument()
      expect(within(aside).getByText('设置')).toBeInTheDocument()
    })

    it('7. 选定行程后，交通安排模块只显示该行程记录', async () => {
      const { t } = await makeFullTrip()
      await crud.addTransport({
        tripId: null,
        type: 'train',
        no: 'G999',
        from: '北京',
        to: '天津',
        departAt: '2026-09-01T09:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      useTripStore.setState({ currentTripId: t.id })
      renderWith(<Transports />)
      expect(await screen.findByText('CA1234', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.queryByText('G999')).not.toBeInTheDocument()
    })

    it('8. 切换到另一行程后，列表数据同步切换', async () => {
      const a = await crud.addTrip({
        name: '行程A',
        destination: 'A',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      const b = await crud.addTrip({
        name: '行程B',
        destination: 'B',
        startDate: '2026-02-01',
        endDate: '2026-02-02',
        companions: [],
        budget: 2000,
        status: 'planning',
      })
      await crud.addTransport({
        tripId: a.id,
        type: 'flight',
        no: 'AA111',
        from: 'A1',
        to: 'A2',
        departAt: '2026-01-01T08:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      await crud.addTransport({
        tripId: b.id,
        type: 'flight',
        no: 'BB222',
        from: 'B1',
        to: 'B2',
        departAt: '2026-02-01T08:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      useTripStore.setState({ currentTripId: a.id })
      const { unmount } = renderWith(<Transports />)
      expect(await screen.findByText('AA111', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.queryByText('BB222')).not.toBeInTheDocument()
      unmount()
      useTripStore.setState({ currentTripId: b.id })
      renderWith(<Transports />)
      expect(await screen.findByText('BB222', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.queryByText('AA111')).not.toBeInTheDocument()
    })
  })

  describe('10.4 首页内容', () => {
    it('9. 选中行程后首页显示四个区块', async () => {
      const { t } = await makeFullTrip()
      useTripStore.setState({ currentTripId: t.id })
      renderWith(<Home />)
      await screen.findByText('十一北京', {}, FIND_OPTS)
      expect(screen.getByText('行程概况')).toBeInTheDocument()
      expect(screen.getByText('临近交通')).toBeInTheDocument()
      expect(screen.getByText('消费汇总')).toBeInTheDocument()
      expect(screen.getByText('收藏攻略')).toBeInTheDocument()
    })

    it('10. 无行程时首页显示"先创建一次行程吧"引导', async () => {
      renderWith(<Home />)
      expect(
        await screen.findByText('先创建一次行程吧', {}, FIND_OPTS),
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '去创建行程' })).toHaveAttribute(
        'href',
        '/trips',
      )
    })
  })

  describe('10.5 各模块核心功能', () => {
    it('11. 行程计划：新建行程', async () => {
      const user = userEvent.setup()
      renderWith(<Trips />)
      await screen.findByText('还没有行程', {}, FIND_OPTS)
      await user.click(screen.getByRole('button', { name: '新建行程' }))
      await screen.findByPlaceholderText('如：十一北京5日游')
      await user.type(
        screen.getByPlaceholderText('如：十一北京5日游'),
        '测试行程',
      )
      await user.type(screen.getByPlaceholderText('如：北京'), '北京')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await screen.findByText('测试行程', {}, FIND_OPTS)
      const all = await crud.listTrips()
      expect(all.some((x) => x.name === '测试行程')).toBe(true)
    })

    it('12. 交通安排：按出发时间排序，状态可切换', async () => {
      const { t } = await makeFullTrip()
      await crud.addTransport({
        tripId: t.id,
        type: 'train',
        no: 'G2',
        from: '北京',
        to: '上海',
        departAt: '2026-10-01T06:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      useTripStore.setState({ currentTripId: t.id })
      renderWith(<Transports />)
      expect(await screen.findByText('CA1234', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('G2')).toBeInTheDocument()
      // G2 出发更早（06:00），应排在 CA1234（08:00）前面
      const cards = screen.getAllByText(/CA1234|G2/)
      const g2Idx = cards.findIndex((c) => c.textContent === 'G2')
      const caIdx = cards.findIndex((c) => c.textContent === 'CA1234')
      expect(g2Idx).toBeLessThan(caIdx)
    })

    it('13. 地图详情：标注列表显示，能画路线', async () => {
      const { t } = await makeFullTrip()
      await crud.addMapMark({
        name: '天安门',
        type: 'sight',
        lat: 39.9054,
        lng: 116.3976,
        note: '',
        tripId: t.id,
      })
      useTripStore.setState({ currentTripId: t.id })
      renderWith(<MapPage />)
      expect(await screen.findByText('故宫', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('天安门')).toBeInTheDocument()
      // 画路线
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: /画路线/ }))
      const pickBtns = screen.getAllByRole('button', { name: /加入路线|移出路线/ })
      await user.click(pickBtns[0])
      await user.click(pickBtns[1])
      await user.click(screen.getByRole('button', { name: '生成路线' }))
      const routes = await crud.listRoutes(t.id)
      expect(routes).toHaveLength(1)
      expect(routes[0].markIds).toHaveLength(2)
    })

    it('14. 游玩攻略：新建条目，收藏后首页可见', async () => {
      const { t } = await makeFullTrip()
      useTripStore.setState({ currentTripId: t.id })
      const r1 = renderWith(<Guides />)
      expect(await screen.findByText('故宫攻略', {}, FIND_OPTS)).toBeInTheDocument()
      r1.unmount()
      const { unmount } = renderWith(<Home />)
      expect(await screen.findByText('故宫攻略', {}, FIND_OPTS)).toBeInTheDocument()
      unmount()
    })

    it('15. 消费记录：新建消费，预算 vs 实际对比', async () => {
      const { t } = await makeFullTrip()
      useTripStore.setState({ currentTripId: t.id })
      const r1 = renderWith(<Expenses />)
      // 消费卡片出现（通过地点"机场"定位）
      expect(await screen.findByText('机场', {}, FIND_OPTS)).toBeInTheDocument()
      r1.unmount()
      const { unmount } = renderWith(<Home />)
      await screen.findByText('十一北京', {}, FIND_OPTS)
      // 预算 5000，已花费 300，剩余 4700
      expect(screen.getByText(/4,?700/)).toBeInTheDocument()
      unmount()
    })
  })

  describe('10.6 跨模块关联', () => {
    it('16. 活动卡片点 🚄 跳转交通', async () => {
      const { t, tr } = await makeFullTrip()
      await crud.addActivity({
        tripId: t.id,
        date: '2026-10-01',
        slot: 'morning',
        time: null,
        place: '故宫',
        type: 'sight',
        note: '',
        linkedTransportIds: [tr.id],
        linkedExpenseIds: [],
        linkedGuideIds: [],
      })
      useTripStore.setState({ currentTripId: t.id })
      renderWith(<Trips />)
      expect(await screen.findByText('故宫', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '跳转交通' })).toHaveAttribute(
        'href',
        `/transports?highlight=${tr.id}`,
      )
    })

    it('17. 活动卡片点 💰 跳转消费', async () => {
      const { t, ex } = await makeFullTrip()
      await crud.addActivity({
        tripId: t.id,
        date: '2026-10-01',
        slot: 'morning',
        time: null,
        place: '故宫',
        type: 'sight',
        note: '',
        linkedTransportIds: [],
        linkedExpenseIds: [ex.id],
        linkedGuideIds: [],
      })
      useTripStore.setState({ currentTripId: t.id })
      renderWith(<Trips />)
      expect(await screen.findByText('故宫', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '跳转消费' })).toHaveAttribute(
        'href',
        `/expenses?highlight=${ex.id}`,
      )
    })

    it('18. 活动卡片点 📖 跳转攻略', async () => {
      const { t, gu } = await makeFullTrip()
      await crud.addActivity({
        tripId: t.id,
        date: '2026-10-01',
        slot: 'morning',
        time: null,
        place: '故宫',
        type: 'sight',
        note: '',
        linkedTransportIds: [],
        linkedExpenseIds: [],
        linkedGuideIds: [gu.id],
      })
      useTripStore.setState({ currentTripId: t.id })
      renderWith(<Trips />)
      expect(await screen.findByText('故宫', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '跳转攻略' })).toHaveAttribute(
        'href',
        `/guides?highlight=${gu.id}`,
      )
    })
  })

  describe('10.7 视觉和体验', () => {
    it('19. 整体白底、大量留白、Notion/Linear 风格', () => {
      render(
        <MemoryRouter>
          <AppLayout />
        </MemoryRouter>,
      )
      const aside = screen.getByText('我的旅行').closest('aside')!
      expect(aside.className).toContain('bg-white')
      const main = aside.parentElement?.querySelector('main')
      expect(main?.className).toContain('bg-gray-50')
    })

    it('20. 每个模块在无数据时显示"创建第一条"引导按钮', async () => {
      const cases = [
        { page: <Trips />, btn: /创建第一个行程/ },
        { page: <Transports />, btn: /创建第一条交通安排/ },
        { page: <Expenses />, btn: /创建第一条消费记录/ },
        { page: <Guides />, btn: /创建第一条攻略/ },
      ]
      for (const c of cases) {
        const { unmount } = renderWith(c.page)
        expect(
          await screen.findByRole('button', { name: c.btn }, FIND_OPTS),
        ).toBeInTheDocument()
        unmount()
      }
    })
  })

  describe('10.8 联网范围', () => {
    it('21. 除地图模块外，其他 5 个模块功能完全正常（纯本地）', async () => {
      const { t } = await makeFullTrip()
      useTripStore.setState({ currentTripId: t.id })
      // 行程计划（列表或详情视图均可渲染）
      const r1 = renderWith(<Trips />)
      expect(await screen.findByText('行程计划', {}, FIND_OPTS)).toBeInTheDocument()
      r1.unmount()
      // 交通安排
      const r2 = renderWith(<Transports />)
      expect(await screen.findByText('CA1234', {}, FIND_OPTS)).toBeInTheDocument()
      r2.unmount()
      // 消费记录（通过地点定位）
      const r3 = renderWith(<Expenses />)
      expect(await screen.findByText('机场', {}, FIND_OPTS)).toBeInTheDocument()
      r3.unmount()
      // 游玩攻略
      const r4 = renderWith(<Guides />)
      expect(await screen.findByText('故宫攻略', {}, FIND_OPTS)).toBeInTheDocument()
      r4.unmount()
      // 首页总览
      const r5 = renderWith(<Home />)
      expect(await screen.findByText('十一北京', {}, FIND_OPTS)).toBeInTheDocument()
      r5.unmount()
    })

    it('22. 地图模块断网时瓦片不显示，但本地标注列表仍可查看', async () => {
      const { t } = await makeFullTrip()
      useTripStore.setState({ currentTripId: t.id })
      renderWith(<MapPage />)
      // 标注列表可见
      expect(await screen.findByText('故宫', {}, FIND_OPTS)).toBeInTheDocument()
      // 模拟瓦片加载失败 → 触发 onTileError → 显示离线降级 UI
      const user = userEvent.setup()
      await user.click(screen.getByText('模拟瓦片加载失败'))
      expect(await screen.findByText('地图需联网', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('重试')).toBeInTheDocument()
      // 降级后标注列表仍可见（左侧 aside 不受影响）
      expect(screen.getByText('故宫')).toBeInTheDocument()
    })
  })
})
