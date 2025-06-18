class OpenRouterAPI {
  constructor() {
    // Use stored API key or empty string as fallback
    this.apiKey = this.getStoredApiKey() || ''
    this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions'
  }

  getStoredApiKey() {
    try {
      return localStorage.getItem('openrouter_api_key')
    } catch (error) {
      console.error('Error accessing localStorage:', error)
      return null
    }
  }

  updateApiKey(newApiKey) {
    this.apiKey = newApiKey || this.getStoredApiKey() || ''
  }

  supportsOnlineSuffix(model) {
    // Models that support the :online suffix
    const onlineCompatibleModels = [
      'openai/gpt-4o',
      'openai/gpt-4.1-nano',
      'google/gemini-2.0-flash-001',
      'google/gemini-2.0-flash-lite-001',
      'qwen/qwen-2.5-7b-instruct'
    ]
    
    return onlineCompatibleModels.some(compatibleModel => model.includes(compatibleModel))
  }

  async sendMessage(messages, model = 'deepseek/deepseek-r1-0528-qwen3-8b:free', options = {}) {
    if (!this.apiKey || this.apiKey === 'YOUR_API_KEY_HERE') {
      throw new Error('OpenRouter API key is missing or invalid. Please configure a valid API key.')
    }

    try {
      const requestBody = {
        model: options.webSearch ? `${model}:online` : model,
        messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      }

      // Add web search plugin if webSearch is enabled but model doesn't support :online suffix
      if (options.webSearch && !this.supportsOnlineSuffix(model)) {
        requestBody.plugins = [{ 
          id: 'web',
          max_results: 5
        }]
        // Remove the :online suffix since we're using the plugin instead
        requestBody.model = model
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Chat App'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from API')
      }

      return data.choices[0].message.content
    } catch (error) {
      console.error('OpenRouter API error:', error)
      throw error
    }
  }

  async sendStreamingMessage(messages, model = 'deepseek/deepseek-r1-0528-qwen3-8b:free', onChunk = null, options = {}) {
    if (!this.apiKey || this.apiKey === 'YOUR_API_KEY_HERE') {
      throw new Error('OpenRouter API key is missing or invalid. Please configure a valid API key.')
    }

    try {
      const requestBody = {
        model: options.webSearch ? `${model}:online` : model,
        messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
        max_tokens: 1000,
        temperature: 0.7,
        stream: true
      }

      // Add web search plugin if webSearch is enabled but model doesn't support :online suffix
      if (options.webSearch && !this.supportsOnlineSuffix(model)) {
        requestBody.plugins = [{ 
          id: 'web',
          max_results: 5
        }]
        // Remove the :online suffix since we're using the plugin instead
        requestBody.model = model
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Chat App'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim()
            
            if (jsonStr === '[DONE]') {
              break
            }

            try {
              const data = JSON.parse(jsonStr)
              
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                const content = data.choices[0].delta.content
                fullContent += content
                
                if (onChunk) {
                  onChunk(content)
                }
              }
            } catch (e) {
              // Skip invalid JSON chunks
              continue
            }
          }
        }
      }

      return fullContent
    } catch (error) {
      console.error('OpenRouter API streaming error:', error)
      throw error
    }
  }
}

export const openRouterAPI = new OpenRouterAPI()