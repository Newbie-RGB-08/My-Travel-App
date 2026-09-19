import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Plus } from 'lucide-react'

import { db } from '@/db/schema'
import { useTripStore } from '@/store/useTripStore'

export function TripSwitcher() {
  const navigate = useNavigate()
  const { currentTripId, setCurrentTrip } = useTripStore()
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? []

  const current = useMemo(
    () => trips.find((t) => t.id === currentTripId) ?? null,
    [trips, currentTripId],
  )

  if (trips.length === 0) {
    return (
      <button
        type="button"
        className="btn-primary w-full"
        onClick={() => navigate('/trips')}
      >
        <Plus className="h-4 w-4" />
        创建第一个行程
      </button>
    )
  }

  return (
    <div>
      <div className="mb-1 px-1 text-xs font-medium text-gray-400">当前行程</div>
      <div className="relative">
        <select
          className="input appearance-none pr-8"
          value={currentTripId ?? ''}
          onChange={(e) => setCurrentTrip(e.target.value || null)}
        >
          {current === null && <option value="">未选择行程</option>}
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  )
}
