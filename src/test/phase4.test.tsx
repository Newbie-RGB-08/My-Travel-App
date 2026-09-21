import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { resetDB } from '@/db/schema'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import Transports from '@/pages/Transports'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

const FIND_OPTS = { timeout: 3000 } as const

function renderPage() {
  return render(
    <MemoryRouter>
      <Transports />
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

// 填写交通表单的关键字段（from/to/departAt 必填）
async function fillTransportForm(
  user: ReturnType<typeof userEvent.setup>,
  opts: { from: string; to: string; departAt: string; no?: string },
) {
  if (opts.no) {
    await user.type(screen.getByPlaceholderText('如：CA1234'), opts.no)
  }
  await user.type(screen.getByPlaceholderText('如：北京首都机场'), opts.from)
  await user.type(screen.getByPlaceholderText('如：上海虹桥'), opts.to)
  // datetime-local：用 fireEvent.change 直接设值（label 带 required 的 *，用正则匹配）
  const depart = screen.getByLabelText(/出发时间/) as HTMLInputElement
  fireEvent.change(depart, { target: { value: opts.departAt } })
  fireEvent.blur(depart)
}

describe('阶段 4：交通安排模块', () => {
  describe('空状态', () => {
    it('无交通安排时显示"创建第一条交通安排"引导', async () => {
      renderPage()
      expect(
        await screen.findByRole('button', { name: /创建第一条交通安排/ }),
      ).toBeInTheDocument()
    })
  })

  describe('交通 CRUD', () => {
    it('新建交通：填表 → 保存 → 卡片出现在列表', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(await screen.findByRole('button', { name: '新建交通' }))
      await screen.findByPlaceholderText('如：CA1234')
      await fillTransportForm(user, {
        no: 'CA1234',
        from: '北京首都机场',
        to: '上海虹桥',
        departAt: '2026-10-01T08:00',
      })
      await user.click(screen.getByRole('button', { name: '保存' }))
      // modal 关闭后列表渲染
      await waitFor(
        () => {
          expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      expect(await screen.findByText('CA1234', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('北京首都机场')).toBeInTheDocument()
      expect(screen.getByText('上海虹桥')).toBeInTheDocument()
    })

    it('编辑交通：修改班次号后保存生效', async () => {
      const user = userEvent.setup()
      const t = await crud.addTransport({
        tripId: null,
        type: 'flight',
        no: 'CA1234',
        from: '北京',
        to: '上海',
        departAt: '2026-10-01T08:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      renderPage()
      await screen.findByText('CA1234', {}, FIND_OPTS)
      await user.click(screen.getByLabelText('编辑交通安排'))
      const noInput = await screen.findByDisplayValue('CA1234', {}, FIND_OPTS)
      await user.clear(noInput)
      await user.type(noInput, 'CA9999')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(screen.queryByDisplayValue('CA9999')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      await screen.findByText('CA9999', {}, FIND_OPTS)
      expect(screen.queryByText('CA1234')).not.toBeInTheDocument()
      const got = await crud.getTransport(t.id)
      expect(got?.no).toBe('CA9999')
    })

    it('删除交通：二次确认后从列表消失', async () => {
      const user = userEvent.setup()
      await crud.addTransport({
        tripId: null,
        type: 'train',
        no: 'G123',
        from: '北京南',
        to: '上海虹桥',
        departAt: '2026-10-01T09:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      renderPage()
      await screen.findByText('G123', {}, FIND_OPTS)
      await user.click(screen.getByLabelText('删除交通安排'))
      await screen.findByText('删除交通安排', {}, FIND_OPTS)
      await user.click(screen.getByRole('button', { name: '删除' }))
      await waitFor(
        () => {
          expect(screen.queryByText('G123')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      const all = await crud.listTransports()
      expect(all).toHaveLength(0)
    })
  })

  describe('排序与状态', () => {
    it('按出发时间升序排列', async () => {
      await crud.addTransport({
        tripId: null,
        type: 'train',
        no: 'G3',
        from: 'A',
        to: 'B',
        departAt: '2026-10-02T10:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      await crud.addTransport({
        tripId: null,
        type: 'train',
        no: 'G1',
        from: 'A',
        to: 'B',
        departAt: '2026-10-01T06:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      await crud.addTransport({
        tripId: null,
        type: 'train',
        no: 'G2',
        from: 'A',
        to: 'B',
        departAt: '2026-10-01T20:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      renderPage()
      await screen.findByText('G1', {}, FIND_OPTS)
      const cards = screen.getAllByText(/G[123]/).map((el) => el.textContent)
      // 升序：G1(06:00) → G2(20:00) → G3(次日 10:00)
      expect(cards).toEqual(['G1', 'G2', 'G3'])
    })

    it('状态切换按钮：点"已完成"后 DB 与 UI 同步', async () => {
      const user = userEvent.setup()
      const t = await crud.addTransport({
        tripId: null,
        type: 'flight',
        no: 'CA1',
        from: '北京',
        to: '上海',
        departAt: '2026-10-01T08:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      renderPage()
      await screen.findByText('CA1', {}, FIND_OPTS)
      // 初始 data-transport-status 应为 pending
      const cardBefore = screen.getByText('CA1').closest('[data-transport-id]') as HTMLElement
      expect(cardBefore.dataset.transportStatus).toBe('pending')
      // 点"已完成"按钮
      await user.click(screen.getByRole('button', { name: '已完成' }))
      await waitFor(
        () => {
          const card = screen.getByText('CA1').closest('[data-transport-id]') as HTMLElement
          expect(card.dataset.transportStatus).toBe('done')
        },
        { timeout: 3000 },
      )
      const got = await crud.getTransport(t.id)
      expect(got?.status).toBe('done')
    })
  })

  describe('类型图标区分', () => {
    it('航班/火车/大巴 显示对应图标与文案', async () => {
      await crud.addTransport({
        tripId: null,
        type: 'flight',
        no: 'CA1',
        from: 'A',
        to: 'B',
        departAt: '2026-10-01T08:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      await crud.addTransport({
        tripId: null,
        type: 'train',
        no: 'G1',
        from: 'A',
        to: 'B',
        departAt: '2026-10-01T09:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      await crud.addTransport({
        tripId: null,
        type: 'bus',
        no: 'B1',
        from: 'A',
        to: 'B',
        departAt: '2026-10-01T10:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      renderPage()
      // 类型文案标签
      expect(await screen.findByText('航班', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('火车')).toBeInTheDocument()
      expect(screen.getByText('大巴')).toBeInTheDocument()
      // 类型图标：lucide 线性 SVG（带 text-fg-2 类），每种交通一张卡
      for (const type of ['flight', 'train', 'bus']) {
        const card = document.querySelector(`[data-transport-type="${type}"]`)
        expect(card?.querySelector('svg.text-fg-2')).toBeTruthy()
      }
    })
  })

  describe('行程切换器筛选', () => {
    it('切换 currentTripId 后列表只显示对应行程的交通', async () => {
      const tA = await crud.addTrip({
        name: '北京行',
        destination: '北京',
        startDate: '2026-10-01',
        endDate: '2026-10-03',
        companions: [],
        budget: 5000,
        status: 'planning',
      })
      const tB = await crud.addTrip({
        name: '上海行',
        destination: '上海',
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        companions: [],
        budget: 5000,
        status: 'planning',
      })
      await crud.addTransport({
        tripId: tA.id,
        type: 'train',
        no: 'G-A',
        from: 'A',
        to: 'B',
        departAt: '2026-10-01T08:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      await crud.addTransport({
        tripId: tB.id,
        type: 'flight',
        no: 'CA-B',
        from: 'C',
        to: 'D',
        departAt: '2026-11-01T08:00',
        arriveAt: null,
        seat: '',
        terminal: '',
        checkinInfo: '',
        note: '',
        status: 'pending',
      })
      // 未选行程：显示全部
      renderPage()
      expect(await screen.findByText('G-A', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('CA-B')).toBeInTheDocument()
      // 切换到 A：只显示 G-A
      useTripStore.setState({ currentTripId: tA.id })
      await waitFor(
        () => {
          expect(screen.queryByText('CA-B')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      expect(screen.getByText('G-A')).toBeInTheDocument()
      // 切换到 B：只显示 CA-B
      useTripStore.setState({ currentTripId: tB.id })
      await waitFor(
        () => {
          expect(screen.queryByText('G-A')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      expect(screen.getByText('CA-B')).toBeInTheDocument()
    })
  })

  describe('关联行程默认值', () => {
    it('当前行程已选时，新建表单默认关联该行程', async () => {
      const tA = await crud.addTrip({
        name: '北京行',
        destination: '北京',
        startDate: '2026-10-01',
        endDate: '2026-10-03',
        companions: [],
        budget: 5000,
        status: 'planning',
      })
      useTripStore.setState({ currentTripId: tA.id })
      const user = userEvent.setup()
      renderPage()
      await user.click(await screen.findByRole('button', { name: '新建交通' }))
      const tripSelect = (await screen.findByLabelText('关联行程')) as HTMLSelectElement
      expect(tripSelect.value).toBe(tA.id)
    })
  })
})
