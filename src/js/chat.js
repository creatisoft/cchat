import { openRouterAPI } from './openrouter.js'
import { showError, showLoading } from './app.js'
import { getCurrentUser } from './auth.js'
import { databaseService } from './database.js'
import { initSyntaxHighlighting, formatMessage, highlight } from './syntax.js'

let messageCount = 0
let conversationHistory = []
let currentConversationId = null
let webSearchEnabled = false

// Cache DOM elements for performance
let chatElements = null

function getChatElements() {
  if (!chatElements) {
    chatElements = {
      chatInput: document.getElementById('chat-input'),
      sendBtn: document.getElementById('send-btn'),
      webSearchBtn: document.getElementById('web-search-btn'),
      modelSelect: document.getElementById('model-select'),
      newChatBtn: document.getElementById('new-chat-btn'),
      chatMessages: document.getElementById('chat-messages'),
      conversationList: document.getElementById('conversation-list'),
      messageCountElement: document.getElementById('message-count')
    }
  }
  return chatElements
}

// Function to clear cache when DOM structure changes (e.g., UI mode switching)
export function clearElementCache() {
  chatElements = null
}

export async function initChat() {
  const elements = getChatElements()

  // Set up event listeners
  elements.chatInput.addEventListener('input', handleInputChange)
  elements.chatInput.addEventListener('keypress', handleKeyPress)
  elements.sendBtn.addEventListener('click', handleSendMessage)
  elements.webSearchBtn.addEventListener('click', handleWebSearchToggle)
  elements.modelSelect.addEventListener('change', handleModelChange)
  elements.newChatBtn.addEventListener('click', handleNewChat)

  // Auto-resize textarea
  elements.chatInput.addEventListener('input', autoResizeTextarea)

  // Initialize syntax highlighting
  initSyntaxHighlighting()

  // Populate available models
  await populateModelSelector()

  // Load conversation history
  await loadConversations()
}

async function handleNewChat() {
  // Clear chat messages without creating a new conversation yet
  const elements = getChatElements()
  elements.chatMessages.innerHTML = `
    <div class="welcome-message">
      <h3>👋 Welcome to Creatisoft Chat! 😀</h3>
      <p>Select a model 🤖 and start chatting 🗣️ with AI assistants.</p>
    </div>
  `

  // Clear conversation history and ID
  conversationHistory = []
  currentConversationId = null
}

function handleWebSearchToggle() {
  const elements = getChatElements()
  webSearchEnabled = !webSearchEnabled
  
  if (webSearchEnabled) {
    elements.webSearchBtn.classList.add('active')
    elements.webSearchBtn.title = 'Web search enabled - click to disable'
  } else {
    elements.webSearchBtn.classList.remove('active')
    elements.webSearchBtn.title = 'Enable web search'
  }
}

export function generateConversationTitle(message, response) {
  // Use the 'content' from the messages table as the title
  const maxLength = 30;
  let title = message.trim();

  // If message is too long, truncate it
  if (title.length > maxLength) {
    title = title.substring(0, maxLength).trim() + '...';
  }

  return title;
}

async function handleSendMessage() {
  const user = getCurrentUser();
  if (!user) return;

  const elements = getChatElements();
  const message = elements.chatInput.value.trim();

  if (!message) return;

  // Clear input and disable send button
  elements.chatInput.value = '';
  handleInputChange();
  autoResizeTextarea.call(elements.chatInput);

  try {
    const selectedModel = elements.modelSelect.value;

    // If this is a new conversation, create it with the title from the first message
    if (!currentConversationId) {
      const title = generateConversationTitle(message);
      const conversation = await databaseService.createConversation(user.id, title);
      currentConversationId = conversation.id;
      // Load the new conversation immediately
      await loadConversations();
    }

    // Add user message with web search indicator if enabled
    addMessage(message, 'user', false, webSearchEnabled);
    await databaseService.saveMessage(currentConversationId, user.id, message, 'user');

    const currentMessage = { role: 'user', content: message };
    conversationHistory.push(currentMessage);

    // Create assistant message container for streaming
    const assistantMessageDiv = createStreamingMessageContainer('assistant');
    let fullResponse = '';

    try {
      const response = await openRouterAPI.sendStreamingMessage(
        conversationHistory, 
        selectedModel,
        (chunk) => {
          fullResponse += chunk;
          updateStreamingMessage(assistantMessageDiv, fullResponse);
        },
        { webSearch: webSearchEnabled }
      );

      // Ensure we have the complete response
      if (fullResponse !== response) {
        fullResponse = response;
        updateStreamingMessage(assistantMessageDiv, fullResponse);
      }
    } catch (streamError) {
      console.warn('Streaming failed, falling back to regular API:', streamError);
      
      // Remove the streaming message container
      assistantMessageDiv.remove();
      
      // Fall back to regular API
      fullResponse = await openRouterAPI.sendMessage(conversationHistory, selectedModel, { webSearch: webSearchEnabled });
      addMessage(fullResponse, 'assistant');
    }

    await databaseService.saveMessage(currentConversationId, user.id, fullResponse, 'assistant');

    conversationHistory.push({ role: 'assistant', content: fullResponse });
    messageCount++;
    updateMessageCount();
  } catch (error) {
    handleChatError(error);
  }
}

