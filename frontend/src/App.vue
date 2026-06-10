<template>
  <div id="app" :class="{ dark: isDarkMode }">
    <div class="min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark transition-colors">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="$route.path" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from './stores/authStore'
import { useUIStore } from './stores/uiStore'

const authStore = useAuthStore()
const uiStore = useUIStore()

const isDarkMode = computed(() => uiStore.isDarkMode)

onMounted(() => {
  // Check if user is logged in
  authStore.checkAuthStatus()
  
  // Initialize notifications permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }

  // Setup auto-logout on inactivity
  let inactivityTimer
  const resetTimer = () => {
    clearTimeout(inactivityTimer)
    if (authStore.isAuthenticated) {
      inactivityTimer = setTimeout(() => {
        authStore.logout()
      }, 3600000) // 1 hour
    }
  }

  document.addEventListener('mousemove', resetTimer)
  document.addEventListener('keypress', resetTimer)
  resetTimer()
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --primary-pink: #FFB3D9;
  --primary-peach: #FFD9B3;
  --primary-mint: #B3FFD9;
  --primary-lavender: #D9B3FF;
  --primary-blue: #B3D9FF;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>