// Experimental UI functionality
import { generateConversationTitle } from '../../js/chat.js'
import { getCurrentUser } from '../../js/auth.js'
import { databaseService } from '../../js/database.js'

// State management
let dragState = {
  isDragging: false,
  xOffset: 0,
  yOffset: 0,
  currentElement: null
}

let resizeState = {
  isResizing: false,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  element: null
}

let stickyNotes = []
let textEditor = null

// Utility function for extracting coordinates from mouse/touch events
function getEventCoordinates(e) {
    return {
        clientX: e.type.includes('mouse') ? e.clientX : e.touches[0].clientX,
        clientY: e.type.includes('mouse') ? e.clientY : e.touches[0].clientY
    }
}

// Utility function for constraining element within viewport
function constrainToViewport(x, y, elementWidth, elementHeight) {
    return {
        x: Math.max(0, Math.min(window.innerWidth - elementWidth, x)),
        y: Math.max(0, Math.min(window.innerHeight - elementHeight, y))
    }
}

// Performance optimization: throttle drag updates using requestAnimationFrame
let rafId = null
function throttledUpdate(callback) {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
        callback()
        rafId = null
    })
}

export function initExperimentalUI() {
    // Listen for UI mode changes
    const uiSelect = document.getElementById('ui-select')
    if (!uiSelect) return
    
    uiSelect.addEventListener('change', handleUIChange)

    // Initialize experimental features if already in experimental mode
    const chatPage = document.getElementById('chat-page')
    if (chatPage && uiSelect.value === 'experimental') {
        chatPage.classList.add('experimental-ui')
        setupExperimentalFeatures()
    }
}

function handleUIChange(e) {
    const chatPage = document.getElementById('chat-page')
    const textEditorToggleContainer = document.getElementById('text-editor-toggle-container')
    
    if (e.target.value === 'experimental') {
        chatPage.classList.add('experimental-ui')
        if (textEditorToggleContainer) {
            textEditorToggleContainer.classList.remove('hidden')
        }
        setupExperimentalFeatures()
    } else {
        chatPage.classList.remove('experimental-ui')
        if (textEditorToggleContainer) {
            textEditorToggleContainer.classList.add('hidden')
            // Reset toggle state
            const textEditorToggle = document.getElementById('text-editor-toggle')
            if (textEditorToggle) {
                textEditorToggle.checked = false
            }
        }
        removeExperimentalFeatures()
        
        // Clear chat element cache to ensure fresh DOM references after UI mode change
        import('../../js/chat.js').then(module => {
            if (typeof module.clearElementCache === 'function') {
                module.clearElementCache()
            }
        }).catch(() => {
            // Ignore if function not available
        })
    }
}

function setupExperimentalFeatures() {
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        // Add a draggable title bar if it doesn't exist
        if (!chatContainer.querySelector('.chat-title')) {
            const titleBar = document.createElement('div');
            titleBar.className = 'chat-title';
            titleBar.textContent = 'Chat Window';
            chatContainer.insertBefore(titleBar, chatContainer.firstChild);
        }

        // Add resize handle if it doesn't exist
        if (!chatContainer.querySelector('.resize-handle')) {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            chatContainer.appendChild(resizeHandle);
        }

        // Only allow dragging from the title bar
        const titleBar = chatContainer.querySelector('.chat-title');
        if (titleBar) {
            titleBar.addEventListener('mousedown', dragStart);
            titleBar.addEventListener('touchstart', dragStart, { passive: false });
        }

        // Set up resize functionality
        const resizeHandle = chatContainer.querySelector('.resize-handle');
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', resizeStart);
            resizeHandle.addEventListener('touchstart', resizeStart, { passive: false });
        }

        // Add document-level event listeners for drag and resize
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', dragEnd);
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', resizeEnd);
        document.addEventListener('touchmove', resize, { passive: false });
        document.addEventListener('touchend', resizeEnd);
    }

    // Load existing conversations as sticky notes
    loadConversationsAsStickies();

    // Setup text editor toggle
    setupTextEditorToggle();
}

