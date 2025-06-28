// DOM Elements
const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chatsContainer");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");
const welcomeScreen = document.querySelector(".welcome-screen");
const quickPrompts = document.querySelectorAll(".quick-prompt");

// API Configuration
const API_KEY = "AIzaSyBFIkaZ-PwJl8L6HvYytS-Rut1lN_RguHM";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// State variables
// let typingInterval, controller;
const userData = { message: "", file: {} };
const chatHistory = [];

// Initialize highlight.js for code syntax highlighting
hljs.highlightAll();

// Create message element
const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  
  // Process content for code blocks, tables, etc.
  let processedContent = content
    .replace(/```(\w+)?\n([\s\S]+?)\n```/g, (match, lang, code) => {
      const language = lang || 'plaintext';
      const highlightedCode = hljs.highlightAuto(code, [language]).value;
      return `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
    })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^# (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h4>$1</h4>')
    .replace(/^### (.*$)/gm, '<h5>$1</h5>')
    .replace(/- (.*$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    .replace(/<li>.*<\/li>/gms, (match) => `<ul>${match}</ul>`)
    .replace(/\n/g, '<br>');
  
  div.innerHTML = processedContent;
  return div;
};

// Scroll to bottom of chat
const scrollToBottom = () => {
  container.scrollTo({
    top: container.scrollHeight,
    behavior: "smooth"
  });
};

// Typing effect for bot messages
// const typingEffect = (text, element) => {
//   element.innerHTML = "";
//   let i = 0;
//   const speed = 20;
  
//   const type = () => {
//     if (i < text.length) {
//       // Process text as we type to handle markdown

//       const currentText = text.substring(0, i + 1);
//       const scrollPosition = container.scrollTop + container.clientHeight;
//       const scrollThreshold = container.scrollHeight - 100;
//       if (scrollPosition >= scrollThreshold) {
//         scrollToBottom();
//       }
//       element.innerHTML = currentText
//         .replace(/```(\w+)?\n([\s\S]+?)\n```/g, (match, lang, code) => {
//           const language = lang || 'plaintext';
//           const highlightedCode = hljs.highlightAuto(code, [language]).value;
//           return `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
//         })
//         .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
//         .replace(/\*(.*?)\*/g, '<em>$1</em>')
//         .replace(/`(.*?)`/g, '<code>$1</code>');
      
//       i++;
//       setTimeout(type, speed);
//       scrollToBottom();
//     } else {
//       // Final processing after typing completes
//       element.innerHTML = text
//         .replace(/```(\w+)?\n([\s\S]+?)\n```/g, (match, lang, code) => {
//           const language = lang || 'plaintext';
//           const highlightedCode = hljs.highlightAuto(code, [language]).value;
//           return `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
//         })
//         .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
//         .replace(/\*(.*?)\*/g, '<em>$1</em>')
//         .replace(/`(.*?)`/g, '<code>$1</code>')
//         .replace(/^# (.*$)/gm, '<h3>$1</h3>')
//         .replace(/^## (.*$)/gm, '<h4>$1</h4>')
//         .replace(/^### (.*$)/gm, '<h5>$1</h5>')
//         .replace(/- (.*$)/gm, '<li>$1</li>')
//         .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
//         .replace(/<li>.*<\/li>/gms, (match) => `<ul>${match}</ul>`)
//         .replace(/\n/g, '<br>');
      
//       // Re-highlight code blocks after they're fully typed
//       document.querySelectorAll('pre code').forEach((block) => {
//         hljs.highlightElement(block);
//       });
      
//       document.body.classList.remove("bot-responding");
//     }
//   };
  
//   clearInterval(typingInterval);
//   typingInterval = setTimeout(type, speed);
// };

// State variables
// Update the state variables at the top
let typingInterval, controller;
let isTyping = false;
let currentTypingText = '';
let shouldStopTyping = false;

// Modified typingEffect function
const typingEffect = (text, element) => {
  element.innerHTML = "";
  let i = 0;
  const speed = 20;
  isTyping = true;
  shouldStopTyping = false;
  currentTypingText = text;
  
  const type = () => {
    if (i < text.length && !shouldStopTyping) {
      const currentText = text.substring(0, i + 1);
      
      // Update scroll position if needed
      const scrollPosition = container.scrollTop + container.clientHeight;
      const scrollThreshold = container.scrollHeight - 100;
      if (scrollPosition >= scrollThreshold) {
        scrollToBottom();
      }
      
      element.innerHTML = currentText
        .replace(/```(\w+)?\n([\s\S]+?)\n```/g, (match, lang, code) => {
          const language = lang || 'plaintext';
          const highlightedCode = hljs.highlightAuto(code, [language]).value;
          return `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
        })
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
      
      i++;
      typingInterval = setTimeout(type, speed);
    } else {
      // Final processing when typing completes or is stopped
      if (!shouldStopTyping) {
        // Only do full formatting if not stopped
        element.innerHTML = text
          .replace(/```(\w+)?\n([\s\S]+?)\n```/g, (match, lang, code) => {
            const language = lang || 'plaintext';
            const highlightedCode = hljs.highlightAuto(code, [language]).value;
            return `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
          })
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>')
          .replace(/^# (.*$)/gm, '<h3>$1</h3>')
          .replace(/^## (.*$)/gm, '<h4>$1</h4>')
          .replace(/^### (.*$)/gm, '<h5>$1</h5>')
          .replace(/- (.*$)/gm, '<li>$1</li>')
          .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
          .replace(/<li>.*<\/li>/gms, (match) => `<ul>${match}</ul>`)
          .replace(/\n/g, '<br>');
        
        // Re-highlight code blocks
        document.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      }
      
      isTyping = false;
      document.body.classList.remove("bot-responding");
    }
  };
  
  clearInterval(typingInterval);
  typingInterval = setTimeout(type, speed);
};

// Updated stop response function
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  // Abort any ongoing API request
  if (controller) {
    controller.abort();
    controller = null;
  }
  
  // Stop the typing effect
  if (isTyping) {
    shouldStopTyping = true;
    clearInterval(typingInterval);
    isTyping = false;
    
    // Manually apply basic formatting to the partial response
    const lastBotMessage = document.querySelector(".bot-message:last-child .message-content");
    if (lastBotMessage) {
      lastBotMessage.innerHTML = currentTypingText.substring(0, lastBotMessage.textContent.length)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    }
  }
  
  document.body.classList.remove("bot-responding");
});


// Generate response from Gemini API
const generateResponse = async (botMsgDiv) => {
  const contentElement = botMsgDiv.querySelector(".message-content");
  controller = new AbortController();
  
  // Add user message to chat history
  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data
        ? [{
            inline_data: {
              mime_type: userData.file.mime_type,
              data: userData.file.data
            }
          }]
        : [])
    ]
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Unknown error occurred");
    
    const responseText = data.candidates[0].content.parts[0].text;
    typingEffect(responseText, contentElement);

    // Add bot response to chat history
    chatHistory.push({
      role: "model",
      parts: [{ text: responseText }]
    });
  } catch (error) {
    contentElement.style.color = "var(--accent-color)";
    contentElement.innerHTML = error.name === "AbortError" 
      ? "Response generation stopped." 
      : `Error: ${error.message}`;
    document.body.classList.remove("bot-responding");
  } finally {
    userData.file = {};
  }
};

