import type { Config } from 'tailwindcss/types/config'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // brand 50-900 键全部保留，值重设为 macOS 深色系统蓝色阶（brand-500/600 = #0A84FF）
        brand: {
          50: '#EAF4FF',
          100: '#CFE6FF',
          200: '#9FCCFF',
          300: '#6BB2FF',
          400: '#3A9BFF',
          500: '#0A84FF',
          600: '#0A84FF',
          700: '#0066CC',
          800: '#004D99',
          900: '#003366',
        },
        // 文字三档（替代 gray-900/500/400 体系）
        fg: {
          1: 'rgb(255 255 255 / 0.92)',
          2: 'rgb(255 255 255 / 0.62)',
          3: 'rgb(255 255 255 / 0.38)',
        },
        // 发丝分隔线
        line: {
          DEFAULT: 'rgb(255 255 255 / 0.09)',
          soft: 'rgb(255 255 255 / 0.06)',
        },
        ok: '#30D158',
        warn: '#FF9F0A',
        danger: '#FF453A',
        violet: '#BF5AF2',
        pink: '#FF375F',
        // 页面最深底色
        base: '#0B0E13',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      borderRadius: {
        control: '10px',
        card: '16px',
        pop: '20px',
      },
      boxShadow: {
        // 保留 card / card-hover 键名（测试契约），值改为玻璃阴影栈：
        // 顶部内高光 + 远距大柔影 + 近距贴合影
        card:
          '0 1px 0 rgb(255 255 255 / 0.06) inset, 0 8px 24px -8px rgb(0 0 0 / 0.5), 0 2px 6px -2px rgb(0 0 0 / 0.35)',
        'card-hover':
          '0 1px 0 rgb(255 255 255 / 0.10) inset, 0 16px 40px -10px rgb(0 0 0 / 0.6), 0 4px 10px -4px rgb(0 0 0 / 0.4)',
        pop:
          '0 1px 0 rgb(255 255 255 / 0.14) inset, 0 32px 80px -16px rgb(0 0 0 / 0.7)',
      },
      transitionTimingFunction: {
        liquid: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'glass-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'drift-a': {
          '0%,100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(60px,40px,0)' },
        },
        'drift-b': {
          '0%,100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(-70px,-30px,0)' },
        },
        'drift-c': {
          '0%,100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(40px,-50px,0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'glass-in': 'glass-in 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        'drift-a': 'drift-a 46s ease-in-out infinite alternate',
        'drift-b': 'drift-b 58s ease-in-out infinite alternate',
        'drift-c': 'drift-c 52s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
} satisfies Config
