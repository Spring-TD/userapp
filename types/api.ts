export interface ApiResponse<TData = unknown> {
  success: boolean
  message?: string
  error?: string
  data?: TData
}

export interface PaginatedResponse<TItem> extends ApiResponse {
  data?: {
    items: TItem[]
    page: number
    pageSize: number
    total: number
  }
}

