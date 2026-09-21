import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { resetDB } from '@/db/schema'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

// Mock 真实 Leaflet 地图：jsdom 无法渲染 react-leaflet。
// 通过桩组件验证页面与地图的交互契约（onMapClick / onTileError / focus）。
vi.mock('@/pages/Map/MapView', () => ({
  MapView: (props: {
    marks: { id: string; name: string; lat: number; lng: number }[]
    routes: { id: string; name: string }[]
    focus: { lat: number; lng: number } | null
    onMapClick: (lat: number, lng: number) => void
    onTileError: () => void
    tileKey: string
  }) => (
    <div data-testid="map-view" role="region" aria-label="地图区域">
      地图区域
      {props.focus && (
        <span data-testid="map-focus">
          {props.focus.lat},{props.focus.lng}
        </span>
      )}
      {props.marks.map((m) => (
        <span key={m.id} data-testid={`on-map-${m.id}`}>
          地图标注：{m.name}
        </span>
      ))}
      <button
        type="button"
        onClick={() => props.onMapClick(39.9163, 116.3972)}
      >
        模拟点击地图添加标注
      </button>
      <button type="button" onClick={() => props.onTileError()}>
        模拟瓦片加载失败
      </button>
    </div>
  ),
}))

// 在 mock 声明之后引入被测组件，确保 mock 生效
import MapPage from '@/pages/Map'

const FIND_OPTS = { timeout: 3000 } as const

