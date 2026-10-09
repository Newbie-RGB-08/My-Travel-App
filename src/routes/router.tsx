import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layout/AppLayout'
import { RequireAuth } from '@/routes/RequireAuth'
import AuthPage from '@/pages/Auth/AuthPage'
import Home from '@/pages/Home'
import Trips from '@/pages/Trips'
import Transports from '@/pages/Transports'
import MapView from '@/pages/Map'
import Guides from '@/pages/Guides'
import Expenses from '@/pages/Expenses'
import Settings from '@/pages/Settings'

export const router = createBrowserRouter([
  { path: 'login', element: <AuthPage /> },
  { path: 'register', element: <AuthPage initialMode="register" /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'trips', element: <Trips /> },
      { path: 'transports', element: <Transports /> },
      { path: 'map', element: <MapView /> },
      { path: 'guides', element: <Guides /> },
      { path: 'expenses', element: <Expenses /> },
      { path: 'settings', element: <Settings /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
