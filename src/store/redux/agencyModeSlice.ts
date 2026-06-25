import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type AgencyMode = 'ddd' | 'hha'

interface AgencyModeState {
  modeByAgency: Record<string, AgencyMode>
}

const initialState: AgencyModeState = {
  modeByAgency: {},
}

const agencyModeSlice = createSlice({
  name: 'agencyMode',
  initialState,
  reducers: {
    setAgencyMode(state, action: PayloadAction<{ agencyId: string; mode: AgencyMode }>) {
      state.modeByAgency[action.payload.agencyId] = action.payload.mode
    },
    clearAgencyMode(state, action: PayloadAction<string>) {
      delete state.modeByAgency[action.payload]
    },
  },
})

export const { setAgencyMode, clearAgencyMode } = agencyModeSlice.actions
export default agencyModeSlice.reducer