async function addMessage(content, role, isError = false, hasWebSearch = false) {
  const elements = getChatElements()

  // Remove welcome message if it exists
  const welcomeMessage = elements.chatMessages.querySelector('.welcome-message')
  if (welcomeMessage) {
    welcomeMessage.remove()
  }

  const messageDiv = document.createElement('div')
  messageDiv.className = `message ${role}-message ${isError ? 'error' : ''}`

  const messageContent = document.createElement('div')
  messageContent.className = 'message-content'
  
  // Apply syntax highlighting for assistant messages or error messages that might contain code
  if (role === 'assistant' || isError) {
    // Use our formatMessage function to process code blocks
    const formattedContent = formatMessage(content)
    messageContent.innerHTML = '' // Clear content
    messageContent.appendChild(formattedContent)
  } else {
    // For user messages, just use text content
    messageContent.textContent = content
  }

  const messageTime = document.createElement('div')
  messageTime.className = 'message-time'
  const currentTime = new Date().toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  
  // Add web search indicator for user messages
  if (role === 'user' && hasWebSearch) {
    messageTime.innerHTML = `
      <span class="web-search-indicator" title="Web search enabled">🌐</span>
      ${currentTime}
    `
  } else {
    messageTime.textContent = currentTime
  }

  messageDiv.appendChild(messageContent)
  messageDiv.appendChild(messageTime)

  elements.chatMessages.appendChild(messageDiv)

  // Only create/update sticky note for the first message of a conversation (when it's created)
  // The sticky notes will be refreshed through loadConversations() call above

  // Scroll to bottom
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight
}

function createStreamingMessageContainer(role, isError = false) {
  const elements = getChatElements()

  // Remove welcome message if it exists
  const welcomeMessage = elements.chatMessages.querySelector('.welcome-message')
  if (welcomeMessage) {
    welcomeMessage.remove()
  }

  const messageDiv = document.createElement('div')
  messageDiv.className = `message ${role}-message ${isError ? 'error' : ''}`

  const messageContent = document.createElement('div')
  messageContent.className = 'message-content'
  messageContent.textContent = ''

  const messageTime = document.createElement('div')
  messageTime.className = 'message-time'
  const currentTime = new Date().toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  messageTime.textContent = currentTime

  messageDiv.appendChild(messageContent)
  messageDiv.appendChild(messageTime)

  elements.chatMessages.appendChild(messageDiv)

  // Scroll to bottom
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight

  return messageDiv
}

function updateStreamingMessage(messageDiv, content) {
  const messageContent = messageDiv.querySelector('.message-content')
  if (messageContent) {
    // Use our formatMessage function to process potential code blocks
    const formattedContent = formatMessage(content)
    
    // Replace the content with the formatted version
    messageContent.innerHTML = ''
    messageContent.appendChild(formattedContent)
    
    // Scroll to bottom to keep up with streaming content
    const elements = getChatElements()
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight
  }
}

function autoResizeTextarea() {
  this.style.height = 'auto'
  this.style.height = Math.min(this.scrollHeight, 120) + 'px'
}

