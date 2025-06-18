import { initAuth } from './auth.js'
import { initChat } from './chat.js'
import { initProfile } from './profile.js'
import { initNavigation } from './navigation.js'
import { initExperimentalUI } from '../experimental/js/experimental.js'

export async function initializeApp() {
  try {
    // Initialize authentication first
    await initAuth()
    
    // Initialize API key from storage
    await initializeApiKey()
    
    // Initialize other components
    initChat()
    initProfile()
    initNavigation()
    initExperimentalUI()
    
  } catch (error) {
    console.error('Failed to initialize app:', error)
    showError('Failed to initialize application')
  }
}

async function initializeApiKey() {
  try {
    const { openRouterAPI } = await import('./openrouter.js')
    // This will trigger the API to check for stored keys
    openRouterAPI.updateApiKey()
  } catch (error) {
    console.error('Error initializing API key:', error)
  }
}

export function showError(message) {
  // Create error notification
  const errorDiv = document.createElement('div')
  errorDiv.className = 'error-notification'
  errorDiv.textContent = message
  document.body.appendChild(errorDiv)
  
  // Remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove()
  }, 5000)
}

export function showLoading(show = true) {
  const loadingOverlay = document.getElementById('loading-overlay')
  if (show) {
    loadingOverlay.classList.remove('hidden')
  } else {
    loadingOverlay.classList.add('hidden')
  }
}