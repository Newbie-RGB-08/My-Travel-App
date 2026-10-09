import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// 自动清理 DOM
afterEach(() => {
  cleanup()
})

// jsdom 不支持的 API 兜底
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
}
if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = vi.fn()
}

// matchMedia 兜底
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })
}

// ResizeObserver 兜底（Recharts ResponsiveContainer 需要）
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
}

// jsdom 的 AbortSignal 传入 Node(undici) 的 Request 会因跨 realm 校验失败，
// 导致 react-router 数据路由导航抛错、整树无法渲染。
// 测试中不需要导航中断能力，这里包装全局 Request 丢弃 signal。
const RealRequest = globalThis.Request as
  | (typeof Request & {
      new (input: RequestInfo | URL, init?: RequestInit): Request
    })
  | undefined
if (RealRequest) {
  class PatchedRequest extends RealRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      const safeInit = { ...(init ?? {}) } as RequestInit
      delete safeInit.signal
      super(input, safeInit)
    }
  }
  globalThis.Request = PatchedRequest as typeof Request
}
