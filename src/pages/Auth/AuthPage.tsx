import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, MapPin } from 'lucide-react'
import { Field, TextInput } from '@/components/forms/Field'
import { AmbientBackground } from '@/components/common/AmbientBackground'
import { authErrorText, isValidPhone, MOCK_SMS_CODE } from '@/db/auth'
import { useAuthStore } from '@/store/useAuthStore'

type Mode = 'login' | 'register'

const RESEND_SECONDS = 60

export default function AuthPage({
  initialMode = 'login',
}: {
  initialMode?: Mode
}) {
  const navigate = useNavigate()
  const { currentUser, register: registerAccount, login } = useAuthStore()

  const [mode, setMode] = useState<Mode>(initialMode)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 已登录用户访问登录/注册页 → 直接回首页
  useEffect(() => {
    if (currentUser) navigate('/', { replace: true })
  }, [currentUser, navigate])

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setInterval(
      () => setCountdown((s) => (s > 0 ? s - 1 : 0)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [countdown])

  // 切换形态时清空表单与错误
  const switchMode = (m: Mode) => {
    setMode(m)
    setPhone('')
    setCode('')
    setPassword('')
    setConfirm('')
    setError('')
    setCountdown(0)
  }

  const handleGetCode = () => {
    setError('')
    if (!isValidPhone(phone.trim())) {
      setError('请先输入正确的手机号')
      return
    }
    // 本地模拟发送（不联网），验证码为固定值并在界面提示
    setCountdown(RESEND_SECONDS)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const p = phone.trim()
    if (!isValidPhone(p)) {
      setError('手机号格式不正确，应为 11 位数字且以 1 开头')
      return
    }
    if (mode === 'register') {
      if (code.trim() !== MOCK_SMS_CODE) {
        setError('验证码错误，请重新输入')
        return
      }
      if (password.length < 6) {
        setError('密码至少 6 位')
        return
      }
      if (password !== confirm) {
        setError('两次输入的密码不一致')
        return
      }
    }
    setSubmitting(true)
    try {
      if (mode === 'register') {
        await registerAccount(p, code.trim(), password)
      } else {
        await login(p, password)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(authErrorText(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="glass-thick w-full max-w-sm rounded-pop p-6">
          <div className="mb-6 flex flex-col items-center gap-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500/20">
              <MapPin className="h-5 w-5 text-brand-300" />
            </span>
            <h1 className="text-lg font-semibold text-fg-1">Traveltheworld</h1>
            <p className="text-xs text-fg-3">
              {mode === 'login' ? '登录后开始你的旅程' : '注册一个新账号'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field label="手机号" required>
              <TextInput
                type="tel"
                inputMode="numeric"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11 位手机号"
                aria-label="手机号"
              />
            </Field>

            {mode === 'register' && (
              <Field
                label="验证码"
                required
                hint={`本地模拟短信，本次验证码：${MOCK_SMS_CODE}`}
              >
                <div className="flex gap-2">
                  <TextInput
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6 位验证码"
                    aria-label="验证码"
                  />
                  <button
                    type="button"
                    className="btn-secondary shrink-0 px-3 text-xs"
                    disabled={countdown > 0}
                    onClick={handleGetCode}
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                  </button>
                </div>
              </Field>
            )}

            <Field label="密码" required>
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '至少 6 位' : '密码'}
                aria-label="密码"
              />
            </Field>

            {mode === 'register' && (
              <Field label="确认密码" required>
                <TextInput
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="再次输入密码"
                  aria-label="确认密码"
                />
              </Field>
            )}

            {error && (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? '登录' : '注册并登录'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-fg-3">
            {mode === 'login' ? (
              <>
                还没有账号？
                <button
                  type="button"
                  className="ml-1 text-brand-300 hover:underline"
                  onClick={() => switchMode('register')}
                >
                  去注册
                </button>
              </>
            ) : (
              <>
                已有账号？
                <button
                  type="button"
                  className="ml-1 text-brand-300 hover:underline"
                  onClick={() => switchMode('login')}
                >
                  去登录
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