function removeExperimentalFeatures() {
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        // Stop any ongoing drag operation and clean up
        if (dragState.isDragging && dragState.currentElement === chatContainer) {
            dragEnd();
        }
        
        // Stop any ongoing resize operation and clean up
        if (resizeState.isResizing && resizeState.element === chatContainer) {
            resizeEnd();
        }
        
        const titleBar = chatContainer.querySelector('.chat-title');
        if (titleBar) {
            titleBar.removeEventListener('mousedown', dragStart);
            titleBar.removeEventListener('touchstart', dragStart);
            titleBar.remove();
        }
        
        const resizeHandle = chatContainer.querySelector('.resize-handle');
        if (resizeHandle) {
            resizeHandle.removeEventListener('mousedown', resizeStart);
            resizeHandle.removeEventListener('touchstart', resizeStart);
            resizeHandle.remove();
        }
        
        // Reset position, styling, and dimensions
        chatContainer.style.transform = '';
        chatContainer.style.position = '';
        chatContainer.style.left = '';
        chatContainer.style.top = '';
        chatContainer.style.width = '';
        chatContainer.style.height = '';
        chatContainer.style.margin = '';
        chatContainer.style.marginLeft = '';
        chatContainer.style.maxWidth = '';
        chatContainer.classList.remove('dragging', 'resizing');
    }

    // Clear all sticky notes and their specific listeners
    clearAllStickyNotes();

    // Remove text editor if it exists
    removeTextEditor();
}

function dragStart(e) {
    // Only drag if the target is the chat-title itself
    if (!e.target.classList.contains('chat-title')) return

    const container = e.target.closest('.chat-container')
    if (!container) return
    
    e.preventDefault()
    
    // Get the current position BEFORE making any changes
    const rect = container.getBoundingClientRect()
    
    // Calculate offset within the element
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY
    
    // Store offset from click point to container edges
    dragState.xOffset = clientX - rect.left
    dragState.yOffset = clientY - rect.top
    
    // Now set up drag state and styling
    dragState.isDragging = true
    dragState.currentElement = container
    
    // Add dragging class for styling
    container.classList.add('dragging')

    // Remove transform and set absolute position using the captured rect position
    container.style.transform = 'none'
    container.style.left = rect.left + 'px'
    container.style.top = rect.top + 'px'
}

function drag(e) {
    if (!dragState.isDragging || !dragState.currentElement) return
    
    if (e.type.includes('mouse')) {
        e.preventDefault()
    }

    // Get coordinates
    const { clientX, clientY } = getEventCoordinates(e)

    // Calculate new position
    let newX = clientX - dragState.xOffset
    let newY = clientY - dragState.yOffset

    // Constrain to viewport
    const rect = dragState.currentElement.getBoundingClientRect()
    const constrained = constrainToViewport(newX, newY, rect.width, rect.height)

    // Update position
    dragState.currentElement.style.left = constrained.x + 'px'
    dragState.currentElement.style.top = constrained.y + 'px'
}

function dragEnd() {
    if (!dragState.isDragging) return
    
    if (dragState.currentElement) {
        dragState.currentElement.classList.remove('dragging')
    }
    dragState.isDragging = false
    dragState.currentElement = null
}

function resizeStart(e) {
    if (!e.target.classList.contains('resize-handle')) return

    const container = e.target.closest('.chat-container')
    if (!container) return
    
    e.preventDefault()
    resizeState.isResizing = true
    resizeState.element = container
    
    container.classList.add('resizing')

    // Get starting dimensions and position
    const rect = container.getBoundingClientRect()
    resizeState.startWidth = rect.width
    resizeState.startHeight = rect.height

    // Get starting mouse/touch position
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY
    resizeState.startX = clientX
    resizeState.startY = clientY

    // Prevent text selection during resize
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'se-resize'
}

