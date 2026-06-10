import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const isDarkMode = ref(false)
  const sidebarOpen = ref(true)
  const notification = ref(null)

  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value
    localStorage.setItem('darkMode', isDarkMode.value)
  }

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  const showNotification = (message, type = 'info', duration = 3000) => {
    notification.value = { message, type }
    if (duration > 0) {
      setTimeout(() => {
        notification.value = null
      }, duration)
    }
  }

  const initializeDarkMode = () => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) {
      isDarkMode.value = saved === 'true'
    } else {
      // Check system preference
      isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
  }

  return {
    isDarkMode,
    sidebarOpen,
    notification,
    toggleDarkMode,
    toggleSidebar,
    showNotification,
    initializeDarkMode
  }
})