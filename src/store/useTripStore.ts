import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TripState {
  currentTripId: string | null
  setCurrentTrip: (id: string | null) => void
  clearCurrentTrip: () => void
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      currentTripId: null,
      setCurrentTrip: (id) => set({ currentTripId: id }),
      clearCurrentTrip: () => set({ currentTripId: null }),
    }),
    {
      name: 'my-travel-current-trip',
    },
  ),
)
