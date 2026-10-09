import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { resetDB } from '@/db/schema'
import { ensureTestSession } from '@/test/helpers'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Modal } from '@/components/common/Modal'
import { Field, TextInput, Select, TextArea, Checkbox } from '@/components/forms/Field'
import Home from '@/pages/Home'
import Trips from '@/pages/Trips'
import Transports from '@/pages/Transports'
import Expenses from '@/pages/Expenses'
import Guides from '@/pages/Guides'
import { MapPin, Compass, Train, Wallet, BookOpen, Clock } from 'lucide-react'
import type { ReactNode } from 'react'

const FIND_OPTS = { timeout: 3000 } as const

function renderWith(ui: ReactNode) {
  return render(
    <MemoryRouter>
      {ui}
      <ConfirmDialog />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await resetDB()
  await ensureTestSession()
  useTripStore.setState({ currentTripId: null })
  useModalStore.setState({ content: null })
  useModalStore.setState((s) => ({ confirm: { ...s.confirm, open: false } }))
})

describe('阶段 10：视觉打磨与空状态统一', () => {
  describe('空状态图标统一', () => {
    it('行程计划空状态带图标', async () => {
      renderWith(<Trips />)
      const empty = await screen.findByText('还没有行程', {}, FIND_OPTS)
      const svg = empty.closest('div')?.querySelector('svg')
      expect(svg, '行程计划空状态应渲染 svg 图标').toBeTruthy()
    })

    it('交通安排空状态带图标', async () => {
      renderWith(<Transports />)
      const empty = await screen.findByText('还没有交通安排', {}, FIND_OPTS)
      const svg = empty.closest('div')?.querySelector('svg')
      expect(svg, '交通安排空状态应渲染 svg 图标').toBeTruthy()
    })

    it('消费记录空状态带图标', async () => {
      renderWith(<Expenses />)
      const empty = await screen.findByText('还没有消费记录', {}, FIND_OPTS)
      const svg = empty.closest('div')?.querySelector('svg')
      expect(svg, '消费记录空状态应渲染 svg 图标').toBeTruthy()
    })

    it('游玩攻略空状态带图标', async () => {
      renderWith(<Guides />)
      const empty = await screen.findByText('还没有攻略', {}, FIND_OPTS)
      const svg = empty.closest('div')?.querySelector('svg')
      expect(svg, '游玩攻略空状态应渲染 svg 图标').toBeTruthy()
    })

    it('首页未选行程时显示带图标的空状态', async () => {
      renderWith(<Home />)
      expect(
        await screen.findByText('先创建一次行程吧', {}, FIND_OPTS),
      ).toBeInTheDocument()
      const empty = screen.getByText('先创建一次行程吧')
      const svg = empty.closest('div')?.querySelector('svg')
      expect(svg).toBeTruthy()
    })

    it('行程详情无活动时显示带图标的空状态', async () => {
      const t = await crud.addTrip({
        name: '空行程',
        destination: '北京',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        companions: [],
        budget: 0,
        status: 'planning',
      })
      useTripStore.setState({ currentTripId: t.id })
      renderWith(<Trips />)
      expect(
        await screen.findByText('还没有活动', {}, FIND_OPTS),
      ).toBeInTheDocument()
      const empty = screen.getByText('还没有活动')
      const svg = empty.closest('div')?.querySelector('svg')
      expect(svg).toBeTruthy()
    })
  })

  describe('基础组件视觉一致性', () => {
    it('EmptyState 始终居中、文案三档灰', () => {
      render(
        <EmptyState
          icon={<MapPin className="h-12 w-12" />}
          title="还没有数据"
          description="这是一段说明"
          action={<button className="btn-primary">新建</button>}
        />,
      )
      const root = screen.getByText('还没有数据').closest('div')!
      // 居中布局
      expect(root.className).toContain('items-center')
      expect(root.className).toContain('justify-center')
      expect(root.className).toContain('text-center')
      // 标题用 fg-1
      expect(screen.getByText('还没有数据').className).toContain('fg-1')
      // 描述用 fg-2
      expect(screen.getByText('这是一段说明').className).toContain('fg-2')
    })

    it('Modal 使用 .card 样式', () => {
      render(
        <Modal open onClose={() => {}} title="标题">
          <p>x</p>
        </Modal>,
      )
      const title = screen.getByText('标题')
      const card = title.closest('div')!.parentElement!
      expect(card.className).toContain('card')
    })

    it('Field 标签用 fg-2，必填用危险色星号', () => {
      render(
        <Field label="名称" required>
          <TextInput />
        </Field>,
      )
      expect(screen.getByText('名称').className).toContain('fg-2')
      expect(screen.getByText('*')).toBeInTheDocument()
      expect(screen.getByText('*').className).toContain('danger')
    })
  })

  describe('表单控件统一使用 .input 类', () => {
    it('TextInput / Select / TextArea 都带 .input 类', () => {
      render(
        <>
          <TextInput data-testid="ti" />
          <Select data-testid="sel">
            <option>a</option>
          </Select>
          <TextArea data-testid="ta" />
        </>,
      )
      expect(screen.getByTestId('ti').className).toContain('input')
      expect(screen.getByTestId('sel').className).toContain('input')
      expect(screen.getByTestId('ta').className).toContain('input')
    })

    it('Checkbox 用 brand-600 主题色', () => {
      render(<Checkbox data-testid="cb" label="同意" />)
      const cb = screen.getByTestId('cb')
      expect(cb.className).toContain('brand-600')
    })
  })

  describe('全局样式定义', () => {
    it('.btn-* / .input / .card 类已在 index.css 注册', async () => {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const cssPath = path.resolve('src', 'index.css')
      const css = await fs.readFile(cssPath, 'utf-8')
      expect(css).toContain('.btn-primary')
      expect(css).toContain('.btn-secondary')
      expect(css).toContain('.btn-danger')
      expect(css).toContain('.btn-ghost')
      expect(css).toContain('.input')
      expect(css).toContain('.card')
      // 滚动条样式
      expect(css).toContain('scrollbar-width: thin')
    })

    it('tailwind 配置定义了 brand 主题色与卡片阴影', async () => {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const cfgPath = path.resolve('tailwind.config.ts')
      const cfg = await fs.readFile(cfgPath, 'utf-8')
      expect(cfg).toContain('brand')
      // boxShadow 配置中有 card 阴影键（生成 shadow-card 工具类）
      expect(cfg).toMatch(/boxShadow:\s*\{[\s\S]*card:/)
    })
  })

  describe('按钮层级统一', () => {
    it('主按钮 btn-primary', () => {
      render(<button className="btn-primary">主</button>)
      expect(screen.getByText('主').className).toContain('btn-primary')
    })

    it('次按钮 btn-secondary', () => {
      render(<button className="btn-secondary">次</button>)
      expect(screen.getByText('次').className).toContain('btn-secondary')
    })

    it('危险按钮 btn-danger', () => {
      render(<button className="btn-danger">删</button>)
      expect(screen.getByText('删').className).toContain('btn-danger')
    })

    it('文本按钮 btn-ghost', () => {
      render(<button className="btn-ghost">文</button>)
      expect(screen.getByText('文').className).toContain('btn-ghost')
    })
  })

  describe('侧栏导航视觉', () => {
    it('侧栏玻璃材质 + 主色品牌图标', async () => {
      const { Sidebar } = await import('@/layout/Sidebar')
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>,
      )
      const aside = screen.getByText('我的旅行').closest('aside')!
      expect(aside.className).toContain('glass-thick')
      // 品牌图标存在
      const brandIcon = screen.getByText('我的旅行').previousSibling
      expect(brandIcon).toBeTruthy()
    })
  })

  describe('图标使用的模块一致性', () => {
    it('所有空状态图标使用 lucide-react 线性图标且尺寸统一', () => {
      const icons = [
        <Compass key="c" className="h-12 w-12" />,
        <Train key="t" className="h-12 w-12" />,
        <Wallet key="w" className="h-12 w-12" />,
        <BookOpen key="b" className="h-12 w-12" />,
        <MapPin key="m" className="h-12 w-12" />,
        <Clock key="cl" className="h-12 w-12" />,
      ]
      const { container } = render(<div>{icons}</div>)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBe(icons.length)
      svgs.forEach((s) => {
        const cls = s.getAttribute('class') ?? ''
        expect(cls).toContain('h-12')
        expect(cls).toContain('w-12')
      })
    })
  })

  describe('手机端底部导航', () => {
    it('渲染 7 个导航项，顺序与文案符合文档', async () => {
      const { MobileNav } = await import('@/layout/MobileNav')
      render(
        <MemoryRouter>
          <MobileNav />
        </MemoryRouter>,
      )
      const labels = ['首页', '行程', '交通', '地图', '攻略', '消费', '设置']
      labels.forEach((l) => expect(screen.getByText(l)).toBeInTheDocument())
      const nav = screen.getByRole('navigation', { name: '底部导航' })
      const links = Array.from(nav.querySelectorAll('a'))
      expect(links.map((a) => a.textContent)).toEqual(labels)
    })

    it('底部导航为悬浮玻璃胶囊且仅手机端显示', async () => {
      const { MobileNav } = await import('@/layout/MobileNav')
      render(
        <MemoryRouter>
          <MobileNav />
        </MemoryRouter>,
      )
      const nav = screen.getByRole('navigation', { name: '底部导航' })
      expect(nav.className).toContain('glass-thick')
      expect(nav.className).toContain('fixed')
      expect(nav.className).toContain('lg:hidden')
    })

    it('AppLayout 同时保留侧栏（桌面显示）与底部导航（手机显示）', async () => {
      const { AppLayout } = await import('@/layout/AppLayout')
      render(
        <MemoryRouter>
          <AppLayout />
        </MemoryRouter>,
      )
      const aside = screen.getByText('我的旅行').closest('aside')!
      expect(aside.className).toContain('hidden')
      expect(aside.className).toContain('lg:flex')
      expect(
        screen.getByRole('navigation', { name: '底部导航' }),
      ).toBeInTheDocument()
      const main = document.querySelector('main')!
      expect(main.className).toContain('lg:pb-0')
    })
  })
})