function resize(e) {
    if (!resizeState.isResizing || !resizeState.element) return
    
    if (e.type.includes('mouse')) {
        e.preventDefault()
    }

    // Get coordinates
    const { clientX, clientY } = getEventCoordinates(e)

    // Calculate new dimensions
    const deltaX = clientX - resizeState.startX
    const deltaY = clientY - resizeState.startY
    
    let newWidth = resizeState.startWidth + deltaX
    let newHeight = resizeState.startHeight + deltaY

    // Apply min/max constraints
    newWidth = Math.max(250, Math.min(800, newWidth))
    newHeight = Math.max(300, Math.min(600, newHeight))

    // Apply new dimensions
    resizeState.element.style.width = newWidth + 'px'
    resizeState.element.style.height = newHeight + 'px'
}

function resizeEnd() {
    if (!resizeState.isResizing) return
    
    if (resizeState.element) {
        resizeState.element.classList.remove('resizing')
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
    }
    resizeState.isResizing = false
    resizeState.element = null
}

// Load conversations from database and display as sticky notes
async function loadConversationsAsStickies() {
    const user = getCurrentUser()
    if (!user) return

    try {
        const conversations = await databaseService.getConversations(user.id)
        
        // Clear existing sticky notes
        clearAllStickyNotes()
        
        // Create sticky notes for each conversation
        conversations.forEach(conversation => {
            createStickyNoteFromConversation(conversation)
        })
    } catch (error) {
        console.error('Error loading conversations as stickies:', error)
    }
}

// Create a sticky note from a conversation object
function createStickyNoteFromConversation(conversation) {
    const sticky = document.createElement('div')
    sticky.className = 'sticky-note'
    sticky.dataset.conversationId = conversation.id
    
    // Position sticky note randomly, avoiding center area
    const position = generateStickyPosition()
    sticky.style.left = position.x + 'px'
    sticky.style.top = position.y + 'px'
    
    // Create content
    const previewContent = conversation.title || 'New Chat'
    const timeStr = new Date(conversation.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    })
    
    sticky.innerHTML = `
        <div class="sticky-drag-handle">📝 ${previewContent.substring(0, 15)}${previewContent.length > 15 ? '...' : ''}</div>
        <div class="sticky-content">
            <div class="close-button">×</div>
            <div class="sticky-title">${previewContent}</div>
            <div class="conversation-time">${timeStr}</div>
        </div>
    `
    
    // Setup event handlers
    setupStickyNoteEvents(sticky, conversation)
    
    // Add to DOM if in experimental mode
    const chatPage = document.getElementById('chat-page')
    if (chatPage?.classList.contains('experimental-ui')) {
        chatPage.appendChild(sticky)
        stickyNotes.push(sticky)
    }
}

function generateStickyPosition() {
    const padding = 20
    const stickyWidth = 200 // Approximate sticky width
    const stickyHeight = 150 // Approximate sticky height
    
    const maxX = window.innerWidth - stickyWidth - padding
    const maxY = window.innerHeight - stickyHeight - padding
    
    // Avoid center area where chat window is located
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    const avoidWidth = 350
    const avoidHeight = 450
    
    let x, y
    let attempts = 0
    const maxAttempts = 10
    
    do {
        x = Math.max(padding, Math.random() * maxX)
        y = Math.max(padding, Math.random() * maxY)
        attempts++
        
        if (attempts >= maxAttempts) break
        
    } while (
        x > centerX - avoidWidth/2 && x < centerX + avoidWidth/2 &&
        y > centerY - avoidHeight/2 && y < centerY + avoidHeight/2
    )
    
    return { x, y }
}

