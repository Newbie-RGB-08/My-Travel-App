import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { resetDB } from '@/db/schema'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import Expenses from '@/pages/Expenses'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

const FIND_OPTS = { timeout: 3000 } as const

function renderPage() {
  return render(
    <MemoryRouter>
      <Expenses />
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

// 填写消费表单关键字段（amount/time 必填）
async function fillExpenseForm(
  user: ReturnType<typeof userEvent.setup>,
  opts: { amount: string; category?: string; time: string; place?: string },
) {
  await user.type(screen.getByPlaceholderText('如：123.45'), opts.amount)
  if (opts.category) {
    await user.selectOptions(screen.getByLabelText('分类'), opts.category)
  }
  const timeInput = screen.getByLabelText(/时间/) as HTMLInputElement
  fireEvent.change(timeInput, { target: { value: opts.time } })
  fireEvent.blur(timeInput)
  if (opts.place) {
    await user.type(screen.getByPlaceholderText('如：故宫南门售票处'), opts.place)
  }
}

// 金额会出现在总花费/卡片/图例多处，统一用 getAllByText 取首个
function amountEls(text: string) {
  return screen.getAllByText(text)
}

describe('阶段 5：消费记录模块', () => {
  describe('空状态', () => {
    it('无消费记录时显示"创建第一条消费记录"引导', async () => {
      renderPage()
      expect(
        await screen.findByRole('button', { name: /创建第一条消费记录/ }),
      ).toBeInTheDocument()
    })
  })

  describe('消费 CRUD', () => {
    it('新建消费：填表 → 保存 → 卡片出现且总额更新', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(await screen.findByRole('button', { name: '新建消费' }))
      await screen.findByPlaceholderText('如：123.45')
      await fillExpenseForm(user, {
        amount: '120.5',
        time: '2026-10-01T12:00',
        place: '故宫售票处',
      })
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      // 卡片出现（地点唯一）
      expect(await screen.findByText('故宫售票处', {}, FIND_OPTS)).toBeInTheDocument()
      // 金额 ¥120.50 出现（总花费/卡片/图例）
      expect(amountEls('¥120.50').length).toBeGreaterThan(0)
      // 默认分类为 food（餐饮）
      const card = screen.getByText('故宫售票处').closest('[data-expense-id]')
      expect(card?.getAttribute('data-expense-category')).toBe('food')
    })

    it('编辑消费：修改金额后保存生效', async () => {
      const user = userEvent.setup()
      const e = await crud.addExpense({
        tripId: null,
        activityId: null,
        amount: 50,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T12:00',
        place: 'A地点',
        note: '',
      })
      renderPage()
      await screen.findByText('A地点', {}, FIND_OPTS)
      expect(amountEls('¥50.00').length).toBeGreaterThan(0)
      await user.click(screen.getByLabelText('编辑消费记录'))
      const amountInput = await screen.findByDisplayValue('50', FIND_OPTS)
      await user.clear(amountInput)
      await user.type(amountInput, '200')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(screen.queryByDisplayValue('200')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      await waitFor(
        () => {
          expect(amountEls('¥200.00').length).toBeGreaterThan(0)
        },
        { timeout: 3000 },
      )
      expect(screen.queryAllByText('¥50.00')).toHaveLength(0)
      const got = await crud.getExpense(e.id)
      expect(got?.amount).toBe(200)
    })

    it('删除消费：二次确认后消失', async () => {
      const user = userEvent.setup()
      await crud.addExpense({
        tripId: null,
        activityId: null,
        amount: 30,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T12:00',
        place: '删除地点',
        note: '',
      })
      renderPage()
      await screen.findByText('删除地点', {}, FIND_OPTS)
      await user.click(screen.getByLabelText('删除消费记录'))
      await screen.findByText('删除消费记录', {}, FIND_OPTS)
      await user.click(screen.getByRole('button', { name: '删除' }))
      await waitFor(
        () => {
          expect(screen.queryByText('删除地点')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      const all = await crud.listExpenses()
      expect(all).toHaveLength(0)
    })
  })

  describe('排序与分类', () => {
    it('按时间倒序排列', async () => {
      await crud.addExpense({
        tripId: null,
        activityId: null,
        amount: 10,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T08:00',
        place: '早地点',
        note: '',
      })
      await crud.addExpense({
        tripId: null,
        activityId: null,
        amount: 20,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-02T08:00',
        place: '中地点',
        note: '',
      })
      await crud.addExpense({
        tripId: null,
        activityId: null,
        amount: 30,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T20:00',
        place: '晚地点',
        note: '',
      })
      renderPage()
      await screen.findByText('早地点', {}, FIND_OPTS)
      // 倒序：中(10-02) → 晚(10-01 20:00) → 早(10-01 08:00)
      const places = screen
        .getAllByText(/早地点|中地点|晚地点/)
        .map((el) => el.textContent)
      expect(places).toEqual(['中地点', '晚地点', '早地点'])
    })

    it('分类筛选：只显示所选分类', async () => {
      await crud.addExpense({
        tripId: null,
        activityId: null,
        amount: 10,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T08:00',
        place: '饭地点',
        note: '',
      })
      await crud.addExpense({
        tripId: null,
        activityId: null,
        amount: 20,
        currency: 'CNY',
        category: 'ticket',
        time: '2026-10-01T09:00',
        place: '票地点',
        note: '',
      })
      renderPage()
      await screen.findByText('饭地点', {}, FIND_OPTS)
      expect(screen.getByText('票地点')).toBeInTheDocument()
      const user2 = userEvent.setup()
      await user2.click(screen.getByRole('button', { name: '门票' }))
      await waitFor(() => {
        expect(screen.queryByText('饭地点')).not.toBeInTheDocument()
      })
      expect(screen.getByText('票地点')).toBeInTheDocument()
    })
  })

  describe('汇总', () => {
    it('总花费与分类汇总正确', async () => {
      await crud.addExpense({
        tripId: null,
        activityId: null,
        amount: 100,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T08:00',
        place: '',
        note: '',
      })
      await crud.addExpense({
        tripId: null,
        activityId: null,
        amount: 200,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T09:00',
        place: '',
        note: '',
      })
      await crud.addExpense({
        tripId: null,
        activityId: null,
        amount: 300,
        currency: 'CNY',
        category: 'ticket',
        time: '2026-10-01T10:00',
        place: '',
        note: '',
      })
      renderPage()
      // 总花费 ¥600.00（仅出现在汇总区）
      expect(await screen.findByText('¥600.00', {}, FIND_OPTS)).toBeInTheDocument()
      // 分类图例 + 卡片均含 ¥300.00
      expect(amountEls('¥300.00').length).toBeGreaterThanOrEqual(2)
    })

    it('预算 vs 实际：有预算行程显示对比', async () => {
      const t = await crud.addTrip({
        name: '北京行',
        destination: '北京',
        startDate: '2026-10-01',
        endDate: '2026-10-03',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      await crud.addExpense({
        tripId: t.id,
        activityId: null,
        amount: 300,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T08:00',
        place: '',
        note: '',
      })
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      // 预算 ¥1,000.00
      expect(await screen.findByText(/¥1,000\.00/, FIND_OPTS)).toBeInTheDocument()
      // 实际 ¥300.00 出现多处
      expect(amountEls('¥300.00').length).toBeGreaterThan(0)
      // 剩余 ¥700.00
      expect(screen.getByText(/剩余/).textContent).toContain('700.00')
    })

    it('超支时显示"超支"红字', async () => {
      const t = await crud.addTrip({
        name: '超支行',
        destination: 'A',
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        companions: [],
        budget: 100,
        status: 'planning',
      })
      await crud.addExpense({
        tripId: t.id,
        activityId: null,
        amount: 250,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T08:00',
        place: '',
        note: '',
      })
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      expect(await screen.findByText(/超支/, FIND_OPTS)).toBeInTheDocument()
    })
  })

  describe('行程切换器筛选', () => {
    it('切换 currentTripId 后列表与汇总同步', async () => {
      const tA = await crud.addTrip({
        name: 'A 行程',
        destination: 'A',
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      const tB = await crud.addTrip({
        name: 'B 行程',
        destination: 'B',
        startDate: '2026-11-01',
        endDate: '2026-11-02',
        companions: [],
        budget: 2000,
        status: 'planning',
      })
      await crud.addExpense({
        tripId: tA.id,
        activityId: null,
        amount: 100,
        currency: 'CNY',
        category: 'food',
        time: '2026-10-01T08:00',
        place: 'A饭',
        note: '',
      })
      await crud.addExpense({
        tripId: tB.id,
        activityId: null,
        amount: 200,
        currency: 'CNY',
        category: 'food',
        time: '2026-11-01T08:00',
        place: 'B饭',
        note: '',
      })
      // 未选行程：显示全部，总花费 ¥300.00
      renderPage()
      expect(await screen.findByText('A饭', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('B饭')).toBeInTheDocument()
      expect(amountEls('¥300.00').length).toBeGreaterThan(0)
      // 切换到 A：只显示 A饭，总花费 ¥100.00，预算 ¥1,000.00
      useTripStore.setState({ currentTripId: tA.id })
      await waitFor(
        () => {
          expect(screen.queryByText('B饭')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      expect(screen.getByText('A饭')).toBeInTheDocument()
      expect(amountEls('¥100.00').length).toBeGreaterThan(0)
      expect(screen.getByText(/¥1,000\.00/)).toBeInTheDocument()
      // 切换到 B：只显示 B饭，总花费 ¥200.00，预算 ¥2,000.00
      useTripStore.setState({ currentTripId: tB.id })
      await waitFor(
        () => {
          expect(screen.queryByText('A饭')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      expect(screen.getByText('B饭')).toBeInTheDocument()
      expect(amountEls('¥200.00').length).toBeGreaterThan(0)
      expect(screen.getByText(/¥2,000\.00/)).toBeInTheDocument()
    })
  })

  describe('关联活动依赖行程', () => {
    it('选关联行程后，关联活动下拉列出该行程的活动', async () => {
      const user = userEvent.setup()
      const t = await crud.addTrip({
        name: 'T',
        destination: 'X',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        companions: [],
        budget: 0,
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
      renderPage()
      await user.click(await screen.findByRole('button', { name: '新建消费' }))
      const activitySelect = (await screen.findByLabelText(
        /关联活动/,
      )) as HTMLSelectElement
      expect(activitySelect.disabled).toBe(true)
      // 选关联行程
      await user.selectOptions(screen.getByLabelText('关联行程'), t.id)
      await waitFor(() => {
        const sel = screen.getByLabelText(/关联活动/) as HTMLSelectElement
        expect(sel.disabled).toBe(false)
      })
      const sel = screen.getByLabelText(/关联活动/) as HTMLSelectElement
      const opts = Array.from(sel.options).map((o) => o.textContent ?? '')
      expect(opts.some((opt) => opt.includes('故宫'))).toBe(true)
    })
  })
})
