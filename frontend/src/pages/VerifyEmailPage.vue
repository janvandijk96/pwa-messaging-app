<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark p-4">
    <div class="w-full max-w-md">
      <div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <h1 class="text-3xl font-bold text-center mb-2">Verify Email</h1>
        <p class="text-center text-gray-600 dark:text-gray-400 mb-8">Check your email for verification link</p>

        <div class="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
          <p class="text-sm text-blue-800 dark:text-blue-100">We've sent a verification link to your email. Click the link to verify your email and activate your account.</p>
        </div>

        <form @submit.prevent="handleVerify" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Verification Code</label>
            <input
              v-model="verificationToken"
              type="text"
              placeholder="Paste the code from your email"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
              required
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-gradient-to-r from-pastel-pink to-pastel-peach text-white font-medium py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {{ loading ? 'Verifying...' : 'Verify Email' }}
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Don't see the email? Check your spam folder or <router-link to="/register" class="text-pastel-pink hover:underline">try registering again</router-link>.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const verificationToken = ref('')
const userId = ref('')
const loading = computed(() => authStore.loading)

onMounted(() => {
  // Get parameters from URL if available
  if (route.query.token) {
    verificationToken.value = route.query.token
  }
  if (route.query.userId) {
    userId.value = route.query.userId
  }
})

const handleVerify = async () => {
  try {
    await authStore.verifyEmail(userId.value || '', verificationToken.value)
    router.push('/login')
  } catch (err) {
    console.error('Verification error:', err)
  }
}
</script>