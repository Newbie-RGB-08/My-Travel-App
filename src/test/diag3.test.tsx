import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { resetDB } from '@/db/schema'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import Trips from '@/pages/Trips'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

beforeEach(async () => {
  await resetDB()
  useTripStore.setState({ currentTripId: null })
})

describe('addActivity 诊断', () => {
  it('点保存后看 DOM', async () => {
    const user = userEvent.setup()
    const t = await crud.addTrip({
      name: '北京',
      destination: '北京',
      startDate: '2026-10-01',
      endDate: '2026-10-01',
      companions: [],
      budget: 5000,
      status: 'planning',
    })
    useTripStore.setState({ currentTripId: t.id })
    render(
      <MemoryRouter>
        <Trips />
        <ConfirmDialog />
      </MemoryRouter>,
    )
    await screen.findByText('还没有活动', {}, { timeout: 3000 })
    await user.click(screen.getByRole('button', { name: '添加活动' }))
    await screen.findByPlaceholderText('如：故宫')
    await user.type(screen.getByPlaceholderText('如：故宫'), '故宫')
    await user.click(screen.getByRole('button', { name: '保存' }))
    // 等一会儿
    await new Promise((r) => setTimeout(r, 1000))
    console.log('=== DOM after save ===')
    console.log(document.body.innerHTML.slice(0, 3000))
    console.log('=== activities in db ===', await crud.listActivities(t.id))
    expect(true).toBe(true)
  }, 10000)
})
