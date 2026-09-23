import { NavLink } from 'react-router-dom'
import { Compass, Home, Map, Notebook, Plane, Settings, Wallet } from 'lucide-react'

// 手机端底部悬浮胶囊导航：lg（1024px）以下显示，桌面端保留左侧栏。
// 项顺序与文档一致：首页、行程、交通、地图、攻略、消费、设置。
const navItems = [
  { to: '/', label: '首页', icon: Home, end: true },
  { to: '/trips', label: '行程', icon: Compass },
  { to: '/transports', label: '交通', icon: Plane },
  { to: '/map', label: '地图', icon: Map },
  { to: '/guides', label: '攻略', icon: Notebook },
  { to: '/expenses', label: '消费', icon: Wallet },
  { to: '/settings', label: '设置', icon: Settings },
]

export function MobileNav() {
  return (
    <nav
      className="glass-thick fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-40 flex items-stretch gap-0.5 p-1.5 lg:hidden"
      aria-label="底部导航"
    >
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[14px] border px-0.5 py-1.5 text-[10px] leading-none transition-all duration-200 ease-liquid ${
                isActive
                  ? 'glass-active text-fg-1'
                  : 'border-transparent text-fg-2 active:text-fg-1'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
