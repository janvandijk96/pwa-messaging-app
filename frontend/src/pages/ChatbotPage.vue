<template>
  <div class="flex h-screen bg-bg-light dark:bg-bg-dark flex-col">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ ollamaAvailable ? '🤖 Chatbot' : '⚫ Chatbot Offline' }}</h1>
      <router-link to="/chat" class="px-4 py-2 bg-pastel-blue text-white rounded-lg hover:opacity-90">
        Back to Chat
      </router-link>
    </div>

    <!-- Chat area -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-for="msg in chatMessages" :key="msg.id" :class="msg.role === 'user' ? 'text-right' : ''">
        <div
          :class="[
            'inline-block px-4 py-2 rounded-lg max-w-2xl',
            msg.role === 'user'
              ? 'bg-gradient-to-r from-pastel-pink to-pastel-peach text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-text-light dark:text-text-dark'
          ]"
        >
          {{ msg.content }}
        </div>
      </div>
    </div>

    <!-- Input -->
    <div v-if="ollamaAvailable" class="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4">
      <form @submit.prevent="sendMessage" class="flex space-x-2">
        <input
          v-model="userMessage"
          type="text"
          placeholder="Ask the chatbot..."
          :disabled="loading"
          class="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
        />
        <button :disabled="loading" type="submit" class="px-6 py-2 bg-gradient-to-r from-pastel-pink to-pastel-peach text-white rounded-lg hover:opacity-90 disabled:opacity-50">
          {{ loading ? 'Sending...' : 'Send' }}
        </button>
      </form>
    </div>
    <div v-else class="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 text-center">
      <p class="text-gray-600 dark:text-gray-400">Chatbot is currently offline. Please try again later.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { apiClient } from '../services/api'

const authStore = useAuthStore()
const userMessage = ref('')
const chatMessages = ref([])
const loading = ref(false)
const ollamaAvailable = ref(false)

onMounted(async () => {
  try {
    const response = await apiClient.get('/ollama/status')
    ollamaAvailable.value = response.data.data.available
  } catch (err) {
    console.error('Failed to check Ollama status:', err)
  }
})

const sendMessage = async () => {
  if (!userMessage.value.trim()) return

  // Add user message
  chatMessages.value.push({
    id: Date.now(),
    role: 'user',
    content: userMessage.value
  })

  loading.value = true
  const message = userMessage.value
  userMessage.value = ''

  try {
    // Simulate response (in production, connect to actual Ollama API)
    chatMessages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: 'This is a placeholder response. Connect to actual Ollama API for real responses.'
    })
  } catch (err) {
    console.error('Failed to get response:', err)
  } finally {
    loading.value = false
  }
}
</script>