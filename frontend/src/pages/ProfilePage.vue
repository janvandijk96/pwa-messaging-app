<template>
  <div class="min-h-screen bg-bg-light dark:bg-bg-dark p-4">
    <div class="max-w-2xl mx-auto">
      <router-link to="/chat" class="text-pastel-pink hover:underline mb-4 inline-block">
        ← Back to Chat
      </router-link>

      <div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <h1 class="text-3xl font-bold mb-8">Your Profile</h1>

        <div class="space-y-6">
          <!-- Avatar -->
          <div>
            <label class="block text-sm font-medium mb-2">Profile Picture</label>
            <div class="flex items-center space-x-4">
              <div v-if="avatar" class="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-pastel-pink to-pastel-peach">
                <img :src="avatar" alt="Avatar" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-20 h-20 rounded-full bg-gradient-to-br from-pastel-pink to-pastel-peach flex items-center justify-center text-white text-2xl font-bold">
                {{ nickname[0].toUpperCase() }}
              </div>
              <input
                type="file"
                accept="image/*"
                @change="handleAvatarUpload"
                class="flex-1"
              />
            </div>
          </div>

          <!-- Nickname -->
          <div>
            <label class="block text-sm font-medium mb-2">Nickname</label>
            <input
              v-model="nickname"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pastel-pink"
            />
          </div>

          <!-- Email (read-only) -->
          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <input
              :value="email"
              type="email"
              disabled
              class="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
            />
          </div>

          <!-- Save button -->
          <button
            @click="saveProfile"
            :disabled="loading"
            class="w-full bg-gradient-to-r from-pastel-pink to-pastel-peach text-white font-medium py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {{ loading ? 'Saving...' : 'Save Changes' }}
          </button>

          <!-- Invite section -->
          <div class="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-bold mb-4">Invite Friends</h2>
            <button
              @click="generateInvite"
              :disabled="inviteLoading"
              class="w-full bg-gradient-to-r from-pastel-mint to-pastel-lavender text-white font-medium py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {{ inviteLoading ? 'Generating...' : 'Generate Invite Link' }}
            </button>
            <div v-if="inviteLink" class="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Share this link:</p>
              <div class="flex items-center space-x-2">
                <input
                  :value="inviteLink"
                  type="text"
                  readonly
                  class="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                />
                <button
                  @click="copyToClipboard"
                  class="px-4 py-2 bg-pastel-blue text-white rounded-lg hover:opacity-90 text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          <!-- Logout -->
          <button
            @click="logout"
            class="w-full bg-red-500 text-white font-medium py-2 rounded-lg hover:opacity-90 transition mt-6"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { apiClient } from '../services/api'

const router = useRouter()
const authStore = useAuthStore()

const nickname = ref(authStore.user?.nickname || '')
const email = computed(() => authStore.user?.email)
const avatar = ref(authStore.user?.avatar)
const loading = ref(false)
const inviteLoading = ref(false)
const inviteLink = ref('')

const handleAvatarUpload = async (e) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      avatar.value = event.target.result
    }
    reader.readAsDataURL(file)
  }
}

const saveProfile = async () => {
  loading.value = true
  try {
    await authStore.updateProfile(nickname.value, avatar.value)
  } catch (err) {
    console.error('Failed to save profile:', err)
  } finally {
    loading.value = false
  }
}

const generateInvite = async () => {
  inviteLoading.value = true
  try {
    const response = await apiClient.post('/invites/create')
    inviteLink.value = response.data.data.link
  } catch (err) {
    console.error('Failed to generate invite:', err)
  } finally {
    inviteLoading.value = false
  }
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    alert('Invite link copied to clipboard!')
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const logout = () => {
  authStore.logout()
  router.push('/login')
}
</script>