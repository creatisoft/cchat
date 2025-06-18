/**
 * Syntax highlighting for chat messages
 * Detects code blocks and applies syntax highlighting
 * Includes markdown formatting for better readability
 */

// Using Prism.js for syntax highlighting
// We'll load it from CDN to avoid adding dependencies
let prismLoaded = false;
let prettierLoaded = false;

/**
 * Initialize Prettier for markdown formatting
 */
async function initPrettier() {
  if (!prettierLoaded && !document.getElementById('prettier-script')) {
    try {
      // Create a script element to load Prettier
      const prettierScript = document.createElement('script');
      prettierScript.id = 'prettier-script';
      prettierScript.type = 'module';
      prettierScript.innerHTML = `
        try {
          const prettier = await import('https://unpkg.com/prettier@3.5.3/standalone.mjs');
          const prettierPluginMarkdown = await import('https://unpkg.com/prettier@3.5.3/plugins/markdown.mjs');
          window.prettier = prettier.default || prettier;
          window.prettierPluginMarkdown = prettierPluginMarkdown.default || prettierPluginMarkdown;
          window.prettierLoaded = true;
        } catch (error) {
          console.warn('Failed to load Prettier:', error);
          window.prettierLoaded = false;
        }
      `;
      document.head.appendChild(prettierScript);
      
      // Wait for Prettier to load with timeout
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds timeout
        const checkLoaded = () => {
          if (window.prettierLoaded === true) {
            prettierLoaded = true;
            resolve(true);
          } else if (window.prettierLoaded === false || attempts >= maxAttempts) {
            resolve(false);
          } else {
            attempts++;
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    } catch (error) {
      console.warn('Failed to initialize Prettier:', error);
      return false;
    }
  }
  return prettierLoaded;
}

/**
 * Format markdown content using Prettier
 * @param {string} markdown - The markdown content to format
 * @return {string} - Formatted markdown content
 */
async function formatMarkdown(markdown) {
  if (!prettierLoaded || !window.prettier || !window.prettierPluginMarkdown) {
    return markdown; // Return original if Prettier not available
  }
  
  try {
    const formatted = await window.prettier.format(markdown, {
      parser: 'markdown',
      plugins: [window.prettierPluginMarkdown],
      printWidth: 80,
      proseWrap: 'always',
      tabWidth: 2,
      useTabs: false
    });
    return formatted;
  } catch (error) {
    console.warn('Failed to format markdown:', error);
    return markdown; // Return original on error
  }
}

/**
 * Initialize syntax highlighting
 */
export function initSyntaxHighlighting() {
  // Initialize Prettier for markdown formatting
  initPrettier().then(success => {
    // Prettier status handled silently for better performance
  });
  
  // Lazy load Prism.js only when needed
  if (!document.getElementById('prism-css')) {
    loadPrismResources();
  }
}

function loadPrismResources() {
  // Load Prism CSS
  const prismCSS = document.createElement('link');
  prismCSS.id = 'prism-css';
  prismCSS.rel = 'stylesheet';
  prismCSS.href = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css';
  document.head.appendChild(prismCSS);
  
  // Load Prism JS
  const prismJS = document.createElement('script');
  prismJS.id = 'prism-js';
  prismJS.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js';
  document.head.appendChild(prismJS);
  
  // Load common languages
  const prismLangs = document.createElement('script');
  prismLangs.id = 'prism-langs';
  prismLangs.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js';
  document.head.appendChild(prismLangs);
  
  // Add more languages
  const commonLangs = ['python', 'css', 'bash', 'jsx', 'typescript', 'json', 'markup', 'markdown'];
  commonLangs.forEach(lang => {
    const script = document.createElement('script');
    script.src = `https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-${lang}.min.js`;
    document.head.appendChild(script);
  });
  
  prismJS.onload = () => {
    prismLoaded = true;
    // Highlight any existing code blocks
    highlightAll();
  };
}

/**
 * Format message text and apply syntax highlighting to code blocks
 * Also formats markdown content for better readability
 * @param {string} text - The message text to format
 * @return {HTMLElement} - Formatted message content
 */
export function formatMessage(text) {
  const container = document.createElement('div');
  
  // Check if the text contains code blocks
  if (text.includes('```')) {
    const segments = parseCodeBlocks(text);
    
    segments.forEach(segment => {
      if (segment.type === 'code') {
        const codeBlock = createCodeBlock(segment.content, segment.language);
        container.appendChild(codeBlock);
      } else {
        const textBlock = document.createElement('div');
        textBlock.className = 'text-block';
        // Format markdown content for text segments
        formatAndSetTextContent(textBlock, segment.content);
        container.appendChild(textBlock);
      }
    });
  } else {
    // No code blocks, format as markdown
    formatAndSetTextContent(container, text);
  }
  
  return container;
}

/**
 * Parse text to separate code blocks from regular text
 * @param {string} text - Text to parse
 * @return {Array} - Array of segment objects with type, content, and language
 */
function parseCodeBlocks(text) {
  const segments = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block if any
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }
    
    // Add the code block
    segments.push({
      type: 'code',
      language: match[1] || 'javascript', // Default to javascript if language not specified
      content: match[2]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text if any
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }
  
  return segments;
}

/**
 * Create a code block element with syntax highlighting
 * @param {string} code - The code content
 * @param {string} language - The programming language
 * @return {HTMLElement} - The formatted code block
 */
function createCodeBlock(code, language) {
  const container = document.createElement('div');
  container.className = 'code-block-container';
  
  const header = document.createElement('div');
  header.className = 'code-block-header';
  
  const langLabel = document.createElement('span');
  langLabel.className = 'code-language';
  langLabel.textContent = language || 'code';
  header.appendChild(langLabel);
  
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-code-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.onclick = function() {
    navigator.clipboard.writeText(code).then(() => {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    });
  };
  header.appendChild(copyBtn);
  
  container.appendChild(header);
  
  const pre = document.createElement('pre');
  pre.className = `language-${language || 'javascript'}`;
  
  const codeElement = document.createElement('code');
  codeElement.className = `language-${language || 'javascript'}`;
  codeElement.textContent = code;
  
  pre.appendChild(codeElement);
  container.appendChild(pre);
  
  // Apply syntax highlighting if Prism is loaded
  if (prismLoaded && window.Prism) {
    window.Prism.highlightElement(codeElement);
  }
  
  return container;
}

/**
 * Format text content as markdown and set it in the element
 * @param {HTMLElement} element - The element to set content in
 * @param {string} text - The text content to format
 */
function formatAndSetTextContent(element, text) {
  try {
    // Apply basic markdown formatting first
    element.innerHTML = formatBasicMarkdown(text);
    
    // Asynchronously format with Prettier if available
    if (prettierLoaded) {
      formatMarkdown(text).then(formattedText => {
        element.innerHTML = formatBasicMarkdown(formattedText);
      }).catch(() => {
        // Keep the basic formatted version if Prettier fails
      });
    }
  } catch (error) {
    // Fallback to plain text if formatting fails
    element.textContent = text;
  }
}

/**
 * Apply basic markdown formatting to text
 * @param {string} text - The text to format
 * @return {string} - HTML formatted text
 */
function formatBasicMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Headers (must come first)
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic text (avoid conflicting with bold)
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered lists
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

/**
 * Apply syntax highlighting to all code blocks in the document
 */
export function highlightAll() {
  if (prismLoaded && window.Prism) {
    window.Prism.highlightAll();
  }
}

/**
 * Apply syntax highlighting to a specific element
 * @param {HTMLElement} element - The element containing code to highlight
 */
export function highlight(element) {
  if (prismLoaded && window.Prism) {
    const codeBlocks = element.querySelectorAll('code[class*="language-"]');
    codeBlocks.forEach(block => {
      window.Prism.highlightElement(block);
    });
  }
}
