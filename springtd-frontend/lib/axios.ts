import axios from "axios"
import { toast } from "react-toastify"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // useful if you use cookies for auth
})

// ✅ Global response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message

    switch (status) {
      case 400:
        toast.error(message || "Invalid request, please check your input")
        break
      case 401:
        toast.error("Session expired, please log in again")
        // optional: force logout or redirect
        break
      case 403:
        toast.error("You don’t have permission to do that")
        break
      case 404:
        toast.error("Resource not found")
        break
      case 500:
        toast.error("Server error, please try again later")
        break
      default:
        toast.error(message || "An unexpected error occurred")
    }

    return Promise.reject(error) // still reject so components can handle if needed
  }
)

export default api
