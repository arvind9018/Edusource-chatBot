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
const micBtn = document.querySelector("#mic-btn");
const sendBtn = document.querySelector("#send-btn");
const stopBtn = document.querySelector("#stop-btn");
const clearBtn = document.querySelector("#clear-btn");
const fileBtn = document.querySelector("#add-file-btn");
const listeningState = document.querySelector(".listening-state");

// API Configuration
const API_KEY = "AIzaSyBFIkaZ-PwJl8L6HvYytS-Rut1lN_RguHM";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// State variables
let typingInterval, controller;
let isTyping = false;
let shouldStopTyping = false;
let currentTypingText = '';
let isRecording = false;
const userData = { message: "", file: {} };
const chatHistory = [];

// Speech recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isRecording = true;
    listeningState.style.display = "flex";
    updateButtonStates();
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    promptInput.value = transcript;
    updateButtonStates();
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    isRecording = false;
    listeningState.style.display = "none";
    updateButtonStates();
  };

  recognition.onend = () => {
    isRecording = false;
    listeningState.style.display = "none";
    updateButtonStates();
  };
} else {
  micBtn.style.display = "none";
  console.warn("Speech recognition not supported in this browser");
}

// Initialize highlight.js for code syntax highlighting
hljs.highlightAll();

// Create message element
const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  
  // Create avatar
  const avatar = document.createElement("img");
  avatar.src = classes.includes("user-message") ? "Images/logo.jpg" : "Images/logo2.jpg";
  avatar.classList.add("avatar");
  avatar.alt = classes.includes("user-message") ? "User Avatar" : "Edusource Avatar";
  
  // Create content container
  const contentDiv = document.createElement("div");
  contentDiv.classList.add("message-content");
  
  // Preserve original formatting by using white-space: pre-wrap
  contentDiv.style.whiteSpace = 'pre-wrap';
  
  // For user messages, just display the text as-is
  if (classes.includes("user-message")) {
    contentDiv.textContent = content;
  } 
  // For bot messages, process markdown and code blocks
  else {
    // Process content while preserving newlines and spacing
    let processedContent = content
      .replace(/```(\w+)?\n([\s\S]+?)\n```/g, (match, lang, code) => {
        const language = lang || 'plaintext';
        const highlightedCode = hljs.highlightAuto(code, [language]).value;
        return `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
      })
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
    
    contentDiv.innerHTML = processedContent;
  }
  
  // Add elements to message div
  div.appendChild(avatar);
  div.appendChild(contentDiv);
  
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
const typingEffect = (text, element) => {
  element.innerHTML = "";
  element.style.whiteSpace = 'pre-wrap';
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
      
      // For typing effect, we'll use textContent to preserve formatting
      element.textContent = currentText;
      
      i++;
      typingInterval = setTimeout(type, speed);
    } else {
      // Final processing when typing completes or is stopped
      if (!shouldStopTyping) {
        // Process markdown after typing completes
        let processedContent = text
          .replace(/```(\w+)?\n([\s\S]+?)\n```/g, (match, lang, code) => {
            const language = lang || 'plaintext';
            const highlightedCode = hljs.highlightAuto(code, [language]).value;
            return `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
          })
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>');
        
        element.innerHTML = processedContent;
        
        // Re-highlight code blocks
        document.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      }
      
      isTyping = false;
      document.body.classList.remove("bot-responding");
      updateButtonStates();
    }
  };
  
  clearInterval(typingInterval);
  typingInterval = setTimeout(type, speed);
};
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
    updateButtonStates();
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
  updateButtonStates();

  // Create user message element
  const userMsgDiv = createMsgElement(userMessage, "user-message");
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  // Create bot message element
  setTimeout(() => {
    const botMsgDiv = document.createElement("div");
    botMsgDiv.classList.add("message", "bot-message");
    
    const avatar = document.createElement("img");
    avatar.src = "Images/logo2.jpg";
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
  }, 200);
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
stopBtn.addEventListener("click", () => {
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
  updateButtonStates();
});

// Clear chat
clearBtn.addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("bot-responding");
  welcomeScreen.style.display = "flex";
  updateButtonStates();
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

// Update button states based on current app state
const updateButtonStates = () => {
  const hasText = promptInput.value.trim().length > 0;
  const isResponding = document.body.classList.contains("bot-responding");
  
  // Mic button - show when input is empty and not recording
  micBtn.style.display = hasText || isRecording || isResponding ? "none" : "flex";
  
  // Send button - show when text is entered and not responding
  sendBtn.style.display = hasText && !isResponding ? "flex" : "none";
  
  // Stop button - show during recording or bot response
  stopBtn.style.display = isRecording || isResponding ? "flex" : "none";
  
  // File button - show except during recording
  fileBtn.style.display = isRecording ? "none" : "flex";
  
  // Clear button is always visible
  clearBtn.style.display = "flex";
};

// Initialize theme
const isLightTheme = localStorage.getItem("themeColor") === "light";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggle.querySelector(".theme-icon").textContent = isLightTheme ? "dark_mode" : "light_mode";

// Event listeners
promptForm.addEventListener("submit", handleFormSubmit);
fileBtn.addEventListener("click", () => fileInput.click());
micBtn.addEventListener("click", () => {
  if (recognition) {
    recognition.start();
  } else {
    alert("Speech recognition not supported in your browser");
  }
});

// Input event for dynamic button states
promptInput.addEventListener("input", updateButtonStates);

// Hide welcome screen when chats exist
if (chatHistory.length > 0) {
  welcomeScreen.style.display = "none";
}

// Initialize button states
updateButtonStates();

// Copy code blocks
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
