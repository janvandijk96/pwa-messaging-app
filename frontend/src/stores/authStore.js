import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const isAuthenticated = computed(() => !!token.value)
  const loading = ref(false)
  const error = ref(null)

  const checkAuthStatus = () => {
    const storedToken = sessionStorage.getItem('auth_token')
    if (storedToken) {
      token.value = storedToken
      // Try to fetch user profile to verify token is valid
      fetchProfile()
    }
  }

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/users/profile')
      user.value = response.data.data
    } catch (err) {
      logout()
    }
  }

  const login = async (email) => {
    loading.value = true
    error.value = null
    try {
      // Get challenge
      const challengeRes = await apiClient.post('/auth/login-challenge', { email })
      const { challenge } = challengeRes.data.data

      // In production, use actual WebAuthn assertion
      // For now, simplified flow
      const verifyRes = await apiClient.post('/auth/login-verify', { email })
      const { token: newToken, user: userData } = verifyRes.data.data

      token.value = newToken
      user.value = userData
      sessionStorage.setItem('auth_token', newToken)
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const register = async (email, nickname, inviteToken) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('/auth/register', {
        email,
        nickname,
        inviteToken
      })
      return response.data.data
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Registration failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const verifyEmail = async (userId, verificationToken) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('/auth/verify-email', {
        userId,
        token: verificationToken
      })
      return response.data
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Email verification failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    sessionStorage.removeItem('auth_token')
    delete apiClient.defaults.headers.common['Authorization']
  }

  const updateProfile = async (nickname, avatar) => {
    try {
      const response = await apiClient.put('/users/profile', {
        nickname,
        avatar
      })
      user.value = response.data.data
      return response.data.data
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Update failed'
      throw err
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    checkAuthStatus,
    fetchProfile,
    login,
    register,
    verifyEmail,
    logout,
    updateProfile
  }
})