// speechRecognition.js - Handles voice-to-text functionality for diary entries

// Speech recognition variables
let recognition = null;
let isListening = false;
let currentTextarea = null;
let recognitionSupported = false;

// Check for browser support and initialize speech recognition
function initSpeechRecognition() {
  // Check if the browser supports speech recognition
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (window.SpeechRecognition) {
    recognitionSupported = true;
    recognition = new window.SpeechRecognition();
    
    // Configure speech recognition
    recognition.continuous = true;        // Keep listening until stopped
    recognition.interimResults = true;    // Get results as you speak
    recognition.lang = 'en-US';           // Default language
    
    // Handle speech recognition results
    recognition.onresult = function(event) {
      if (!currentTextarea) return;
      
      let interimTranscript = '';
      let finalTranscript = '';
      
      // Process the recognition results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Update textarea with transcribed text
      if (finalTranscript) {
        // Get current cursor position
        const startPos = currentTextarea.selectionStart;
        const endPos = currentTextarea.selectionEnd;
        
        // Insert text at cursor position
        const currentValue = currentTextarea.value;
        const beforeCursor = currentValue.substring(0, startPos);
        const afterCursor = currentValue.substring(endPos);
        
        // Update textarea value
        currentTextarea.value = beforeCursor + finalTranscript + afterCursor;
        
        // Adjust cursor position to end of inserted text
        const newCursorPos = startPos + finalTranscript.length;
        currentTextarea.setSelectionRange(newCursorPos, newCursorPos);
        
        // Trigger input event to activate autosave
        const inputEvent = new Event('input', { bubbles: true });
        currentTextarea.dispatchEvent(inputEvent);
      }
      
      // Display interim results
      if (interimTranscript) {
        // Handle interim display if needed
        // This is optional and could be displayed in a separate element
      }
    };
    
    // Handle speech recognition errors
    recognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      stopListening();
    };
    
    // Handle when speech recognition stops
    recognition.onend = function() {
      if (isListening) {
        // If we're still supposed to be listening but it stopped, restart it
        recognition.start();
      } else {
        updateMicButtonState(false);
      }
    };
    
    console.log('Speech recognition initialized');
  } else {
    console.warn('Speech recognition not supported in this browser');
  }
}

// Start listening for speech
function startListening(textarea, micButton) {
  if (!recognitionSupported) {
    alert('Speech recognition is not supported in your browser. Try using Chrome, Edge, or Safari.');
    return;
  }
  
  if (isListening) {
    stopListening();
    return;
  }
  
  try {
    currentTextarea = textarea;
    recognition.start();
    isListening = true;
    updateMicButtonState(true, micButton);
    
    console.log('Speech recognition started');
  } catch (error) {
    console.error('Error starting speech recognition:', error);
    isListening = false;
    updateMicButtonState(false, micButton);
  }
}

// Stop listening for speech
function stopListening(micButton = null) {
  if (!isListening) return;
  
  try {
    recognition.stop();
    isListening = false;
    updateMicButtonState(false, micButton || getActiveMicButton());
    
    console.log('Speech recognition stopped');
  } catch (error) {
    console.error('Error stopping speech recognition:', error);
  }
}

// Update microphone button appearance based on listening state
function updateMicButtonState(listening, button) {
  if (!button) return;
  
  if (listening) {
    button.classList.add('mic-active');
    button.setAttribute('aria-label', 'Stop recording');
    button.setAttribute('title', 'Stop recording');
  } else {
    button.classList.remove('mic-active');
    button.setAttribute('aria-label', 'Start recording');
    button.setAttribute('title', 'Start recording');
  }
}

// Find the active microphone button
function getActiveMicButton() {
  return document.querySelector('.mic-button.mic-active');
}

// Add microphone buttons to diary entries
function addVoiceInputToEntries() {
  const textareas = document.querySelectorAll('.diary-entry__textarea');
  
  textareas.forEach(textarea => {
    // Check if this textarea already has a mic button
    if (textarea.parentElement.querySelector('.mic-button')) return;
    
    // Create a container to hold the textarea and mic button
    const container = document.createElement('div');
    container.className = 'diary-entry__input-container';
    
    // Move the textarea into the container
    const parent = textarea.parentElement;
    parent.appendChild(container);
    container.appendChild(textarea);
    
    // Create the microphone button
    const micButton = document.createElement('button');
    micButton.className = 'mic-button';
    micButton.type = 'button';
    micButton.setAttribute('aria-label', 'Start recording');
    micButton.setAttribute('title', 'Start recording');
    
    // Add microphone icon using Unicode or a simple element
    micButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
    
    // Add click event to toggle listening
    micButton.addEventListener('click', function() {
      if (isListening && currentTextarea === textarea) {
        stopListening(micButton);
      } else {
        // Stop any ongoing recording first
        if (isListening) {
          stopListening(getActiveMicButton());
        }
        startListening(textarea, micButton);
      }
    });
    
    // Add the button to the container
    container.appendChild(micButton);
  });
}

// Extend the renderDiaryDays function to include voice input after rendering
function extendRenderDiaryDays() {
  const originalRenderDiaryDays = window.renderDiaryDays;
  
  if (originalRenderDiaryDays) {
    window.renderDiaryDays = function() {
      // Call the original function first
      originalRenderDiaryDays.apply(this, arguments);
      
      // Then add our voice input functionality
      addVoiceInputToEntries();
    };
  }
}

// Initialize speech recognition when the page loads
document.addEventListener('DOMContentLoaded', function() {
  initSpeechRecognition();
  
  // Extend the rendering function after a slight delay to ensure the original has run
  setTimeout(extendRenderDiaryDays, 0);
  
  // Add keyboard shortcuts (optional)
  document.addEventListener('keydown', function(e) {
    // Ctrl+Shift+M to toggle microphone for active element
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      const activeElement = document.activeElement;
      
      if (activeElement && activeElement.classList.contains('diary-entry__textarea')) {
        const micButton = activeElement.parentElement.querySelector('.mic-button');
        
        if (micButton) {
          micButton.click();
        }
      }
    }
  });
});