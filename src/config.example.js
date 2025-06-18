// Configuration file for API keys and settings
// Copy this file to config.js and replace with your actual values

export const config = {
  // Replace with your authentication provider configuration
  // Example shown for Supabase, but you can use any auth provider
  supabase: {
    url: 'YOUR_SUPABASE_URL',           // Your Supabase project URL
    anonKey: 'YOUR_SUPABASE_ANON_KEY'   // Your Supabase anonymous key
  },
  // OpenRouter API configuration for AI model access
  openRouter: {
    apiKey: 'YOUR_OPENROUTER_API_KEY'   // Your OpenRouter API key (optional - can be set in UI)
  }
}