function handleModelChange() {
  // Clear conversation history when model changes
  conversationHistory = []

  // Add system message about model change
  const elements = getChatElements()
  const modelName = elements.modelSelect.options[elements.modelSelect.selectedIndex].text

  const systemMessage = document.createElement('div')
  systemMessage.className = 'system-message'
  systemMessage.textContent = `Switched to ${modelName}`

  elements.chatMessages.appendChild(systemMessage)
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight
}

function updateMessageCount() {
  const elements = getChatElements()
  if (elements.messageCountElement) {
    elements.messageCountElement.textContent = messageCount
  }
}

export function getMessageCount() {
  return messageCount
}

function handleChatError(error) {
  console.error('Chat error:', error)

  // Show error in chat
  const errorMessage = error.message || 'An error occurred while processing your message.'
  addMessage(errorMessage, 'assistant', true)

  // Show error notification
  showError('Failed to get response. Please try again.')

  // Remove failed message from conversation history
  if (conversationHistory.length > 0) {
    conversationHistory.pop() // Remove the last message that failed
  }
}

async function loadConversations() {
  const user = getCurrentUser()
  if (!user) return

  try {
    const conversations = await databaseService.getConversations(user.id)
    updateConversationList(conversations)
    
    // Refresh sticky notes if experimental UI is active
    const chatPage = document.getElementById('chat-page')
    if (chatPage?.classList.contains('experimental-ui')) {
      try {
        const { refreshStickyNotes } = await import('../experimental/js/experimental.js')
        await refreshStickyNotes()
      } catch (error) {
        // Ignore if experimental module is not available
      }
    }
  } catch (error) {
    console.error('Error loading conversations:', error)
    showError('Failed to load conversation history')
  }
}

export async function deleteConversation(conversationId) {
  const user = getCurrentUser();
  if (!user) return;

  try {
    // Delete the conversation and its messages
    await databaseService.deleteConversation(conversationId);

    // If we're deleting the current conversation, clear the chat
    if (conversationId === currentConversationId) {
      handleNewChat();
    }

    // Reload the conversation list and refresh sticky notes
    await loadConversations();
  } catch (error) {
    console.error('Error deleting conversation:', error);
    showError('Failed to delete conversation');
  }
}

function updateConversationList(conversations = []) {
  // Clear element cache to ensure we get fresh DOM references
  clearElementCache()
  
  const container = document.querySelector('.conversation-container');
  if (!container) return;

  // Clear the container if no conversations exist
  if (conversations.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = conversations
    .map(conv => `
      <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" 
           data-id="${conv.id}">
        <button class="delete-conversation" title="Delete conversation">×</button>
        <span class="conversation-title">${conv.title || 'New Chat'}</span>
        <span class="conversation-time">${new Date(conv.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      </div>
    `)
    .join('');

  // Add click listeners
  container.querySelectorAll('.conversation-item').forEach(item => {
    // Conversation click handler
    item.addEventListener('click', (e) => {
      // Don't load conversation if delete button was clicked
      if (!e.target.classList.contains('delete-conversation')) {
        loadConversation(item.dataset.id);
      }
    });

    // Delete button click handler
    const deleteBtn = item.querySelector('.delete-conversation');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent conversation from being loaded
      if (confirm('Are you sure you want to delete this conversation?')) {
        deleteConversation(item.dataset.id);
      }
    });
  });
}

export async function loadConversation(conversationId) {
  const user = getCurrentUser()
  if (!user) return

  try {
    const messages = await databaseService.getMessages(conversationId)

    // Clear current chat - use fresh DOM reference
    clearElementCache()
    const elements = getChatElements()
    elements.chatMessages.innerHTML = ''

    // Load messages
    messages.forEach(msg => {
      addMessage(msg.content, msg.role)
    })

    // Apply syntax highlighting to all loaded messages that might contain code
    highlight(elements.chatMessages)

    // Update current conversation
    currentConversationId = conversationId
    conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Update UI - this will refresh the conversation list with current selection
    const conversations = await databaseService.getConversations(user.id)
    updateConversationList(conversations)
  } catch (error) {
    console.error('Error loading conversation:', error)
    showError('Failed to load conversation')
  }
}

function handleInputChange() {
  const elements = getChatElements()
  elements.sendBtn.disabled = !elements.chatInput.value.trim()
}

function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSendMessage()
  }
}

async function populateModelSelector() {
  // Using hardcoded models from index.html
  // No need to fetch models dynamically
}