function setupStickyNoteEvents(sticky, conversation) {
    // Make it draggable
    makeStickyDraggable(sticky)
    
    // Click to load conversation
    let clickTimeout
    sticky.addEventListener('mousedown', () => {
        clickTimeout = setTimeout(() => { clickTimeout = null }, 200)
    })

    sticky.addEventListener('click', async (e) => {
        if (e.target.classList.contains('close-button')) return
        
        if (clickTimeout) {
            clearTimeout(clickTimeout)
            try {
                const { loadConversation } = await import('../../js/chat.js')
                await loadConversation(conversation.id)
            } catch (error) {
                const { showError } = await import('../../js/app.js')
                showError('Failed to load conversation')
            }
        }
    })
    
    // Delete functionality
    const closeBtn = sticky.querySelector('.close-button')
    closeBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        
        if (confirm('Are you sure you want to delete this conversation?')) {
            try {
                const { deleteConversation } = await import('../../js/chat.js')
                await deleteConversation(conversation.id)
                
                sticky.remove()
                stickyNotes = stickyNotes.filter(note => note !== sticky)
            } catch (error) {
                const { showError } = await import('../../js/app.js')
                showError('Failed to delete conversation')
            }
        }
    })
}

// Make a sticky note draggable
function makeStickyDraggable(sticky) {
    let stickyDragState = {
        isDragging: false,
        xOffset: 0,
        yOffset: 0
    }

    function stickyDragStart(e) {
        if (!e.target.classList.contains('sticky-drag-handle') || (e.type === 'mousedown' && e.button !== 0)) return
        
        e.preventDefault()
        stickyDragState.isDragging = true
        sticky.classList.add('dragging')
        sticky.style.zIndex = '1010'
        document.body.style.userSelect = 'none'

        const rect = sticky.getBoundingClientRect()
        sticky.style.transform = 'none'
        sticky.style.top = rect.top + 'px'
        sticky.style.left = rect.left + 'px'

        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY
        stickyDragState.xOffset = clientX - rect.left
        stickyDragState.yOffset = clientY - rect.top

        document.addEventListener('mousemove', stickyDrag)
        document.addEventListener('mouseup', stickyDragEnd)
        document.addEventListener('touchmove', stickyDrag, { passive: false })
        document.addEventListener('touchend', stickyDragEnd)
    }

    function stickyDrag(e) {
        if (!stickyDragState.isDragging) return
        
        if (e.type.includes('mouse')) e.preventDefault()
        
        const { clientX, clientY } = getEventCoordinates(e)
        
        let newX = clientX - stickyDragState.xOffset
        let newY = clientY - stickyDragState.yOffset
        
        const rect = sticky.getBoundingClientRect()
        const constrained = constrainToViewport(newX, newY, rect.width, rect.height)
        
        sticky.style.left = constrained.x + 'px'
        sticky.style.top = constrained.y + 'px'
    }

    function stickyDragEnd() {
        if (!stickyDragState.isDragging) return
        
        stickyDragState.isDragging = false
        sticky.classList.remove('dragging')
        sticky.style.zIndex = '1000'
        document.body.style.userSelect = ''
        
        document.removeEventListener('mousemove', stickyDrag)
        document.removeEventListener('mouseup', stickyDragEnd)
        document.removeEventListener('touchmove', stickyDrag)
        document.removeEventListener('touchend', stickyDragEnd)
    }

    // Add event listeners
    const dragHandle = sticky.querySelector('.sticky-drag-handle')
    dragHandle.addEventListener('mousedown', stickyDragStart)
    dragHandle.addEventListener('touchstart', stickyDragStart, { passive: false })
}

// Clear all sticky notes
function clearAllStickyNotes() {
    stickyNotes.forEach(sticky => {
        if (sticky.parentNode) {
            // Potentially remove specific drag listeners if they were added directly to the sticky
            // and not to the document. In our current makeStickyDraggable, listeners are on document
            // and managed there, or on the sticky itself but should be cleaned up if the sticky is removed.
            sticky.remove(); 
        }
    });
    stickyNotes = [];
    // It's crucial that drag listeners added to `document` in `makeStickyDraggable` 
    // are removed when the drag ends. If `removeExperimentalFeatures` is called mid-drag,
    // those listeners might persist. This is a more complex scenario to handle perfectly
    // without a more robust event management system for dynamic elements.
    // For now, we rely on dragEnd to clean up its document listeners.
}

