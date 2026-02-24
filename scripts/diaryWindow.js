// Modal window for editing/creating diary entries

class DiaryWindow {
  constructor() {
    this.overlay = null;
    this.window = null;
    this.textarea = null;
    this.saveBtn = null;
    this.deleteBtn = null;
    this.closeBtn = null;
    this.onSaveCallback = null;
    this.onDeleteCallback = null;
    
    this.setupModal();
  }
  
  setupModal() {
    // Create overlay
    this.overlay = document.createElement("div");
    this.overlay.id = "diaryOverlay";
    this.overlay.className = "diary-overlay";
    
    // Create modal window
    this.window = document.createElement("div");
    this.window.id = "diaryWindow";
    this.window.className = "diary-window";
    
    // Create textarea
    this.textarea = document.createElement("textarea");
    this.textarea.id = "diaryTextarea";
    this.textarea.className = "diary-window__textarea";
    this.textarea.placeholder = "Write your diary entry here...";
    
    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "diary-window__buttons";
    
    // Create Save button
    this.saveBtn = document.createElement("button");
    this.saveBtn.id = "saveDiaryBtn";
    this.saveBtn.className = "diary-window__btn diary-window__btn--save";
    this.saveBtn.textContent = "Save";
    
    // Create Delete button
    this.deleteBtn = document.createElement("button");
    this.deleteBtn.id = "deleteDiaryBtn";
    this.deleteBtn.className = "diary-window__btn diary-window__btn--delete";
    this.deleteBtn.textContent = "Delete";
    
    // Create Close button
    this.closeBtn = document.createElement("button");
    this.closeBtn.id = "closeDiaryBtn";
    this.closeBtn.className = "diary-window__btn diary-window__btn--close";
    this.closeBtn.textContent = "Close";
    
    // Assemble
    buttonContainer.appendChild(this.saveBtn);
    buttonContainer.appendChild(this.deleteBtn);
    buttonContainer.appendChild(this.closeBtn);
    
    this.window.appendChild(this.textarea);
    this.window.appendChild(buttonContainer);
    this.overlay.appendChild(this.window);
    
    // Attach event listeners
    this.saveBtn.addEventListener("click", () => this.save());
    this.deleteBtn.addEventListener("click", () => this.delete());
    this.closeBtn.addEventListener("click", () => this.close());
    
    // Optional: close on overlay click (click outside)
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });
  }
  
  open(currentText, onSave, onDelete) {
    this.textarea.value = currentText;
    this.onSaveCallback = onSave;
    this.onDeleteCallback = onDelete;
    
    // Ensure overlay is in the DOM
    if (!this.overlay.parentNode) {
      document.body.appendChild(this.overlay);
    }
    
    this.textarea.focus();
  }
  
  async save() {
    if (this.onSaveCallback) {
      await this.onSaveCallback(this.textarea.value);
    }
    this.close();
  }
  
  async delete() {
    if (this.onDeleteCallback) {
      await this.onDeleteCallback();
    }
    this.close();
  }
  
  close() {
    if (this.overlay.parentNode) {
      document.body.removeChild(this.overlay);
    }
    this.onSaveCallback = null;
    this.onDeleteCallback = null;
  }
}

// Singleton instance to reuse the same modal
let diaryWindowInstance = null;

export function openDiaryWindow(currentText, onSave, onDelete) {
  if (!diaryWindowInstance) {
    diaryWindowInstance = new DiaryWindow();
  }
  diaryWindowInstance.open(currentText, onSave, onDelete);
}