// Handle form submission
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  promptInput.value = "";
  userData.message = userMessage;
  document.body.classList.add("bot-responding");
  welcomeScreen.style.display = "none";
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

  // Create user message element
  const userMsgDiv = createMsgElement(userMessage, "user-message");
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  // Create bot message element
  setTimeout(() => {
    const botMsgDiv = document.createElement("div");
    botMsgDiv.classList.add("message", "bot-message");
    
    const avatar = document.createElement("img");
    avatar.src = "Images/chatbot.jpg";
    avatar.classList.add("avatar");
    avatar.alt = "Edusource Avatar";
    
    const contentDiv = document.createElement("div");
    contentDiv.classList.add("message-content");
    contentDiv.textContent = "Thinking...";
    
    botMsgDiv.appendChild(avatar);
    botMsgDiv.appendChild(contentDiv);
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    
    generateResponse(botMsgDiv);
  }, 600);
};

// File input handling
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  
  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    userData.file = {
      fileName: file.name,
      data: base64String,
      mime_type: file.type,
      isImage
    };
  };
});

// Cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});

// Stop response generation
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  userData.file = {};
  controller?.abort();
  clearInterval(typingInterval);
  document.body.classList.remove("bot-responding");
});

// Clear chat
document.querySelector("#delete-chat-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("bot-responding");
  welcomeScreen.style.display = "flex";
});

// Quick prompts
quickPrompts.forEach(prompt => {
  prompt.addEventListener("click", () => {
    const text = prompt.querySelector("p").textContent;
    promptInput.value = text;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

// Theme toggle
themeToggle.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light" : "dark");
  themeToggle.querySelector(".theme-icon").textContent = isLightTheme ? "dark_mode" : "light_mode";
});



document.addEventListener('click', (e) => {
  if (e.target.classList.contains('copy-code')) {
    const code = e.target.previousElementSibling?.textContent;
    if (code) {
      navigator.clipboard.writeText(code);
      e.target.textContent = 'Copied!';
      setTimeout(() => e.target.textContent = 'Copy', 2000);
    }
  }
});

// Initialize theme
const isLightTheme = localStorage.getItem("themeColor") === "light";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggle.querySelector(".theme-icon").textContent = isLightTheme ? "dark_mode" : "light_mode";

// Event listeners
promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

// Hide welcome screen when chats exist
if (chatHistory.length > 0) {
  welcomeScreen.style.display = "none";
}