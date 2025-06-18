# Creatisoft Chat - Template

A modern, responsive AI chat application template with experimental UI features. This is a frontend-only template with placeholder backend functions that need to be implemented.

<img width="1440" alt="creatisoft-chat-screenshot" src="https://github.com/user-attachments/assets/d832d4f5-fb27-4479-889b-ccf8d07b7cf8" />


## ⚠️ Important Notice

This is a **template/demo version** with all backend logic removed for security. You'll need to implement your own:
- Authentication system
- Database storage
- Backend API endpoints

## Features

- **Multiple AI Models**: Frontend support for various AI models (backend integration required)
- **Conversation Management**: UI for saving/loading conversations (storage implementation required)
- **Syntax Highlighting**: Code blocks with Prism.js integration
- **Markdown Formatting**: Enhanced markdown rendering with Prettier for better readability
- **Dual UI Modes**: Switch between original and experimental UI
- **User Authentication**: UI ready for Google OAuth (authentication logic required)
- **Responsive Design**: Works on desktop and mobile devices

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `src/config.example.js` to `src/config.js` and add your API keys
4. Start the development server:
   ```bash
   npm run dev
   ```

**Note**: The app will run in demo mode with placeholder data until you implement the backend functions.

## Backend Implementation Required

To make this app fully functional, you need to implement:

### Authentication (`src/js/auth.js`)
- Replace placeholder Google OAuth with real authentication
- Implement user session management
- Connect to your authentication provider

### Database (`src/js/database.js`)  
- Implement conversation storage
- Implement message storage and retrieval
- Add user data management

### Configuration (`src/config.js`)
- Add your actual Supabase URL and keys
- Add your OpenRouter API configuration

## Configuration

The app template includes placeholders for:
- **Authentication Provider**: Replace Supabase placeholders with your auth system
- **OpenRouter**: AI model access (client-side API key storage)

See `src/config.example.js` for the configuration format.

## Project Structure

```
src/
├── js/           # Core application logic (contains TODO placeholders)
├── styles/       # CSS styles (complete)
├── experimental/ # Experimental UI features (complete)
└── config.js     # Configuration (needs implementation)
```

## Technologies Used

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Build Tool**: Vite
- **UI Features**: Syntax highlighting, Markdown rendering, Responsive design
- **Backend**: Your choice (placeholder functions provided)

## Implementation Guide

### 1. Authentication Setup
Replace the placeholder functions in `src/js/auth.js`:
- `handleGoogleSignIn()` - Implement your OAuth flow
- `handleSignOut()` - Implement sign-out logic
- `initAuth()` - Initialize your auth provider

### 2. Database Setup  
Replace the placeholder methods in `src/js/database.js`:
- `createConversation()` - Create new chat conversations
- `saveMessage()` - Store chat messages
- `getConversations()` - Retrieve user's conversations
- `getMessages()` - Load conversation history
- `updateConversationTitle()` - Update conversation names
- `deleteConversation()` - Remove conversations

### 3. Configuration
Update `src/config.js` with your actual:
- Authentication provider URLs and keys
- Any additional API configurations

The app will work in demo mode until these functions are implemented.

## Quick Start Checklist

- [ ] Copy `src/config.example.js` to `src/config.js`
- [ ] Add your API keys to `src/config.js`
- [ ] Implement authentication functions in `src/js/auth.js`
- [ ] Implement database functions in `src/js/database.js`
- [ ] Replace placeholder Supabase client in `src/js/supabase.js`
- [ ] Test all functionality with your backend

## Demo Features (Available Now)

The following features work without backend implementation:
- ✅ UI/UX - Fully functional interface
- ✅ Model selection and switching
- ✅ Message input and display
- ✅ Syntax highlighting for code
- ✅ Markdown rendering
- ✅ Responsive design
- ✅ Experimental UI modes
- ✅ API key management (client-side storage)

## Contributing

This is a template project. Feel free to fork and implement your own backend logic!
- **Build Tool**: Vite
- **Database**: Supabase
- **Authentication**: Supabase Auth (Google OAuth)
- **AI APIs**: OpenRouter
- **Syntax Highlighting**: Prism.js
- **Markdown Formatting**: Prettier
