import { NavLink } from 'react-router-dom'
import { Compass, Home, Map, Notebook, Plane, Wallet, Settings } from 'lucide-react'

import { TripSwitcher } from './TripSwitcher'

const navItems = [
  { to: '/', label: '首页总览', icon: Home, end: true },
  { to: '/trips', label: '行程计划', icon: Compass },
  { to: '/transports', label: '交通安排', icon: Plane },
  { to: '/map', label: '地图详情', icon: Map },
  { to: '/guides', label: '游玩攻略', icon: Notebook },
  { to: '/expenses', label: '消费记录', icon: Wallet },
]

export function Sidebar() {
  return (
    <aside className="glass-thick relative z-10 flex h-full w-60 shrink-0 flex-col rounded-none border-y-0 border-l-0">
      <div className="flex items-center gap-2 px-5 py-4">
        <Compass className="h-6 w-6 shrink-0 text-brand-600" />
        <span className="text-base font-semibold text-fg-1">我的旅行</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm transition-all duration-200 ease-liquid ${
                  isActive
                    ? 'glass-active text-fg-1'
                    : 'text-fg-2 hover:bg-white/8 hover:text-fg-1'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-line-soft p-3">
        <TripSwitcher />
      </div>
      <div className="border-t border-line-soft px-3 py-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm transition-all duration-200 ease-liquid ${
              isActive
                ? 'glass-active text-fg-1'
                : 'text-fg-2 hover:bg-white/8 hover:text-fg-1'
            }`
          }
        >
          <Settings className="h-4 w-4 shrink-0" />
          设置
        </NavLink>
      </div>
    </aside>
  )
}
