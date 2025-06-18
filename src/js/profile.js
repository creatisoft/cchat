import { getCurrentUser } from './auth.js'
import { getMessageCount } from './chat.js'

const API_KEY_STORAGE = 'openrouter_api_key'
let isInitialized = false

// Cache DOM elements for performance
let profileElements = null

function getProfileElements() {
  if (!profileElements) {
    profileElements = {
      deleteProfileBtn: document.getElementById('delete-profile-btn'),
      apiKeyInput: document.getElementById('api-key-input'),
      applyKeyBtn: document.getElementById('apply-key-btn'),
      deleteKeyBtn: document.getElementById('delete-key-btn'),
      statusDiv: document.getElementById('api-key-status')
    }
  }
  return profileElements
}

export function initProfile() {
  if (!isInitialized) {
    setupApiKeyManagement()
    setupDeleteProfileButton()
    isInitialized = true
  }
  
  // Update key status when profile is viewed
  updateKeyStatus()
}

function setupDeleteProfileButton() {
  const elements = getProfileElements()
  if (elements.deleteProfileBtn) {
    // Remove existing listener to avoid duplicates
    elements.deleteProfileBtn.replaceWith(elements.deleteProfileBtn.cloneNode(true))
    // Update cache after replacing
    profileElements = null
    const newElements = getProfileElements()
    
    newElements.deleteProfileBtn.addEventListener('click', async () => {
      await handleDeleteProfile()
    })
  }
}

async function handleDeleteProfile() {
  const user = getCurrentUser()
  if (!user) {
    alert('❌ You must be logged in to delete your profile')
    return
  }

  // First confirmation with detailed warning
  const firstConfirm = confirm(
    '⚠️ WARNING: You are about to permanently delete your profile.\n\n' +
    'This action will:\n' +
    '• Delete your account permanently\n' +
    '• Remove all your chat history\n' +
    '• Clear all your stored data\n' +
    '• Sign you out immediately\n\n' +
    'Are you sure you want to proceed?'
  )

  if (!firstConfirm) {
    return
  }

  // Final confirmation with email verification
  const userEmail = user.email || 'your account'
  const finalConfirm = confirm(
    '🚨 FINAL WARNING 🚨\n\n' +
    'This is your LAST CHANCE to cancel.\n\n' +
    'Once you click OK, your profile will be PERMANENTLY DELETED and cannot be recovered.\n\n' +
    `Account: ${userEmail}\n\n` +
    'Do you absolutely want to delete your profile forever?'
  )

  if (!finalConfirm) {
    return
  }

  try {
    // Show loading state
    const { showLoading } = await import('./app.js')
    showLoading(true)

    // TODO: Replace this with your actual profile deletion implementation
    // This should call your backend API to delete the user profile
    console.log('Profile deletion requested for user:', user.id)
    
    // Clear all local data
    localStorage.clear()
    sessionStorage.clear()
    
    // Show success message
    alert('✅ Profile deletion initiated. Implement your backend logic to complete this action.')
    
    showLoading(false)

  } catch (error) {
    console.error('Error deleting profile:', error)
    
    const { showLoading } = await import('./app.js')
    showLoading(false)
    
    const errorMessage = error.message || 'An unexpected error occurred'
    alert(`❌ Error: ${errorMessage}\n\nIf this problem persists, please contact support.`)
  }
}

// TODO: Replace this placeholder with your actual profile deletion backend function
async function deleteUserProfile() {
  // This function should handle the backend deletion of user profile and associated data
  // Steps to implement:
  // 1. Delete user's conversations and messages from database
  // 2. Delete user profile from authentication system
  // 3. Clean up any associated user data
  console.log('Delete user profile function called - implement your backend logic here')
  throw new Error('Profile deletion backend not implemented')
}



