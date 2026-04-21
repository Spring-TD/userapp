import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import api from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import { normalizeClientAuthError } from '@/lib/normalizeClientAuthError'
import type {
  ForgotPasswordDto,
  MobileUserRegistrationDto,
  OtpGenerateDto,
  OtpVerifyDto,
} from '@/types/mobileClientAuth'

interface MobileClientAuthState {
  loading: boolean
  error: string | null
  /** Email used for the in-progress OTP / verification flow */
  pendingIdentifier: string | null
}

const initialState: MobileClientAuthState = {
  loading: false,
  error: null,
  pendingIdentifier: null,
}

export const registerMobileUserThunk = createAsyncThunk<
  unknown,
  MobileUserRegistrationDto,
  { rejectValue: string }
>('mobileClientAuth/register', async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post(ENDPOINTS.auth.signup.user, payload, { includeAuth: false })
    return res.data
  } catch (error: unknown) {
    return rejectWithValue(normalizeClientAuthError(error))
  }
})

export const generateOtpThunk = createAsyncThunk<unknown, OtpGenerateDto, { rejectValue: string }>(
  'mobileClientAuth/generateOtp',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post(ENDPOINTS.auth.otp.generate, payload, { includeAuth: false })
      return res.data
    } catch (error: unknown) {
      return rejectWithValue(normalizeClientAuthError(error))
    }
  },
)

export const verifyOtpThunk = createAsyncThunk<unknown, OtpVerifyDto, { rejectValue: string }>(
  'mobileClientAuth/verifyOtp',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post(ENDPOINTS.auth.verify.emailOtp, payload, { includeAuth: false })
      return res.data
    } catch (error: unknown) {
      return rejectWithValue(normalizeClientAuthError(error))
    }
  },
)

export const resendOtpThunk = createAsyncThunk<
  unknown,
  { identifier: string; channel: 'email' | 'sms'; purpose: string },
  { rejectValue: string }
>('mobileClientAuth/resendOtp', async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post(
      ENDPOINTS.auth.otp.resendEmail,
      {
        identifier: payload.identifier,
        channel: payload.channel,
        purpose: payload.purpose,
      },
      { includeAuth: false },
    )
    return res.data
  } catch (error: unknown) {
    return rejectWithValue(normalizeClientAuthError(error))
  }
})

export const forgotPasswordThunk = createAsyncThunk<unknown, ForgotPasswordDto, { rejectValue: string }>(
  'mobileClientAuth/forgotPassword',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post(ENDPOINTS.auth.password.forgot, payload, { includeAuth: false })
      return res.data
    } catch (error: unknown) {
      return rejectWithValue(normalizeClientAuthError(error))
    }
  },
)

export const emailExistsThunk = createAsyncThunk<boolean, string, { rejectValue: string }>(
  'mobileClientAuth/emailExists',
  async (email, { rejectWithValue }) => {
    try {
      const path = ENDPOINTS.auth.emailExists(email)
      const res = await api.get(path, { includeAuth: false })
      const data = res.data as { exists?: boolean; data?: { exists?: boolean } }
      if (typeof data.exists === 'boolean') return data.exists
      if (typeof data.data?.exists === 'boolean') return data.data.exists
      return false
    } catch (error: unknown) {
      return rejectWithValue(normalizeClientAuthError(error))
    }
  },
)

const mobileClientAuthSlice = createSlice({
  name: 'mobileClientAuth',
  initialState,
  reducers: {
    clearMobileClientAuthError(state) {
      state.error = null
    },
    setPendingIdentifier(state, action: PayloadAction<string | null>) {
      state.pendingIdentifier = action.payload
    },
  },
  extraReducers: (builder) => {
    const pending = (state: MobileClientAuthState) => {
      state.loading = true
      state.error = null
    }
    const rejected = (state: MobileClientAuthState, action: { payload?: string; error?: { message?: string } }) => {
      state.loading = false
      state.error = action.payload ?? action.error?.message ?? 'Request failed'
    }
    builder
      .addCase(registerMobileUserThunk.pending, pending)
      .addCase(registerMobileUserThunk.fulfilled, (state, action) => {
        state.loading = false
        state.error = null
        const email = (action.meta.arg as MobileUserRegistrationDto).email
        state.pendingIdentifier = email
      })
      .addCase(registerMobileUserThunk.rejected, rejected)

      .addCase(generateOtpThunk.pending, pending)
      .addCase(generateOtpThunk.fulfilled, (state, action) => {
        state.loading = false
        state.error = null
        state.pendingIdentifier = action.meta.arg.identifier
      })
      .addCase(generateOtpThunk.rejected, rejected)

      .addCase(verifyOtpThunk.pending, pending)
      .addCase(verifyOtpThunk.fulfilled, (state) => {
        state.loading = false
        state.error = null
      })
      .addCase(verifyOtpThunk.rejected, rejected)

      .addCase(resendOtpThunk.pending, pending)
      .addCase(resendOtpThunk.fulfilled, (state) => {
        state.loading = false
        state.error = null
      })
      .addCase(resendOtpThunk.rejected, rejected)

      .addCase(forgotPasswordThunk.pending, pending)
      .addCase(forgotPasswordThunk.fulfilled, (state) => {
        state.loading = false
        state.error = null
      })
      .addCase(forgotPasswordThunk.rejected, rejected)

      .addCase(emailExistsThunk.pending, pending)
      .addCase(emailExistsThunk.fulfilled, (state) => {
        state.loading = false
        state.error = null
      })
      .addCase(emailExistsThunk.rejected, rejected)
  },
})

export const { clearMobileClientAuthError, setPendingIdentifier } = mobileClientAuthSlice.actions
export const mobileClientAuthReducer = mobileClientAuthSlice.reducer
