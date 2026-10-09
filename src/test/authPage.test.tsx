import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { db, resetDB } from '@/db/schema'
import { MOCK_SMS_CODE } from '@/db/auth'
import { setOwnerId } from '@/db/ownerContext'
import { useAuthStore } from '@/store/useAuthStore'
import { router } from '@/routes/router'
import AuthPage from '@/pages/Auth/AuthPage'

const FIND_OPTS = { timeout: 3000 }

function resetStore(): void {
  useAuthStore.setState({ currentUser: null })
  setOwnerId(null)
}

beforeEach(async () => {
  resetStore()
  window.localStorage.clear()
  await resetDB()
})

afterEach(() => {
  cleanup()
})

describe('AuthPage 渲染与校验', () => {
  it('默认登录形态：手机号 + 密码，无验证码字段', async () => {
    const r = createMemoryRouter(
      [
        { path: '/login', element: <AuthPage /> },
        { path: '*', element: <div data-testid="other">other</div> },
      ],
      { initialEntries: ['/login'] },
    )
    render(<RouterProvider router={r} />)
    expect(await screen.findByLabelText('手机号', {}, FIND_OPTS)).toBeTruthy()
    expect(screen.getByLabelText('密码')).toBeTruthy()
    expect(screen.queryByLabelText('验证码')).toBeNull()
  })

  it('手机号格式错误给出提示，不发请求', async () => {
    const user = userEvent.setup()
    const r = createMemoryRouter(
      [
        { path: '/login', element: <AuthPage /> },
        { path: '*', element: <div>other</div> },
      ],
      { initialEntries: ['/login'] },
    )
    render(<RouterProvider router={r} />)
    await user.type(await screen.findByLabelText('手机号', {}, FIND_OPTS), '123')
    await user.type(screen.getByLabelText('密码'), 'abc123')
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByRole('alert', {}, FIND_OPTS)).toHaveTextContent(
      '手机号格式不正确',
    )
    // 数据库未创建用户
    expect(await db.users.count()).toBe(0)
  })

  it('切换注册形态：出现验证码（明文提示 123456）与确认密码', async () => {
    const user = userEvent.setup()
    const r = createMemoryRouter(
      [
        { path: '/login', element: <AuthPage /> },
        { path: '*', element: <div>other</div> },
      ],
      { initialEntries: ['/login'] },
    )
    render(<RouterProvider router={r} />)
    await user.click(
      await screen.findByRole('button', { name: '去注册' }, FIND_OPTS),
    )
    expect(screen.getByLabelText('验证码')).toBeTruthy()
    expect(screen.getByLabelText('确认密码')).toBeTruthy()
    expect(screen.getByText(new RegExp(MOCK_SMS_CODE))).toBeTruthy()
  })

  it('获取验证码：手机号非法提示；合法后进入倒计时禁用', async () => {
    const user = userEvent.setup()
    const r = createMemoryRouter(
      [
        { path: '/login', element: <AuthPage /> },
        { path: '*', element: <div>other</div> },
      ],
      { initialEntries: ['/login'] },
    )
    render(<RouterProvider router={r} />)
    await user.click(
      await screen.findByRole('button', { name: '去注册' }, FIND_OPTS),
    )
    const getCode = screen.getByRole('button', { name: '获取验证码' })
    await user.click(getCode)
    expect(await screen.findByRole('alert', {}, FIND_OPTS)).toHaveTextContent(
      '请先输入正确的手机号',
    )

    await user.type(screen.getByLabelText('手机号'), '13812345678')
    await user.click(screen.getByRole('button', { name: '获取验证码' }))
    expect(await screen.findByRole('button', { name: /后重发/ })).toBeDisabled()
  })

  it('注册成功：自动登录并进入首页', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/')
    render(<RouterProvider router={router} />)
    // 未登录被守卫带到登录页
    await screen.findByText('Traveltheworld', {}, FIND_OPTS)
    await user.click(screen.getByRole('button', { name: '去注册' }))

    await user.type(screen.getByLabelText('手机号'), '13812345678')
    await user.type(screen.getByLabelText('验证码'), MOCK_SMS_CODE)
    await user.type(screen.getByLabelText('密码'), 'abc123')
    await user.type(screen.getByLabelText('确认密码'), 'abc123')
    await user.click(screen.getByRole('button', { name: '注册并登录' }))

    // 进入首页总览（页面 h1，非侧栏同名导航链接）
    expect(
      await screen.findByRole('heading', { name: '首页总览' }, FIND_OPTS),
    ).toBeTruthy()
    const cur = useAuthStore.getState().currentUser
    expect(cur?.phone).toBe('13812345678')
    const u = await db.users.where('phone').equals('13812345678').first()
    expect(u).toBeTruthy()
  })

  it('登录密码错误提示；正确后进入首页', async () => {
    const { registerUser } = await import('@/db/auth')
    await registerUser({
      phone: '13812345678',
      code: MOCK_SMS_CODE,
      password: 'abc123',
    })
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/')
    render(<RouterProvider router={router} />)
    await screen.findByText('Traveltheworld', {}, FIND_OPTS)

    await user.type(screen.getByLabelText('手机号'), '13812345678')
    await user.type(screen.getByLabelText('密码'), 'wrong!')
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByRole('alert', {}, FIND_OPTS)).toHaveTextContent(
      '密码错误',
    )

    const pwd = screen.getByLabelText('密码')
    await user.clear(pwd)
    await user.type(pwd, 'abc123')
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(
      await screen.findByRole('heading', { name: '首页总览' }, FIND_OPTS),
    ).toBeTruthy()
  })
})

describe('路由守卫', () => {
  it('未登录访问受保护路径 → 重定向 /login', async () => {
    window.history.replaceState(null, '', '/trips')
    render(<RouterProvider router={router} />)
    expect(await screen.findByText('Traveltheworld', {}, FIND_OPTS)).toBeTruthy()
  })

  it('已登录访问 /login → 重定向首页', async () => {
    const { registerUser } = await import('@/db/auth')
    const u = await registerUser({
      phone: '13812345678',
      code: MOCK_SMS_CODE,
      password: 'abc123',
    })
    useAuthStore.setState({ currentUser: { id: u.id, phone: u.phone } })
    window.history.replaceState(null, '', '/login')
    render(<RouterProvider router={router} />)
    expect(
      await screen.findByRole('heading', { name: '首页总览' }, FIND_OPTS),
    ).toBeTruthy()
  })
})