function renderPage() {
  return render(
    <MemoryRouter>
      <MapPage />
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

async function makeMark(
  name: string,
  extra: Partial<Parameters<typeof crud.addMapMark>[0]> = {},
) {
  return crud.addMapMark({
    name,
    type: 'sight',
    lat: 39.9163,
    lng: 116.3972,
    note: '',
    tripId: null,
    ...extra,
  })
}

describe('阶段 7：地图详情模块', () => {
  describe('空状态', () => {
    it('无标注时显示"还没有标注"引导', async () => {
      renderPage()
      expect(
        await screen.findByText('还没有标注', {}, FIND_OPTS),
      ).toBeInTheDocument()
    })
  })

  describe('标注 CRUD', () => {
    it('点"添加标注"按钮 → 填表 → 保存 → 列表出现', async () => {
      const user = userEvent.setup()
      renderPage()
      await screen.findByText('还没有标注', {}, FIND_OPTS)
      await user.click(screen.getByRole('button', { name: '添加标注' }))
      await screen.findByPlaceholderText('如：故宫')
      await user.type(screen.getByPlaceholderText('如：故宫'), '故宫')
      await user.type(screen.getByPlaceholderText('如：39.9163'), '39.9163')
      await user.type(screen.getByPlaceholderText('如：116.3972'), '116.3972')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(
            screen.queryByRole('button', { name: '保存' }),
          ).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      expect(await screen.findByText('故宫', {}, FIND_OPTS)).toBeInTheDocument()
      const all = await crud.listMapMarks()
      expect(all).toHaveLength(1)
      expect(all[0]!.name).toBe('故宫')
    })

    it('模拟地图点击 → 表单带预填坐标 → 保存', async () => {
      const user = userEvent.setup()
      renderPage()
      await screen.findByText('还没有标注', {}, FIND_OPTS)
      await user.click(screen.getByRole('button', { name: '模拟点击地图添加标注' }))
      const latInput = await screen.findByDisplayValue('39.9163', {}, FIND_OPTS)
      expect(latInput).toBeInTheDocument()
      expect(screen.getByDisplayValue('116.3972')).toBeInTheDocument()
      await user.type(screen.getByPlaceholderText('如：故宫'), '天安门')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(
            screen.queryByRole('button', { name: '保存' }),
          ).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      expect(await screen.findByText('天安门', {}, FIND_OPTS)).toBeInTheDocument()
    })

    it('编辑标注：改名后保存生效', async () => {
      const user = userEvent.setup()
      const m = await makeMark('原标注')
      renderPage()
      await screen.findByText('原标注', {}, FIND_OPTS)
      await user.click(screen.getByLabelText('编辑标注'))
      const nameInput = await screen.findByDisplayValue('原标注', {}, FIND_OPTS)
      await user.clear(nameInput)
      await user.type(nameInput, '改后标注')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(screen.queryByDisplayValue('改后标注')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      await screen.findByText('改后标注', {}, FIND_OPTS)
      const got = await crud.getMapMark(m.id)
      expect(got?.name).toBe('改后标注')
    })

    it('删除标注：二次确认后消失', async () => {
      const user = userEvent.setup()
      await makeMark('删除我')
      renderPage()
      await screen.findByText('删除我', {}, FIND_OPTS)
      await user.click(screen.getByLabelText('删除标注'))
      await screen.findByText('删除标注', {}, FIND_OPTS)
      await user.click(screen.getByRole('button', { name: '删除' }))
      await waitFor(
        () => {
          expect(screen.queryByText('删除我')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      const all = await crud.listMapMarks()
      expect(all).toHaveLength(0)
    })
  })

  describe('列表点击 → 地图飞行定位', () => {
    it('点左侧列表项后 focus 传给地图', async () => {
      const user = userEvent.setup()
      await makeMark('故宫')
      renderPage()
      await screen.findByText('故宫', {}, FIND_OPTS)
      // 初始无 focus
      expect(screen.queryByTestId('map-focus')).not.toBeInTheDocument()
      // 点列表项
      await user.click(screen.getByText('故宫'))
      await waitFor(() => {
        expect(screen.getByTestId('map-focus')).toHaveTextContent(
          '39.9163,116.3972',
        )
      })
    })
  })

  describe('画路线', () => {
    it('选 2 个标注 → 生成路线 → 路线出现并持久化', async () => {
      const user = userEvent.setup()
      await makeMark('故宫', { lat: 39.9163, lng: 116.3972 })
      await makeMark('天坛', { lat: 39.8822, lng: 116.4066, type: 'sight' })
      renderPage()
      await screen.findByText('故宫', {}, FIND_OPTS)
      await screen.findByText('天坛', {}, FIND_OPTS)
      // 进入画路线模式
      await user.click(screen.getByRole('button', { name: /画路线/ }))
      // 出现路线选择面板
      await screen.findByText('路线选择', {}, FIND_OPTS)
      // 逐个加入
      const adds = await screen.findAllByRole('button', { name: '加入路线' })
      expect(adds).toHaveLength(2)
      await user.click(adds[0]!)
      await user.click(adds[1]!)
      await user.type(
        screen.getByPlaceholderText('路线名称（可选）'),
        '中轴线',
      )
      await user.click(screen.getByRole('button', { name: '生成路线' }))
      await waitFor(
        () => {
          expect(
            screen.queryByRole('button', { name: '生成路线' }),
          ).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      expect(await screen.findByText('中轴线', {}, FIND_OPTS)).toBeInTheDocument()
      const routes = await crud.listRoutes()
      expect(routes).toHaveLength(1)
      expect(routes[0]!.name).toBe('中轴线')
      expect(routes[0]!.markIds).toHaveLength(2)
    })

    it('删除路线：二次确认后消失', async () => {
      const user = userEvent.setup()
      const a = await makeMark('A点', { lat: 39.9, lng: 116.39 })
      const b = await makeMark('B点', { lat: 39.8, lng: 116.4 })
      await crud.addRoute({
        name: '测试路线',
        markIds: [a.id, b.id],
        tripId: null,
      })
      renderPage()
      await screen.findByText('测试路线', {}, FIND_OPTS)
      await user.click(screen.getByLabelText('删除路线'))
      await screen.findByText('删除路线', {}, FIND_OPTS)
      await user.click(screen.getByRole('button', { name: '删除' }))
      await waitFor(
        () => {
          expect(screen.queryByText('测试路线')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      const routes = await crud.listRoutes()
      expect(routes).toHaveLength(0)
    })
  })

  describe('行程切换器筛选', () => {
    it('切换 currentTripId 后标注与路线只显示对应行程的', async () => {
      const tA = await crud.addTrip({
        name: 'A 行程',
        destination: 'A',
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        companions: [],
        budget: 0,
        status: 'planning',
      })
      const tB = await crud.addTrip({
        name: 'B 行程',
        destination: 'B',
        startDate: '2026-11-01',
        endDate: '2026-11-02',
        companions: [],
        budget: 0,
        status: 'planning',
      })
      await makeMark('A标', { tripId: tA.id })
      await makeMark('B标', { tripId: tB.id })
      await crud.addRoute({ name: 'A线', markIds: [], tripId: tA.id })
      await crud.addRoute({ name: 'B线', markIds: [], tripId: tB.id })
      renderPage()
      expect(await screen.findByText('A标', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('B标')).toBeInTheDocument()
      expect(screen.getByText('A线')).toBeInTheDocument()
      expect(screen.getByText('B线')).toBeInTheDocument()
      // 切换到 A
      useTripStore.setState({ currentTripId: tA.id })
      await waitFor(
        () => {
          expect(screen.queryByText('B标')).not.toBeInTheDocument()
          expect(screen.queryByText('B线')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      expect(screen.getByText('A标')).toBeInTheDocument()
      expect(screen.getByText('A线')).toBeInTheDocument()
    })
  })

  describe('断网降级', () => {
    it('瓦片加载失败 → 显示"地图需联网"，左侧列表仍可用，重试恢复', async () => {
      const user = userEvent.setup()
      await makeMark('故宫')
      renderPage()
      await screen.findByText('故宫', {}, FIND_OPTS)
      expect(screen.getByTestId('map-view')).toBeInTheDocument()
      // 触发瓦片失败
      await user.click(screen.getByRole('button', { name: '模拟瓦片加载失败' }))
      expect(await screen.findByText('地图需联网', {}, FIND_OPTS)).toBeInTheDocument()
      // 左侧列表仍在
      expect(screen.getByText('故宫')).toBeInTheDocument()
      // 地图桩已隐藏
      expect(screen.queryByTestId('map-view')).not.toBeInTheDocument()
      // 重试
      await user.click(screen.getByRole('button', { name: '重试' }))
      await waitFor(() => {
        expect(screen.getByTestId('map-view')).toBeInTheDocument()
      })
    })
  })
})
