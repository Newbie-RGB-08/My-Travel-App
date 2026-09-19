import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { RouterProvider } from 'react-router-dom'
import { render } from '@testing-library/react'
import App from '../App'
import { router } from '../routes/router'

describe('阶段 0：项目骨架', () => {
  it('App 能挂载 RouterProvider 而不崩溃', () => {
    const { container } = render(<App />)
    expect(container).toBeInTheDocument()
  })

  it('router 配置存在且能被 Provider 加载', () => {
    // router 是 createBrowserRouter 实例
    expect(router).toBeDefined()
    // 根路由存在
    const root = router.routes.find((r) => r.path === '/')
    expect(root).toBeDefined()
  })

  it('App 挂载后渲染布局与导航', () => {
    render(<RouterProvider router={router} />)
    // 阶段 0 验证：骨架可渲染，包含品牌标题（来自 Sidebar）
    expect(/旅行/.test(document.body.textContent ?? '')).toBe(true)
  })
})
