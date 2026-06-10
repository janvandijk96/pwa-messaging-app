import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { registerServiceWorker } from './services/sw'
import './styles/globals.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  registerServiceWorker()
}

// Check for updates in background
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    setInterval(() => {
      registration.update()
    }, 60000) // Check every minute
  })
}

app.mount('#app')