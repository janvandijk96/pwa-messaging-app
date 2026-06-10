<template>
  <div class="flex h-screen bg-bg-light dark:bg-bg-dark">
    <!-- Conversations sidebar -->
    <div class="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search conversations..."
          class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
        />
      </div>

      <div class="flex-1 overflow-y-auto">
        <div
          v-for="conv in conversations"
          :key="conv.conversationId"
          @click="selectConversation(conv)"
          class="p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition"
        >
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-pastel-pink to-pastel-peach flex items-center justify-center text-white font-bold">
              {{ conv.withUser.nickname[0].toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium truncate">{{ conv.withUser.nickname }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 truncate">{{ conv.lastMessage }}</p>
            </div>
            <div v-if="conv.withUser.isOnline" class="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main chat area -->
    <div class="flex-1 flex flex-col">
      <!-- Header -->
      <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">{{ selectedUser?.nickname || 'Select a conversation' }}</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">{{ selectedUser?.isOnline ? '🟢 Online' : '⚪ Offline' }}</p>
        </div>
        <div class="flex space-x-2">
          <router-link to="/chatbot" class="px-4 py-2 text-sm bg-pastel-lavender text-white rounded-lg hover:opacity-90">Bot</router-link>
          <router-link to="/profile" class="px-4 py-2 text-sm bg-pastel-mint text-white rounded-lg hover:opacity-90">Profile</router-link>
        </div>
      </div>

      <!-- Messages -->
      <div v-if="selectedUser" class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-for="msg in currentMessages" :key="msg.id" :class="msg.senderId === authStore.user.id ? 'text-right' : ''">
          <div
            :class="[
              'inline-block px-4 py-2 rounded-lg max-w-xs',
              msg.senderId === authStore.user.id
                ? 'bg-gradient-to-r from-pastel-pink to-pastel-peach text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-text-light dark:text-text-dark'
            ]"
          >
            {{ msg.content }}
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">{{ formatTime(msg.createdAt) }}</p>
        </div>
      </div>

      <!-- Input -->
      <div v-if="selectedUser" class="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4">
        <form @submit.prevent="sendMessage" class="flex space-x-2">
          <input
            v-model="messageInput"
            type="text"
            placeholder="Type a message..."
            class="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none"
          />
          <button type="submit" class="px-6 py-2 bg-gradient-to-r from-pastel-pink to-pastel-peach text-white rounded-lg hover:opacity-90">
            Send
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useMessageStore } from '../stores/messageStore'
import { initSocket, socketClient } from '../services/socket'

const authStore = useAuthStore()
const messageStore = useMessageStore()

const selectedUser = ref(null)
const messageInput = ref('')
const searchQuery = ref('')

const conversations = computed(() => messageStore.conversations)
const currentMessages = computed(() =>
  selectedUser.value ? messageStore.messages[selectedUser.value.id] || [] : []
)

onMounted(async () => {
  // Initialize socket
  initSocket(authStore.token)

  // Fetch conversations
  await messageStore.fetchConversations()

  // Listen for new messages
  socketClient.on('message:received', (message) => {
    messageStore.handleMessageReceived(message)
  })
})

const selectConversation = (conv) => {
  selectedUser.value = conv.withUser
  messageStore.fetchMessages(conv.conversationId)
}

const sendMessage = async () => {
  if (!messageInput.value.trim() || !selectedUser.value) return

  try {
    await messageStore.sendMessage(selectedUser.value.id, messageInput.value)
    messageInput.value = ''
  } catch (err) {
    console.error('Failed to send message:', err)
  }
}

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString()
}
</script>