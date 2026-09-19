import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { resetDB } from '@/db/schema'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import Trips from '@/pages/Trips'

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

async function setupTripWithLinks() {
  const t = await crud.addTrip({
    name: '北京游',
    destination: '北京',
    startDate: '2026-10-01',
    endDate: '2026-10-03',
    companions: [],
    budget: 1000,
    status: 'planning',
  })
  const tr = await crud.addTransport({
    tripId: t.id,
    type: 'flight',
    no: 'CA1234',
    from: '上海',
    to: '北京',
    departAt: '2026-10-01T08:00',
    arriveAt: null,
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
    time: '2026-10-01T12:00',
    place: '',
    note: '',
  })
  const gu = await crud.addGuide({
    title: '故宫攻略',
    destination: '',
    category: 'sight',
    content: '',
    favorite: false,
    tags: [],
    tripId: t.id,
    attachmentIds: [],
  })
  return { t, tr, ex, gu }
}

// 在 ActivityFormModal 中，Checkbox 的 label 是 span 文本，input 是兄弟节点
async function clickCheckboxByLabel(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) {
  const label = await screen.findByText(text, {}, FIND_OPTS)
  const box = label.parentElement?.querySelector(
    'input[type="checkbox"]',
  ) as HTMLInputElement | null
  if (!box) throw new Error(`找不到对应 "${text}" 的复选框`)
  await user.click(box)
}

describe('阶段 9：跨模块关联与跳转', () => {
  describe('活动卡片图标跳转', () => {
    it('关联交通/消费/攻略后，卡片显示指向对应模块的链接', async () => {
      const { t, tr, ex, gu } = await setupTripWithLinks()
      await crud.addActivity({
        tripId: t.id,
        date: '2026-10-01',
        slot: 'morning',
        time: null,
        place: '故宫',
        type: 'sight',
        note: '',
        linkedTransportIds: [tr.id],
        linkedExpenseIds: [ex.id],
        linkedGuideIds: [gu.id],
      })
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      expect(await screen.findByText('故宫', {}, FIND_OPTS)).toBeInTheDocument()
      // 三个跳转链接出现且 href 正确
      expect(screen.getByRole('link', { name: '跳转交通' })).toHaveAttribute(
        'href',
        `/transports?highlight=${tr.id}`,
      )
      expect(screen.getByRole('link', { name: '跳转消费' })).toHaveAttribute(
        'href',
        `/expenses?highlight=${ex.id}`,
      )
      expect(screen.getByRole('link', { name: '跳转攻略' })).toHaveAttribute(
        'href',
        `/guides?highlight=${gu.id}`,
      )
    })

    it('无关联时显示"无关联"占位，不渲染跳转链接', async () => {
      const t = await crud.addTrip({
        name: '空活动行程',
        destination: '北京',
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
        place: '天安门',
        type: 'sight',
        note: '',
        linkedTransportIds: [],
        linkedExpenseIds: [],
        linkedGuideIds: [],
      })
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      expect(await screen.findByText('天安门', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('无关联')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: '跳转交通' })).not.toBeInTheDocument()
    })
  })

  describe('活动表单关联选择器', () => {
    it('勾选交通/消费/攻略后保存，活动保存了关联数组', async () => {
      const user = userEvent.setup()
      const { t, tr, ex, gu } = await setupTripWithLinks()
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      // 进入行程详情（空活动），点"添加活动"
      await screen.findByText('还没有活动', {}, FIND_OPTS)
      await user.click(screen.getByRole('button', { name: '添加活动' }))
      await screen.findByPlaceholderText('如：故宫')
      await user.type(screen.getByPlaceholderText('如：故宫'), '故宫')
      // 勾选三个关联
      await clickCheckboxByLabel(user, 'CA1234')
      await clickCheckboxByLabel(user, '¥100.00')
      await clickCheckboxByLabel(user, '故宫攻略')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(
            screen.queryByRole('button', { name: '保存' }),
          ).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      const acts = await crud.listActivities(t.id)
      expect(acts).toHaveLength(1)
      expect(acts[0].linkedTransportIds).toEqual([tr.id])
      expect(acts[0].linkedExpenseIds).toEqual([ex.id])
      expect(acts[0].linkedGuideIds).toEqual([gu.id])
      // 卡片出现跳转链接
      expect(
        await screen.findByRole('link', { name: '跳转交通' }, FIND_OPTS),
      ).toHaveAttribute('href', `/transports?highlight=${tr.id}`)
    })

    it('取消勾选后再保存，关联被移除', async () => {
      const user = userEvent.setup()
      const { t, tr, ex, gu } = await setupTripWithLinks()
      // 先建一个带全部关联的活动
      const a = await crud.addActivity({
        tripId: t.id,
        date: '2026-10-01',
        slot: 'morning',
        time: null,
        place: '故宫',
        type: 'sight',
        note: '',
        linkedTransportIds: [tr.id],
        linkedExpenseIds: [ex.id],
        linkedGuideIds: [gu.id],
      })
      useTripStore.setState({ currentTripId: t.id })
      renderPage()
      await screen.findByText('故宫', {}, FIND_OPTS)
      // 点活动卡片进入编辑
      await user.click(screen.getByText('故宫'))
      await screen.findByDisplayValue('故宫', FIND_OPTS)
      // 取消交通勾选（复选框已选中）
      const trLabel = screen.getByText('CA1234')
      const trBox = trLabel.parentElement?.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement
      expect(trBox.checked).toBe(true)
      await user.click(trBox)
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(
            screen.queryByRole('button', { name: '保存' }),
          ).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      const got = await crud.getActivity(a.id)
      expect(got?.linkedTransportIds).toEqual([])
      expect(got?.linkedExpenseIds).toEqual([ex.id])
      expect(got?.linkedGuideIds).toEqual([gu.id])
    })
  })
})
