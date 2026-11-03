import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { apiClient } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import {
  isFuspayCustomerLinked,
  isFuspayRegistrationFailed,
} from '@/lib/fuspayRegistration'
import { isOtpVerifyValid, registrationVerificationEmailSent } from '@/lib/mobileRegistration'
import {
  mobileAuthError,
  mobileAuthLog,
  mobileAuthWarn,
  redactRegisterPayload,
  summarizeAxiosError,
} from '@/lib/mobileAuthDebug'
import {
  clientAuthErrorFromAxios,
  clientAuthErrorFromResponse,
  isRegistrationSuccess,
  normalizeClientAuthError,
} from '@/lib/normalizeClientAuthError'
import { cacheAuthUserId, cacheRegistrationWallet } from '@/lib/userWallet'
import type {
  ForgotPasswordDto,
  MobileUserRegistrationDto,
  OtpGenerateDto,
  OtpVerifyDto,
  OtpVerifyResponse,
  RegisterUserResponse,
} from '@/types/mobileClientAuth'

export type MobileClientAuthReject = {
  message: string
  fieldErrors?: Record<string, string>
}

interface MobileClientAuthState {
  loading: boolean
  error: string | null
  pendingIdentifier: string | null
  lastRegistration: RegisterUserResponse | null
}

const initialState: MobileClientAuthState = {
  loading: false,
  error: null,
  pendingIdentifier: null,
  lastRegistration: null,
}

/** POST /api/v1/registration/user (via gateway proxy). OTP email sent by backend when `verificationEmailSent`. */
export const registerMobileUserThunk = createAsyncThunk<
  RegisterUserResponse,
  MobileUserRegistrationDto,
  { rejectValue: MobileClientAuthReject }
>('mobileClientAuth/register', async (payload, { rejectWithValue }) => {
  const url = ENDPOINTS.registration.user
  mobileAuthLog('registerMobileUserThunk:start', {
    url,
    payload: redactRegisterPayload(payload as unknown as Record<string, unknown>),
  })
  try {
    const res = await apiClient.post<RegisterUserResponse>(url, payload, {
      includeAuth: false,
      timeout: 30_000,
    })
    mobileAuthLog('registerMobileUserThunk:response', {
      status: res.status,
      success: res.data?.success,
      userId: res.data?.user?.id,
      verificationEmailSent: res.data?.verificationEmailSent,
      walletProvisioningError: res.data?.walletProvisioningError,
      fuspayProfileCreated: res.data?.fuspayProfileCreated,
      fuspayUserId: res.data?.fuspayUserId,
    })
    const failure = clientAuthErrorFromResponse(res.data, res.status)
    if (failure) {
      mobileAuthWarn('registerMobileUserThunk:apiFailure', {
        message: failure.message,
        fieldErrors: failure.fieldErrors,
      })
      return rejectWithValue({
        message: failure.message,
        ...(failure.fieldErrors ? { fieldErrors: failure.fieldErrors } : {}),
      })
    }
    if (!isRegistrationSuccess(res.data, res.status)) {
      mobileAuthWarn('registerMobileUserThunk:notSuccess', { status: res.status, data: res.data })
      const ambiguous = clientAuthErrorFromAxios({ response: { data: res.data, status: res.status || 400 } })
      return rejectWithValue({
        message: ambiguous.message || 'Registration could not be completed. Please try again.',
        ...(ambiguous.fieldErrors ? { fieldErrors: ambiguous.fieldErrors } : {}),
      })
    }
    const result = (res.data ?? { success: true }) as RegisterUserResponse

    if (isFuspayRegistrationFailed(result)) {
      mobileAuthWarn('registerMobileUserThunk:fuspayNotCreated', {
        userId: result.user?.id,
        fuspayProfileCreated: result.fuspayProfileCreated,
      })
    }

    if (result.fuspayProfileCreated !== undefined && !isFuspayCustomerLinked(result)) {
      mobileAuthWarn('registerMobileUserThunk:fuspayMissingId', {
        userId: result.user?.id,
        fuspayProfileCreated: result.fuspayProfileCreated,
      })
    }

    mobileAuthLog('registerMobileUserThunk:fulfilled')
    if (result.user?.id) cacheAuthUserId(result.user.id)
    if (result.wallet) cacheRegistrationWallet(result.wallet)
    return result
  } catch (error: unknown) {
    mobileAuthError('registerMobileUserThunk:throw', summarizeAxiosError(error))
    const { message, fieldErrors } = clientAuthErrorFromAxios(error)
    return rejectWithValue({ message, ...(fieldErrors ? { fieldErrors } : {}) })
  }
})

export const generateOtpThunk = createAsyncThunk<unknown, OtpGenerateDto, { rejectValue: string }>(
  'mobileClientAuth/generateOtp',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await apiClient.post(ENDPOINTS.otp.generate, payload, { includeAuth: false })
      const failure = clientAuthErrorFromResponse(res.data, res.status)
      if (failure) return rejectWithValue(failure.message)
      return res.data
    } catch (error: unknown) {
      return rejectWithValue(normalizeClientAuthError(error))
    }
  },
)

