import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '../services/api'
import { socketClient } from '../services/socket'
import { encryptMessage, decryptMessage } from '../services/crypto'

export const useMessageStore = defineStore('messages', () => {
  const conversations = ref([])
  const currentConversation = ref(null)
  const messages = ref({})
  const loading = ref(false)

  const fetchConversations = async () => {
    loading.value = true
    try {
      const response = await apiClient.get('/messages/conversations')
      conversations.value = response.data.data
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchMessages = async (userId) => {
    loading.value = true
    try {
      const response = await apiClient.get(`/messages/${userId}`)
      messages.value[userId] = response.data.data.messages
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      loading.value = false
    }
  }

  const sendMessage = async (recipientId, plaintext) => {
    try {
      const { encryptedContent, encryptedKey, nonce } = await encryptMessage(
        plaintext,
        recipientId
      )

      const response = await apiClient.post('/messages', {
        recipientId,
        encryptedContent,
        encryptedKey,
        nonce
      })

      // Add to local messages
      if (!messages.value[recipientId]) {
        messages.value[recipientId] = []
      }
      messages.value[recipientId].push({
        id: response.data.data.id,
        senderId: response.data.data.senderId,
        recipientId,
        content: plaintext,
        createdAt: response.data.data.createdAt
      })

      return response.data.data
    } catch (err) {
      console.error('Failed to send message:', err)
      throw err
    }
  }

  const handleMessageReceived = async (message) => {
    const decrypted = await decryptMessage(
      message.encryptedContent,
      message.encryptedKey,
      message.nonce
    )

    if (!messages.value[message.senderId]) {
      messages.value[message.senderId] = []
    }
    messages.value[message.senderId].push({
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: decrypted,
      createdAt: message.createdAt
    })

    // Update conversation
    const convIndex = conversations.value.findIndex(
      c => c.conversationId === message.senderId
    )
    if (convIndex >= 0) {
      conversations.value[convIndex].lastMessage = decrypted
      conversations.value[convIndex].lastMessageAt = message.createdAt
    }
  }

  const deleteMessage = async (messageId) => {
    try {
      await apiClient.delete(`/messages/${messageId}`)
    } catch (err) {
      console.error('Failed to delete message:', err)
      throw err
    }
  }

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    handleMessageReceived,
    deleteMessage
  }
})