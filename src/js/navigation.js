export function initNavigation() {
  const navChat = document.getElementById('nav-chat')
  const navProfile = document.getElementById('nav-profile')
  const navLogo = document.querySelector('.nav-logo')

  navChat.addEventListener('click', () => {
    showPage('chat')
    setActiveNav('chat')
  })

  navProfile.addEventListener('click', async () => {
    showPage('profile')
    setActiveNav('profile')
    
    // Initialize/update profile when switching to profile
    try {
      const { initProfile } = await import('./profile.js')
      initProfile()
    } catch (error) {
      console.error('Error initializing profile:', error)
    }
  })

  // Add click handler to logo - navigate to chat page
  if (navLogo) {
    navLogo.addEventListener('click', () => {
      showPage('chat')
      setActiveNav('chat')
    })
  }

  // Initialize with chat page
  showPage('chat')
  setActiveNav('chat')
}

function showPage(page) {
  const chatPage = document.getElementById('chat-page')
  const profilePage = document.getElementById('profile-page')

  if (page === 'chat') {
    chatPage.classList.remove('hidden')
    profilePage.classList.add('hidden')
  } else if (page === 'profile') {
    chatPage.classList.add('hidden')
    profilePage.classList.remove('hidden')
  }
}

function setActiveNav(page) {
  const navChat = document.getElementById('nav-chat')
  const navProfile = document.getElementById('nav-profile')

  navChat.classList.remove('active')
  navProfile.classList.remove('active')

  if (page === 'chat') {
    navChat.classList.add('active')
  } else if (page === 'profile') {
    navProfile.classList.add('active')
  }
}