function setupApiKeyManagement() {
  const elements = getProfileElements()
  
  if (!elements.apiKeyInput || !elements.applyKeyBtn || !elements.deleteKeyBtn || !elements.statusDiv) return

  // Load existing key status and update UI
  updateKeyStatus()

  // Apply key button handler
  elements.applyKeyBtn.addEventListener('click', () => {
    const apiKey = elements.apiKeyInput.value.trim()
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error')
      return
    }

    if (!apiKey.startsWith('sk-or-')) {
      showStatus('Invalid OpenRouter API key format. Key should start with "sk-or-"', 'error')
      return
    }

    try {
      // Store the API key
      localStorage.setItem(API_KEY_STORAGE, apiKey)
      
      // Clear the input
      elements.apiKeyInput.value = ''
      
      // Update status and UI
      updateKeyStatus()
      showStatus('API key saved successfully!', 'success')
      
      // Update the OpenRouter API instance with the new key
      updateOpenRouterKey(apiKey)
      
    } catch (error) {
      console.error('Error saving API key:', error)
      showStatus('Failed to save API key', 'error')
    }
  })

  // Delete key button handler
  elements.deleteKeyBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete your API key? This will disable AI chat functionality.')) {
      try {
        localStorage.removeItem(API_KEY_STORAGE)
        
        // Update UI first
        updateKeyStatus()
        showStatus('API key deleted successfully', 'success')
        
        // Update the OpenRouter API instance to remove the key
        updateOpenRouterKey(null)
        
      } catch (error) {
        console.error('Error deleting API key:', error)
        showStatus('Failed to delete API key', 'error')
      }
    }
  })

  // Enter key support for API key input
  elements.apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      elements.applyKeyBtn.click()
    }
  })
}

function updateKeyStatus() {
  const elements = getProfileElements()
  
  if (!elements.statusDiv) return

  const storedKey = localStorage.getItem(API_KEY_STORAGE)
  
  if (storedKey && storedKey.trim()) {
    // Show masked version of the key
    const maskedKey = maskApiKey(storedKey)
    const keyDisplay = `🔑 Stored Key: ${maskedKey}`
    
    // Update status with stored key info
    elements.statusDiv.innerHTML = `
      <div class="stored-key-info">
        <span class="key-indicator">✅ API Key Active</span>
        <div class="masked-key">${keyDisplay}</div>
        <small class="key-hint">Your API key is securely stored and ready to use for AI chat functionality.</small>
      </div>
    `
    elements.statusDiv.className = 'api-key-status stored'
    elements.statusDiv.style.display = 'block'
    
    // Update input placeholder and buttons
    if (elements.apiKeyInput) {
      elements.apiKeyInput.placeholder = 'Enter new API key to replace current one...'
    }
    if (elements.applyKeyBtn) {
      elements.applyKeyBtn.textContent = 'Replace Key'
    }
    if (elements.deleteKeyBtn) {
      elements.deleteKeyBtn.style.display = 'inline-block'
    }
  } else {
    // No key stored
    elements.statusDiv.style.display = 'none'
    
    // Reset input placeholder and buttons
    if (elements.apiKeyInput) {
      elements.apiKeyInput.placeholder = 'Enter your OpenRouter API key...'
    }
    if (elements.applyKeyBtn) {
      elements.applyKeyBtn.textContent = 'Apply'
    }
    if (elements.deleteKeyBtn) {
      elements.deleteKeyBtn.style.display = 'none'
    }
  }
}

// Helper function to mask the API key for display
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 10) return '••••••••••••'
  
  // Show first 6 characters and last 4 characters, mask the middle
  const start = apiKey.substring(0, 6)
  const end = apiKey.substring(apiKey.length - 4)
  const masked = '•'.repeat(Math.max(8, apiKey.length - 10))
  
  return `${start}${masked}${end}`
}

function showStatus(message, type) {
  const elements = getProfileElements()
  if (!elements.statusDiv) return

  // For temporary messages (success/error), show them briefly then return to normal state
  if (type === 'success' || type === 'error') {
    elements.statusDiv.innerHTML = `<div class="temp-message">${message}</div>`
    elements.statusDiv.className = `api-key-status ${type}`
    elements.statusDiv.style.display = 'block'

    // Auto-hide and return to stored key status after 3 seconds
    setTimeout(() => {
      updateKeyStatus() // This will restore the proper stored key display or hide the status
    }, 3000)
  } else {
    // For persistent status (like stored key info), display immediately
    elements.statusDiv.textContent = message
    elements.statusDiv.className = `api-key-status ${type}`
    elements.statusDiv.style.display = 'block'
  }
}

async function updateOpenRouterKey(apiKey) {
  try {
    // Import the OpenRouter API and update the key
    const { openRouterAPI } = await import('./openrouter.js')
    if (openRouterAPI && typeof openRouterAPI.updateApiKey === 'function') {
      openRouterAPI.updateApiKey(apiKey)
    }
  } catch (error) {
    console.error('Error updating OpenRouter API key:', error)
  }
}

// Export function to get the stored API key
export function getStoredApiKey() {
  return localStorage.getItem(API_KEY_STORAGE)
}