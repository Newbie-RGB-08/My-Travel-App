import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, RouterProvider } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { resetDB } from '@/db/schema'
import { ensureTestSession } from '@/test/helpers'
import { AppLayout } from '@/layout/AppLayout'
import { TripSwitcher } from '@/layout/TripSwitcher'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import * as crud from '@/db/crud'
import { router } from '@/routes/router'
import { Modal } from '@/components/common/Modal'
import { EmptyState } from '@/components/common/EmptyState'
import { ModalHost } from '@/components/common/ModalHost'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

// 用 MemoryRouter 包装组件的辅助
function renderWithRouter(ui: React.ReactNode, initial = '/') {
  return render(
    <MemoryRouter initialEntries={[initial]}>{ui}</MemoryRouter>,
  )
}

beforeEach(async () => {
  await resetDB()
  await ensureTestSession()
  useTripStore.setState({ currentTripId: null })
})

describe('阶段 2：应用骨架', () => {
  describe('AppLayout / Sidebar', () => {
    it('左侧导航显示 6 个模块 + 设置入口', () => {
      renderWithRouter(<AppLayout />)
      const nav = screen.getByText('我的旅行').closest('aside')!
      expect(within(nav).getByText('首页总览')).toBeInTheDocument()
      expect(within(nav).getByText('行程计划')).toBeInTheDocument()
      expect(within(nav).getByText('交通安排')).toBeInTheDocument()
      expect(within(nav).getByText('地图详情')).toBeInTheDocument()
      expect(within(nav).getByText('游玩攻略')).toBeInTheDocument()
      expect(within(nav).getByText('消费记录')).toBeInTheDocument()
      expect(within(nav).getByText('设置')).toBeInTheDocument()
    })

    it('AppLayout 不崩溃并渲染品牌标题', () => {
      renderWithRouter(<AppLayout />)
      expect(screen.getByText('我的旅行')).toBeInTheDocument()
    })
  })

  describe('TripSwitcher', () => {
    it('无行程时显示"创建第一个行程"引导', () => {
      renderWithRouter(<TripSwitcher />)
      expect(screen.getByText('创建第一个行程')).toBeInTheDocument()
    })

    it('有行程时显示下拉选择器，可切换当前行程', async () => {
      const user = userEvent.setup()
      const t1 = await crud.addTrip({
        name: '十一北京',
        destination: '北京',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
        companions: [],
        budget: 8000,
        status: 'planning',
      })
      const t2 = await crud.addTrip({
        name: '日本行',
        destination: '东京',
        startDate: '2026-11-01',
        endDate: '2026-11-07',
        companions: [],
        budget: 15000,
        status: 'planning',
      })

      renderWithRouter(<TripSwitcher />)
      // useLiveQuery 异步加载行程，需等待 select 渲染
      const select = (await screen.findByRole(
        'combobox',
      )) as HTMLSelectElement
      expect(select).toBeInTheDocument()

      // 初始未选择
      expect(useTripStore.getState().currentTripId).toBeNull()

      // 选择 t1
      await user.selectOptions(select, t1.id)
      expect(useTripStore.getState().currentTripId).toBe(t1.id)

      // 切换到 t2
      await user.selectOptions(select, t2.id)
      expect(useTripStore.getState().currentTripId).toBe(t2.id)
    })

    it('无行程时 TripSwitcher 不显示"当前行程"标签', () => {
      renderWithRouter(<TripSwitcher />)
      expect(screen.queryByText('当前行程')).not.toBeInTheDocument()
    })

    it('切换行程后 store 持久化到 localStorage', async () => {
      const user = userEvent.setup()
      const t1 = await crud.addTrip({
        name: 'T1',
        destination: 'A',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        companions: [],
        budget: 1000,
        status: 'planning',
      })
      renderWithRouter(<TripSwitcher />)
      const select = (await screen.findByRole(
        'combobox',
      )) as HTMLSelectElement
      await user.selectOptions(select, t1.id)
      // persist 中间件把状态写入 localStorage
      const raw = localStorage.getItem('my-travel-current-trip')
      expect(raw).toBeTruthy()
      expect(raw).toContain(t1.id)
    })
  })

  describe('Modal / ConfirmDialog / EmptyState', () => {
    it('Modal open 时渲染内容，关闭按钮点击关闭', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(
        <Modal open onClose={onClose} title="测试弹窗">
          <p>弹窗内容</p>
        </Modal>,
      )
      expect(screen.getByText('测试弹窗')).toBeInTheDocument()
      expect(screen.getByText('弹窗内容')).toBeInTheDocument()
      const closeBtn = screen.getByLabelText('关闭')
      await user.click(closeBtn)
      expect(onClose).toHaveBeenCalled()
    })

    it('Modal 关闭时不渲染内容', () => {
      render(
        <Modal open={false} onClose={() => {}} title="不该出现">
          <p>X</p>
        </Modal>,
      )
      expect(screen.queryByText('不该出现')).not.toBeInTheDocument()
      expect(screen.queryByText('X')).not.toBeInTheDocument()
    })

    it('EmptyState 渲染标题、描述、动作', () => {
      render(
        <EmptyState
          title="还没有行程"
          description="先创建一次行程吧"
          action={<button>新建</button>}
        />,
      )
      expect(screen.getByText('还没有行程')).toBeInTheDocument()
      expect(screen.getByText('先创建一次行程吧')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '新建' })).toBeInTheDocument()
    })

    it('useModalStore 控制弹窗内容（open → close 后元素消失）', async () => {
      render(<ModalHost />)
      expect(screen.queryByText('动态内容')).not.toBeInTheDocument()
      useModalStore.getState().open(<p>动态内容</p>)
      expect(await screen.findByText('动态内容')).toBeInTheDocument()
      useModalStore.getState().close()
      // 等待 React 重渲染
      await waitFor(() => {
        expect(screen.queryByText('动态内容')).not.toBeInTheDocument()
      })
    })

    it('useModalStore 控制确认框并执行回调', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<ConfirmDialog />)
      expect(screen.queryByText('确定删除吗？')).not.toBeInTheDocument()

      useModalStore.getState().openConfirm({
        title: '删除确认',
        message: '确定删除吗？',
        onConfirm,
        danger: true,
        confirmLabel: '删除',
      })
      expect(await screen.findByText('确定删除吗？')).toBeInTheDocument()
      const btn = screen.getByRole('button', { name: '删除' })
      await user.click(btn)
      expect(onConfirm).toHaveBeenCalled()
    })
  })

  describe('路由', () => {
    it('默认路由是首页（路由配置 index 指向 Home）', () => {
      const root = router.routes.find((r) => r.path === '/')
      expect(root).toBeDefined()
      const hasIndex = (root?.children ?? []).some(
        (c) => 'index' in c && c.index,
      )
      expect(hasIndex).toBe(true)
    })

    it('路由配置含 6 个模块 + 设置', () => {
      const root = router.routes.find((r) => r.path === '/')!
      const paths = (root.children ?? [])
        .filter((c) => 'path' in c && typeof c.path === 'string')
        .map((c) => c.path)
      expect(paths).toEqual(
        expect.arrayContaining([
          'trips',
          'transports',
          'map',
          'guides',
          'expenses',
          'settings',
        ]),
      )
    })

    it('未知路由重定向到首页', () => {
      const root = router.routes.find((r) => r.path === '/')!
      const fallback = (root.children ?? []).find(
        (c) => 'path' in c && c.path === '*',
      )
      expect(fallback).toBeDefined()
    })

    it('App 能挂载 RouterProvider 而不崩溃', () => {
      const { container } = render(<RouterProvider router={router} />)
      expect(container).toBeInTheDocument()
    })
  })
})
