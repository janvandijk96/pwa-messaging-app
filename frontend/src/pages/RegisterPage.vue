<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark p-4">
    <div class="w-full max-w-md">
      <div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <h1 class="text-3xl font-bold text-center mb-2">Create Account</h1>
        <p class="text-center text-gray-600 dark:text-gray-400 mb-8">Join the conversation</p>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Invite Code</label>
            <input
              v-model="inviteToken"
              type="text"
              placeholder="Your invite code"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <input
              v-model="email"
              type="email"
              placeholder="your@email.com"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Nickname</label>
            <input
              v-model="nickname"
              type="text"
              placeholder="john_doe"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
              required
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-gradient-to-r from-pastel-pink to-pastel-peach text-white font-medium py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {{ loading ? 'Creating account...' : 'Create Account' }}
          </button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?
            <router-link to="/login" class="text-pastel-pink hover:underline font-medium">
              Login
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const nickname = ref('')
const inviteToken = ref('')
const loading = computed(() => authStore.loading)

const handleRegister = async () => {
  try {
    await authStore.register(email.value, nickname.value, inviteToken.value)
    router.push('/verify-email')
  } catch (err) {
    console.error('Registration error:', err)
  }
}
</script>