import { configureStore } from "@reduxjs/toolkit"
import { authReducer } from "@/store/authSlice"
import { complianceReducer } from "@/store/complianceSlice"
import { merchantAppsReducer } from "@/store/merchantAppsSlice"
import { mobileClientAuthReducer } from "@/store/mobileClientAuthSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    compliance: complianceReducer,
    merchantApps: merchantAppsReducer,
    mobileClientAuth: mobileClientAuthReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

