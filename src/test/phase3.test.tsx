import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { resetDB } from '@/db/schema'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import Trips from '@/pages/Trips'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

// 测试超时配置：useLiveQuery 异步加载需要足够时间
const FIND_OPTS = { timeout: 3000 } as const

function renderPage() {
  return render(
    <MemoryRouter>
      <Trips />
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

describe('阶段 3：行程计划模块', () => {
  describe('空状态', () => {
    it('无行程时显示"创建第一个行程"引导', async () => {
      renderPage()
      expect(
        await screen.findByRole('button', { name: /创建第一个行程/ }),
      ).toBeInTheDocument()
    })
  })

  describe('行程 CRUD', () => {
    it('新建行程：填表 → 保存 → 卡片出现在列表', async () => {
      const user = userEvent.setup()
      renderPage()
      // 点"新建行程"
      await user.click(await screen.findByRole('button', { name: '新建行程' }))
      // 表单字段
      const nameInput = await screen.findByPlaceholderText('如：十一北京5日游')
      await user.type(nameInput, '十一北京5日游')
      await user.type(
        screen.getByPlaceholderText('如：北京'),
        '北京',
      )
      await user.type(
        screen.getByPlaceholderText('如：张三, 李四'),
        '张三, 李四',
      )
      // 点保存
      await user.click(screen.getByRole('button', { name: '保存' }))
      // 列表出现新行程
      await screen.findByText('十一北京5日游')
      expect(screen.getByText('北京')).toBeInTheDocument()
    })

    it('编辑行程：修改名称后保存生效', async () => {
      const user = userEvent.setup()
      const t = await crud.addTrip({
        name: '原行程',
        destination: '上海',
        startDate: '2026-04-01',
        endDate: '2026-04-03',
        companions: [],
        budget: 2000,
        status: 'planning',
      })
      renderPage()
      await screen.findByText('原行程', {}, FIND_OPTS)
      await user.click(screen.getByLabelText('编辑行程'))
      const name = await screen.findByDisplayValue('原行程', FIND_OPTS)
      await user.clear(name)
      await user.type(name, '改后行程')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await screen.findByText('改后行程', {}, FIND_OPTS)
      expect(screen.queryByText('原行程')).not.toBeInTheDocument()
      // 数据库实际更新
      const got = await crud.getTrip(t.id)
      expect(got?.name).toBe('改后行程')
    })

    it('删除行程：二次确认后从列表消失，子数据保留', async () => {
      const user = userEvent.setup()
      const t = await crud.addTrip({
        name: 'T',
        destination: 'X',
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
        place: '故宫',
        type: 'sight',
        note: '',
        linkedExpenseIds: [],
        linkedTransportIds: [],
        linkedGuideIds: [],
      })
      renderPage()
      await screen.findByText('T', {}, FIND_OPTS)
      await user.click(screen.getByLabelText('删除行程'))
      await screen.findByText('删除行程', {}, FIND_OPTS)
      await user.click(screen.getByRole('button', { name: '删除' }))
      await waitFor(
        () => {
          expect(screen.queryByText('T')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      // 子数据保留但 tripId 解除
      const acts = await crud.listActivities()
      expect(acts).toHaveLength(1)
      expect(acts[0].tripId).toBeNull()
    })
  })

  describe('活动 CRUD', () => {
    it('点击行程卡片进入详情，并显示空活动状态引导', async () => {
      const user = userEvent.setup()
      await crud.addTrip({
        name: '北京行',
        destination: '北京',
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        companions: [],
        budget: 5000,
        status: 'planning',
      })
      renderPage()
      // 列表点击进入详情
      await user.click(await screen.findByText('北京行', {}, FIND_OPTS))
      // 空状态引导（详情视图）
      await screen.findByText('还没有活动', {}, FIND_OPTS)
    })

    it('添加活动后按时段（上午/下午/晚上）分组显示', async () => {
      const user = userEvent.setup()
      const t = await crud.addTrip({
        name: '北京',
        destination: '北京',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        companions: [],
        budget: 5000,
        status: 'planning',
      })
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      await screen.findByText('还没有活动', {}, FIND_OPTS)
      await user.click(screen.getByRole('button', { name: '添加活动' }))
      await screen.findByPlaceholderText('如：故宫')
      await user.type(screen.getByPlaceholderText('如：故宫'), '故宫')
      await user.click(screen.getByRole('button', { name: '保存' }))
      // 等 modal 关闭后活动卡片渲染
      await waitFor(
        () => {
          expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      await screen.findByText('故宫', {}, FIND_OPTS)
      // 时段分组的标签
      expect(screen.getByText('上午')).toBeInTheDocument()
      expect(screen.getAllByText(/（无活动）/).length).toBeGreaterThan(0) // 下午/晚上空
    })

    it('编辑活动后变更生效', async () => {
      const user = userEvent.setup()
      const t = await crud.addTrip({
        name: '北京',
        destination: '北京',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        companions: [],
        budget: 5000,
        status: 'planning',
      })
      const a = await crud.addActivity({
        tripId: t.id,
        date: '2026-10-01',
        slot: 'morning',
        time: null,
        place: '故宫',
        type: 'sight',
        note: '',
        linkedExpenseIds: [],
        linkedTransportIds: [],
        linkedGuideIds: [],
      })
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      // 点活动卡片进入编辑（活动卡片是 li）
      await screen.findByText('故宫', {}, FIND_OPTS)
      const li = screen.getByText('故宫').closest('li')!
      await user.click(li)
      await screen.findByDisplayValue('故宫', FIND_OPTS)
      const nameInput = screen.getByDisplayValue('故宫') as HTMLInputElement
      await user.clear(nameInput)
      await user.type(nameInput, '颐和园')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(screen.queryByDisplayValue('颐和园')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      await screen.findByText('颐和园', {}, FIND_OPTS)
      const got = await crud.getActivity(a.id)
      expect(got?.place).toBe('颐和园')
    })

    it('删除活动二次确认后消失', async () => {
      const user = userEvent.setup()
      const t = await crud.addTrip({
        name: '北京',
        destination: '北京',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        companions: [],
        budget: 5000,
        status: 'planning',
      })
      await crud.addActivity({
        tripId: t.id,
        date: '2026-10-01',
        slot: 'morning',
        time: null,
        place: '故宫',
        type: 'sight',
        note: '',
        linkedExpenseIds: [],
        linkedTransportIds: [],
        linkedGuideIds: [],
      })
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      await screen.findByText('故宫', {}, FIND_OPTS)
      // 删除按钮在活动卡片内
      const delBtn = screen
        .getAllByRole('button')
        .find((b) => b.querySelector('svg.lucide-trash2, svg[class*="lucide-trash-2"]'))
      expect(delBtn).toBeTruthy()
      await user.click(delBtn!)
      await screen.findByText('删除活动', {}, FIND_OPTS)
      await user.click(screen.getByRole('button', { name: '删除' }))
      await waitFor(
        () => {
          expect(screen.queryByText('故宫')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
    })
  })

  describe('行程切换器联动', () => {
    it('点列表中的行程卡片即设为当前行程', async () => {
      const user = userEvent.setup()
      await crud.addTrip({
        name: '北京行',
        destination: '北京',
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        companions: [],
        budget: 5000,
        status: 'planning',
      })
      renderPage()
      await user.click(await screen.findByText('北京行'))
      expect(useTripStore.getState().currentTripId).not.toBeNull()
    })

    it('进入详情后点返回按钮清除当前行程', async () => {
      const user = userEvent.setup()
      await crud.addTrip({
        name: '北京行',
        destination: '北京',
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        companions: [],
        budget: 5000,
        status: 'planning',
      })
      renderPage()
      await user.click(await screen.findByText('北京行'))
      expect(useTripStore.getState().currentTripId).not.toBeNull()
      await user.click(screen.getByRole('button', { name: /返回行程列表/ }))
      expect(useTripStore.getState().currentTripId).toBeNull()
      await screen.findByText('新建行程')
    })
  })

  describe('行程状态徽章', () => {
    it('显示计划中/进行中/已完成徽章', async () => {
      await crud.addTrip({
        name: '计划行',
        destination: 'A',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      await crud.addTrip({
        name: '进行行',
        destination: 'A',
        startDate: '2026-02-01',
        endDate: '2026-02-02',
        companions: [],
        budget: 1000,
        status: 'ongoing',
      })
      await crud.addTrip({
        name: '完成行',
        destination: 'A',
        startDate: '2026-03-01',
        endDate: '2026-03-02',
        companions: [],
        budget: 1000,
        status: 'done',
      })
      renderPage()
      expect(await screen.findByText('计划中')).toBeInTheDocument()
      expect(screen.getByText('进行中')).toBeInTheDocument()
      expect(screen.getByText('已完成')).toBeInTheDocument()
    })
  })
})