// Export function to refresh sticky notes (called when conversations change)
export async function refreshStickyNotes() {
    const chatPage = document.getElementById('chat-page');
    if (chatPage && chatPage.classList.contains('experimental-ui')) {
        await loadConversationsAsStickies();
    }
}

// Text Editor functionality
function setupTextEditorToggle() {
    const textEditorToggle = document.getElementById('text-editor-toggle');
    if (textEditorToggle) {
        textEditorToggle.addEventListener('change', handleTextEditorToggle);
    }
}

function handleTextEditorToggle(e) {
    if (e.target.checked) {
        createTextEditor();
    } else {
        removeTextEditor();
    }
}

function createTextEditor() {
    if (textEditor) return; // Already exists

    const chatPage = document.getElementById('chat-page');
    if (!chatPage) return;

    // Create text editor container
    textEditor = document.createElement('div');
    textEditor.className = 'text-editor-container';
    
    // Position it to the right of the chat window
    textEditor.style.position = 'fixed';
    textEditor.style.top = '50%';
    textEditor.style.right = '20px';
    textEditor.style.transform = 'translateY(-50%)';
    textEditor.style.width = '400px';
    textEditor.style.height = '500px';
    textEditor.style.zIndex = '1000';

    // Create title bar
    const titleBar = document.createElement('div');
    titleBar.className = 'text-editor-title';
    
    // Create title text
    const titleText = document.createElement('span');
    titleText.textContent = 'Text Editor';
    titleText.className = 'text-editor-title-text';
    
    // Create save button
    const saveButton = document.createElement('button');
    saveButton.className = 'text-editor-save-btn';
    saveButton.innerHTML = '💾 Save';
    saveButton.title = 'Save as .txt file';
    
    // Add save functionality
    saveButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent drag from triggering
        saveTextFile();
    });
    
    // Assemble title bar
    titleBar.appendChild(titleText);
    titleBar.appendChild(saveButton);

    // Create textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'text-editor-textarea';
    textarea.placeholder = 'Start writing...';

    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'text-editor-resize-handle';

    // Assemble the text editor
    textEditor.appendChild(titleBar);
    textEditor.appendChild(textarea);
    textEditor.appendChild(resizeHandle);

    // Add to page
    chatPage.appendChild(textEditor);

    // Make it draggable and resizable
    makeTextEditorDraggable();
    makeTextEditorResizable();
}

function removeTextEditor() {
    if (textEditor && textEditor.parentNode) {
        textEditor.remove();
        textEditor = null;
    }
}

function makeTextEditorDraggable() {
    if (!textEditor) return;

    const titleBar = textEditor.querySelector('.text-editor-title');
    if (!titleBar) return;

    let editorDragState = {
        isDragging: false,
        xOffset: 0,
        yOffset: 0
    };

    function editorDragStart(e) {
        // Only allow dragging from title text or title bar background, not the save button
        if (e.target.classList.contains('text-editor-save-btn') || 
            e.target.closest('.text-editor-save-btn') ||
            (e.type === 'mousedown' && e.button !== 0)) return;
        
        e.preventDefault();
        editorDragState.isDragging = true;
        textEditor.classList.add('dragging');

        const rect = textEditor.getBoundingClientRect();
        textEditor.style.transform = 'none';
        textEditor.style.top = rect.top + 'px';
        textEditor.style.left = rect.left + 'px';

        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        editorDragState.xOffset = clientX - rect.left;
        editorDragState.yOffset = clientY - rect.top;

        document.addEventListener('mousemove', editorDrag);
        document.addEventListener('mouseup', editorDragEnd);
        document.addEventListener('touchmove', editorDrag, { passive: false });
        document.addEventListener('touchend', editorDragEnd);
    }

    function editorDrag(e) {
        if (!editorDragState.isDragging) return;
        
        if (e.type.includes('mouse')) e.preventDefault();
        
        const { clientX, clientY } = getEventCoordinates(e);
        
        let newX = clientX - editorDragState.xOffset;
        let newY = clientY - editorDragState.yOffset;
        
        const rect = textEditor.getBoundingClientRect();
        const constrained = constrainToViewport(newX, newY, rect.width, rect.height);
        
        textEditor.style.left = constrained.x + 'px';
        textEditor.style.top = constrained.y + 'px';
    }

    function editorDragEnd() {
        if (!editorDragState.isDragging) return;
        
        editorDragState.isDragging = false;
        textEditor.classList.remove('dragging');
        
        document.removeEventListener('mousemove', editorDrag);
        document.removeEventListener('mouseup', editorDragEnd);
        document.removeEventListener('touchmove', editorDrag);
        document.removeEventListener('touchend', editorDragEnd);
    }

    titleBar.addEventListener('mousedown', editorDragStart);
    titleBar.addEventListener('touchstart', editorDragStart, { passive: false });
}

