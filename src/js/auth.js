import { supabase, initSupabaseAuth } from './supabase.js'
import { showError, showLoading } from './app.js'

let currentUser = null

export async function initAuth() {
  // TODO: Replace this with your authentication provider initialization
  // Example: Initialize Firebase Auth, Auth0, Supabase Auth, etc.
  console.log('Auth initialization - implement your own logic')
  
  // Set up initial button state (logged out by default)
  updateAuthButton(false)

  // Set up auth UI
  setupAuthUI()
}

function setupAuthUI() {
  const googleSignInBtn = document.getElementById('google-signin-btn')
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', handleGoogleSignIn)
  }

  // Setup help button and modal
  setupHelpModal()
}

function setupHelpModal() {
  const helpBtn = document.getElementById('help-btn')
  const aboutModal = document.getElementById('about-modal')
  const closeModalBtn = document.getElementById('close-modal')

  if (helpBtn && aboutModal && closeModalBtn) {
    // Open modal when help button is clicked
    helpBtn.addEventListener('click', () => {
      aboutModal.classList.remove('hidden')
    })

    // Close modal when close button is clicked
    closeModalBtn.addEventListener('click', () => {
      aboutModal.classList.add('hidden')
    })

    // Close modal when clicking outside of modal content
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) {
        aboutModal.classList.add('hidden')
      }
    })

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !aboutModal.classList.contains('hidden')) {
        aboutModal.classList.add('hidden')
      }
    })
  }
}

async function handleGoogleSignIn() {
  try {
    showLoading(true)
    
    // TODO: Replace this demo code with your actual Google OAuth implementation
    // Example: const result = await signInWithGoogle()
    console.log('Google sign-in requested - implement your own logic')
    
    // Simulate successful sign-in for demo purposes
    // Remove this and implement real authentication
    setTimeout(() => {
      const mockUser = {
        id: 'demo-user-' + Date.now(),
        email: 'demo@example.com',
        user_metadata: {
          full_name: 'Demo User',
          avatar_url: '/vite.svg'
        }
      }
      handleAuthSuccess(mockUser)
      showLoading(false)
    }, 1000)
    
  } catch (error) {
    console.error('Google sign in error:', error)
    showError('Failed to sign in with Google')
    showLoading(false)
  }
}

async function handleSignOut() {
  try {
    showLoading(true)
    
    // TODO: Replace this with your actual sign-out implementation  
    // Example: await signOut()
    console.log('Sign-out requested - implement your own logic')
    
    // Simulate sign-out
    handleAuthSignOut()
    
  } catch (error) {
    console.error('Sign out error:', error)
    showError('Failed to sign out')
  } finally {
    showLoading(false)
  }
}

function handleAuthSuccess(user) {
  currentUser = user
  showMainApp()
  updateUserProfile(user)
  updateAuthButton(true)
  
  // Refresh sticky notes if in experimental mode
  setTimeout(async () => {
    try {
      const { refreshStickyNotes } = await import('../experimental/js/experimental.js');
      await refreshStickyNotes();
    } catch (error) {
      // Ignore errors if experimental module is not available
    }
  }, 100);
}

function handleAuthSignOut() {
  currentUser = null
  // Show chat page and hide profile page
  const chatPage = document.getElementById('chat-page')
  const profilePage = document.getElementById('profile-page')
  if (chatPage) chatPage.classList.remove('hidden')
  if (profilePage) profilePage.classList.add('hidden')
  updateAuthButton(false)
}

function showMainApp() {
  const mainApp = document.getElementById('main-app');
  if (mainApp) {
    mainApp.classList.remove('hidden');
  }
}

function updateUserProfile(user) {
  const userName = document.getElementById('user-name')
  const userEmail = document.getElementById('user-email')
  const userAvatar = document.getElementById('user-avatar')

  if (userName) userName.textContent = user.user_metadata?.full_name || 'Anonymous User'
  if (userEmail) userEmail.textContent = user.email || 'No email'
  if (userAvatar) userAvatar.src = user.user_metadata?.avatar_url || '/vite.svg'
}

function updateAuthButton(isLoggedIn) {
  const button = document.getElementById('google-signin-btn');
  if (button) {
    if (isLoggedIn) {
      button.innerHTML = 'Logout';
      button.classList.add('logout-btn');
      button.classList.remove('google-signin-btn');
      button.removeEventListener('click', handleGoogleSignIn);
      button.addEventListener('click', handleSignOut);
    } else {
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      `;
      button.classList.add('google-signin-btn');
      button.classList.remove('logout-btn');
      button.removeEventListener('click', handleSignOut);
      button.addEventListener('click', handleGoogleSignIn);
    }
  }
}

export function getCurrentUser() {
  return currentUser
}