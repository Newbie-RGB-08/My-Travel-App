import './index.css'
import 'leaflet/dist/leaflet.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useAuthStore } from '@/store/useAuthStore'

// 启动恢复登录态并同步数据归属（登录态本身由 zustand persist 同步恢复）
void useAuthStore.getState().restoreSession()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
