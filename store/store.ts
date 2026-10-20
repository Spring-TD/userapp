import { configureStore } from "@reduxjs/toolkit"
import { authReducer } from "@/store/authSlice"
import { mobileClientAuthReducer } from "@/store/mobileClientAuthSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    mobileClientAuth: mobileClientAuthReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

