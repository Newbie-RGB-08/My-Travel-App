import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { resetDB, db } from '@/db/schema'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import Guides from '@/pages/Guides'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

const FIND_OPTS = { timeout: 3000 } as const

function renderPage() {
  return render(
    <MemoryRouter>
      <Guides />
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

// 在 textarea 上触发粘贴图片事件
function pasteImage(textarea: HTMLElement, blob: Blob) {
  const ev = new Event('paste', { bubbles: true })
  Object.defineProperty(ev, 'clipboardData', {
    value: {
      items: [{ kind: 'file', type: blob.type, getAsFile: () => blob }],
      files: [blob],
    },
    configurable: true,
  })
  textarea.dispatchEvent(ev)
}

describe('阶段 6：游玩攻略模块', () => {
  describe('空状态', () => {
    it('无攻略时显示"创建第一条攻略"引导', async () => {
      renderPage()
      expect(
        await screen.findByRole('button', { name: /创建第一条攻略/ }),
      ).toBeInTheDocument()
    })
  })

  describe('攻略 CRUD', () => {
    it('新建攻略：填表 → 保存 → 卡片出现', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(await screen.findByRole('button', { name: '新建攻略' }))
      const titleInput = await screen.findByPlaceholderText('如：故宫半日游攻略')
      await user.type(titleInput, '故宫半日游')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      expect(await screen.findByText('故宫半日游', {}, FIND_OPTS)).toBeInTheDocument()
    })

    it('编辑攻略：修改标题后保存生效', async () => {
      const user = userEvent.setup()
      const g = await crud.addGuide({
        title: '原攻略',
        destination: '北京',
        category: 'sight',
        content: '正文',
        favorite: false,
        tags: [],
        tripId: null,
        attachmentIds: [],
      })
      renderPage()
      await screen.findByText('原攻略', {}, FIND_OPTS)
      await user.click(screen.getByLabelText('编辑攻略'))
      const titleInput = await screen.findByDisplayValue('原攻略', FIND_OPTS)
      await user.clear(titleInput)
      await user.type(titleInput, '改后攻略')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(screen.queryByDisplayValue('改后攻略')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      await screen.findByText('改后攻略', {}, FIND_OPTS)
      expect(screen.queryByText('原攻略')).not.toBeInTheDocument()
      const got = await crud.getGuide(g.id)
      expect(got?.title).toBe('改后攻略')
    })

    it('删除攻略：二次确认后消失', async () => {
      const user = userEvent.setup()
      await crud.addGuide({
        title: '删除我',
        destination: '',
        category: 'food',
        content: '',
        favorite: false,
        tags: [],
        tripId: null,
        attachmentIds: [],
      })
      renderPage()
      await screen.findByText('删除我', {}, FIND_OPTS)
      await user.click(screen.getByLabelText('删除攻略'))
      await screen.findByText('删除攻略', {}, FIND_OPTS)
      await user.click(screen.getByRole('button', { name: '删除' }))
      await waitFor(
        () => {
          expect(screen.queryByText('删除我')).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      const all = await crud.listGuides()
      expect(all).toHaveLength(0)
    })
  })

  describe('收藏与筛选', () => {
    it('点收藏按钮后收藏状态切换', async () => {
      const user = userEvent.setup()
      const g = await crud.addGuide({
        title: '攻略A',
        destination: '',
        category: 'sight',
        content: '',
        favorite: false,
        tags: [],
        tripId: null,
        attachmentIds: [],
      })
      renderPage()
      await screen.findByText('攻略A', {}, FIND_OPTS)
      // 初始未收藏
      const cardBefore = screen.getByText('攻略A').closest('[data-guide-id]') as HTMLElement
      expect(cardBefore.dataset.guideFavorite).toBe('false')
      // 点收藏
      await user.click(screen.getByLabelText('收藏攻略'))
      await waitFor(() => {
        const card = screen.getByText('攻略A').closest('[data-guide-id]') as HTMLElement
        expect(card.dataset.guideFavorite).toBe('true')
      }, { timeout: 3000 })
      const got = await crud.getGuide(g.id)
      expect(got?.favorite).toBe(true)
    })

    it('分类筛选：只显示所选分类', async () => {
      await crud.addGuide({
        title: '景点攻略',
        destination: '',
        category: 'sight',
        content: '',
        favorite: false,
        tags: [],
        tripId: null,
        attachmentIds: [],
      })
      await crud.addGuide({
        title: '美食攻略',
        destination: '',
        category: 'food',
        content: '',
        favorite: false,
        tags: [],
        tripId: null,
        attachmentIds: [],
      })
      renderPage()
      expect(await screen.findByText('景点攻略', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('美食攻略')).toBeInTheDocument()
      const user = userEvent.setup()
      // 点"美食"筛选（按钮文本含 emoji + label）
      await user.click(screen.getByRole('button', { name: /美食/ }))
      await waitFor(() => {
        expect(screen.queryByText('景点攻略')).not.toBeInTheDocument()
      })
      expect(screen.getByText('美食攻略')).toBeInTheDocument()
    })

    it('目的地筛选', async () => {
      await crud.addGuide({
        title: '北京攻略',
        destination: '北京',
        category: 'sight',
        content: '',
        favorite: false,
        tags: [],
        tripId: null,
        attachmentIds: [],
      })
      await crud.addGuide({
        title: '上海攻略',
        destination: '上海',
        category: 'sight',
        content: '',
        favorite: false,
        tags: [],
        tripId: null,
        attachmentIds: [],
      })
      renderPage()
      expect(await screen.findByText('北京攻略', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('上海攻略')).toBeInTheDocument()
      // 选目的地"北京"
      const destSelect = screen.getByRole('combobox') as HTMLSelectElement
      await userEvent.setup().selectOptions(destSelect, '北京')
      await waitFor(() => {
        expect(screen.queryByText('上海攻略')).not.toBeInTheDocument()
      })
      expect(screen.getByText('北京攻略')).toBeInTheDocument()
    })
  })

  describe('图片粘贴与持久化', () => {
    it('粘贴截图 → 保存 → 刷新后图片仍在', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(await screen.findByRole('button', { name: '新建攻略' }))
      await screen.findByPlaceholderText('如：故宫半日游攻略')
      // 在正文区粘贴图片
      const textarea = screen.getByPlaceholderText(/写下攻略正文/)
      const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' })
      pasteImage(textarea, blob)
      // 附件预览出现
      await waitFor(
        () => {
          expect(screen.getAllByAltText('附件').length).toBe(1)
        },
        { timeout: 3000 },
      )
      // 填标题保存
      await user.type(screen.getByPlaceholderText('如：故宫半日游攻略'), '故宫攻略')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      // 列表出现卡片
      await screen.findByText('故宫攻略', {}, FIND_OPTS)
      // DB：guide 关联 1 个附件，attachments 表有 1 条
      const guides = await crud.listGuides()
      expect(guides).toHaveLength(1)
      expect(guides[0].attachmentIds).toHaveLength(1)
      const atts = await db.attachments.toArray()
      expect(atts).toHaveLength(1)
      expect(atts[0].mime).toBe('image/png')
      // 重新打开编辑，附件预览仍在（从 DB 读取 Blob）
      await user.click(screen.getByLabelText('编辑攻略'))
      await waitFor(
        () => {
          expect(screen.getAllByAltText('附件').length).toBe(1)
        },
        { timeout: 3000 },
      )
    })
  })

  describe('行程切换器筛选', () => {
    it('切换 currentTripId 后列表只显示对应行程的攻略', async () => {
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
      await crud.addGuide({
        title: 'A攻',
        destination: '',
        category: 'sight',
        content: '',
        favorite: false,
        tags: [],
        tripId: tA.id,
        attachmentIds: [],
      })
      await crud.addGuide({
        title: 'B攻',
        destination: '',
        category: 'sight',
        content: '',
        favorite: false,
        tags: [],
        tripId: tB.id,
        attachmentIds: [],
      })
      renderPage()
      expect(await screen.findByText('A攻', {}, FIND_OPTS)).toBeInTheDocument()
      expect(screen.getByText('B攻')).toBeInTheDocument()
      // 切换到 A
      useTripStore.setState({ currentTripId: tA.id })
      await waitFor(() => {
        expect(screen.queryByText('B攻')).not.toBeInTheDocument()
      }, { timeout: 3000 })
      expect(screen.getByText('A攻')).toBeInTheDocument()
      // 切换到 B
      useTripStore.setState({ currentTripId: tB.id })
      await waitFor(() => {
        expect(screen.queryByText('A攻')).not.toBeInTheDocument()
      }, { timeout: 3000 })
      expect(screen.getByText('B攻')).toBeInTheDocument()
    })
  })

  describe('标签保存', () => {
    it('多个标签用逗号分隔后正确解析', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(await screen.findByRole('button', { name: '新建攻略' }))
      await user.type(screen.getByPlaceholderText('如：故宫半日游攻略'), '标签攻略')
      await user.type(screen.getByPlaceholderText('如：免费, 亲子'), '免费, 亲子, 知识点')
      await user.click(screen.getByRole('button', { name: '保存' }))
      await waitFor(
        () => {
          expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
      await screen.findByText('标签攻略', {}, FIND_OPTS)
      expect(screen.getByText('#免费')).toBeInTheDocument()
      expect(screen.getByText('#亲子')).toBeInTheDocument()
      expect(screen.getByText('#知识点')).toBeInTheDocument()
      const got = await crud.listGuides()
      expect(got[0].tags).toEqual(['免费', '亲子', '知识点'])
    })
  })
})
