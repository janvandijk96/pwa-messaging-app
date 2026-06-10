<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark p-4">
    <div class="w-full max-w-md">
      <div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <h1 class="text-3xl font-bold text-center mb-2 text-text-light dark:text-text-dark">Messaging</h1>
        <p class="text-center text-gray-600 dark:text-gray-400 mb-8">End-to-end encrypted messaging</p>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <input
              v-model="email"
              type="email"
              placeholder="your@email.com"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pastel-pink"
              required
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-gradient-to-r from-pastel-pink to-pastel-peach text-white font-medium py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?
            <router-link to="/register" class="text-pastel-pink hover:underline font-medium">
              Sign up
            </router-link>
          </p>
        </div>

        <button
          @click="toggleDarkMode"
          class="mt-4 w-full bg-gray-200 dark:bg-gray-800 py-2 rounded-lg text-sm transition"
        >
          {{ isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'

const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUIStore()

const email = ref('')
const loading = computed(() => authStore.loading)
const isDarkMode = computed(() => uiStore.isDarkMode)

const handleLogin = async () => {
  try {
    await authStore.login(email.value)
    router.push('/chat')
  } catch (err) {
    console.error('Login error:', err)
  }
}

const toggleDarkMode = () => {
  uiStore.toggleDarkMode()
}
</script>