function makeTextEditorResizable() {
    if (!textEditor) return;

    const resizeHandle = textEditor.querySelector('.text-editor-resize-handle');
    if (!resizeHandle) return;

    let editorResizeState = {
        isResizing: false,
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0
    };

    function editorResizeStart(e) {
        if (!e.target.classList.contains('text-editor-resize-handle')) return;

        e.preventDefault();
        editorResizeState.isResizing = true;
        textEditor.classList.add('resizing');

        const rect = textEditor.getBoundingClientRect();
        editorResizeState.startWidth = rect.width;
        editorResizeState.startHeight = rect.height;

        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        editorResizeState.startX = clientX;
        editorResizeState.startY = clientY;

        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'se-resize';

        document.addEventListener('mousemove', editorResize);
        document.addEventListener('mouseup', editorResizeEnd);
        document.addEventListener('touchmove', editorResize, { passive: false });
        document.addEventListener('touchend', editorResizeEnd);
    }

    function editorResize(e) {
        if (!editorResizeState.isResizing) return;
        
        if (e.type.includes('mouse')) e.preventDefault();

        const { clientX, clientY } = getEventCoordinates(e);

        const deltaX = clientX - editorResizeState.startX;
        const deltaY = clientY - editorResizeState.startY;
        
        let newWidth = editorResizeState.startWidth + deltaX;
        let newHeight = editorResizeState.startHeight + deltaY;

        newWidth = Math.max(300, Math.min(800, newWidth));
        newHeight = Math.max(200, Math.min(600, newHeight));

        textEditor.style.width = newWidth + 'px';
        textEditor.style.height = newHeight + 'px';
    }

    function editorResizeEnd() {
        if (!editorResizeState.isResizing) return;
        
        editorResizeState.isResizing = false;
        textEditor.classList.remove('resizing');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        
        document.removeEventListener('mousemove', editorResize);
        document.removeEventListener('mouseup', editorResizeEnd);
        document.removeEventListener('touchmove', editorResize);
        document.removeEventListener('touchend', editorResizeEnd);
    }

    resizeHandle.addEventListener('mousedown', editorResizeStart);
    resizeHandle.addEventListener('touchstart', editorResizeStart, { passive: false });
}

// Save text editor content as .txt file
function saveTextFile() {
    if (!textEditor) return;
    
    const textarea = textEditor.querySelector('.text-editor-textarea');
    if (!textarea) return;
    
    const content = textarea.value;
    
    // If content is empty, show a brief message
    if (!content.trim()) {
        const saveBtn = textEditor.querySelector('.text-editor-save-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '📝 Empty';
        saveBtn.style.backgroundColor = '#fbbf24'; // Yellow for warning
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.style.backgroundColor = ''; // Reset to CSS default
        }, 1500);
        return;
    }
    
    // Create blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    link.download = `text-editor-${timestamp}.txt`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    // Show success feedback
    const saveBtn = textEditor.querySelector('.text-editor-save-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '✅ Saved';
    saveBtn.style.backgroundColor = '#10b981'; // Green for success
    
    setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.style.backgroundColor = ''; // Reset to CSS default
    }, 2000);
}