export const verifyOtpThunk = createAsyncThunk<OtpVerifyResponse, OtpVerifyDto, { rejectValue: string }>(
  'mobileClientAuth/verifyOtp',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await apiClient.post<OtpVerifyResponse>(
        ENDPOINTS.otp.verify,
        {
          identifier: payload.identifier,
          code: payload.code,
          ...(payload.purpose ? { purpose: payload.purpose } : {}),
        },
        { includeAuth: false },
      )
      const failure = clientAuthErrorFromResponse(res.data, res.status)
      if (failure) return rejectWithValue(failure.message)
      if (!isOtpVerifyValid(res.data)) {
        return rejectWithValue('Invalid or expired code. Try again or resend a new code.')
      }
      return (res.data ?? { success: true, valid: true }) as OtpVerifyResponse
    } catch (error: unknown) {
      return rejectWithValue(normalizeClientAuthError(error))
    }
  },
)

/**
 * POST /api/v1/otp/resend — `{ identifier, purpose }` (account-ms contract; no `channel`).
 * Falls back to /otp/generate only if the resend route doesn't exist upstream (404).
 * `channel` is kept in the signature for callers but only used by that fallback.
 */
export const resendOtpThunk = createAsyncThunk<
  unknown,
  { identifier: string; channel?: 'email' | 'sms'; purpose: string },
  { rejectValue: string }
>('mobileClientAuth/resendOtp', async (payload, { rejectWithValue }) => {
  const generateFallback = async () => {
    const gen = await apiClient.post(
      ENDPOINTS.otp.generate,
      { identifier: payload.identifier, channel: payload.channel ?? 'email', purpose: payload.purpose },
      { includeAuth: false },
    )
    const genFailure = clientAuthErrorFromResponse(gen.data, gen.status)
    return genFailure ? rejectWithValue(genFailure.message) : gen.data
  }

  try {
    const res = await apiClient.post(
      ENDPOINTS.otp.resend,
      { identifier: payload.identifier, purpose: payload.purpose },
      { includeAuth: false },
    )
    const failure = clientAuthErrorFromResponse(res.data, res.status)
    if (failure) return rejectWithValue(failure.message)
    return res.data
  } catch (error: unknown) {
    // apiClient throws on non-2xx; only a missing route (404) falls back to generate.
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      try {
        return await generateFallback()
      } catch (genError: unknown) {
        return rejectWithValue(normalizeClientAuthError(genError))
      }
    }
    return rejectWithValue(normalizeClientAuthError(error))
  }
})

export const forgotPasswordThunk = createAsyncThunk<unknown, ForgotPasswordDto, { rejectValue: string }>(
  'mobileClientAuth/forgotPassword',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await apiClient.post(ENDPOINTS.auth.password.forgot, payload, { includeAuth: false })
      const failure = clientAuthErrorFromResponse(res.data, res.status)
      if (failure) return rejectWithValue(failure.message)
      return res.data
    } catch (error: unknown) {
      return rejectWithValue(normalizeClientAuthError(error))
    }
  },
)

/** Optional pre-check — never rejects; signup only blocks when this returns `true`. */
export const emailExistsThunk = createAsyncThunk<boolean, string>(
  'mobileClientAuth/emailExists',
  async (email) => {
    const path = ENDPOINTS.auth.emailExists(email.trim().toLowerCase())
    console.log('[signup] emailExistsThunk →', path)
    mobileAuthLog('emailExistsThunk:start', { path, email: email.trim().toLowerCase() })
    try {
      const res = await apiClient.get(path, { includeAuth: false })
      mobileAuthLog('emailExistsThunk:response', { status: res.status, data: res.data })
      const data = res.data as { exists?: boolean; data?: { exists?: boolean } }
      if (typeof data.exists === 'boolean') return data.exists
      if (typeof data.data?.exists === 'boolean') return data.data.exists
      return false
    } catch {
      return false
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
    clearLastRegistration(state) {
      state.lastRegistration = null
    },
  },
  extraReducers: (builder) => {
    const pending = (state: MobileClientAuthState) => {
      state.loading = true
      state.error = null
    }
    const rejected = (
      state: MobileClientAuthState,
      action: { payload?: string | MobileClientAuthReject; error?: { message?: string } },
    ) => {
      state.loading = false
      const p = action.payload
      state.error =
        (typeof p === 'object' && p?.message) ||
        (typeof p === 'string' ? p : null) ||
        action.error?.message ||
        'Request failed'
    }
    builder
      .addCase(registerMobileUserThunk.pending, pending)
      .addCase(registerMobileUserThunk.fulfilled, (state, action) => {
        state.loading = false
        state.error = null
        state.lastRegistration = action.payload
        const email = action.payload.user?.email ?? (action.meta.arg as MobileUserRegistrationDto).email
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
      .addCase(emailExistsThunk.rejected, (state) => {
        state.loading = false
      })
  },
})

export const { clearMobileClientAuthError, setPendingIdentifier, clearLastRegistration } =
  mobileClientAuthSlice.actions
export const mobileClientAuthReducer = mobileClientAuthSlice.reducer
