// TASK WINDOW CLASS (MODAL)
// =============================================
class TaskWindow {
  constructor() {
    this.modal = document.createElement("div");
    this.form = document.createElement("form");
    this.taskIdInput = document.createElement("input");
    this.typeSelect = document.createElement("select");
    this.titleInput = document.createElement("input");
    this.descInput = document.createElement("textarea");
    this.dateInput = document.createElement("input");
    this.statusSelect = document.createElement("select");
    this.deleteBtn = document.createElement("button");
    this.cancelBtn = document.createElement("button");
    this.saveBtn = document.createElement("button");
    this.overlay = document.createElement("div");
    this.countInput = document.createElement("input");
    this.frequencySelect = document.createElement("input");

    // Class setup
    this.modal.className = "task-window";
    this.form.className = "task-window__form";
    this.deleteBtn.className = "task-window__button task-window__button--delete";
    this.cancelBtn.className = "task-window__button task-window__button--cancel";
    this.saveBtn.className = "task-window__button task-window__button--save";
    this.overlay.className = "task-window-overlay";

    this.setupModal();
    this.handleKeyDown = (e) => {
      if (e.key === "Escape") this.close();
    };
  }

  setupModal() {
    this.taskIdInput.type = "hidden";
    this.typeSelect.innerHTML = `
      <option value="regular task">Regular Task</option>
      <option value="periodic task">Periodic Task</option>
      <option value="reminder">Reminder</option>
    `;
    this.titleInput.placeholder = "Title";
    this.descInput.placeholder = "Description";
    this.dateInput.type = "date";
    this.deleteBtn.textContent = "Delete";
    this.deleteBtn.type = "button";
    this.cancelBtn.textContent = "Cancel";
    this.cancelBtn.type = "button";
    this.saveBtn.textContent = "Save";
    this.saveBtn.type = "submit";

    // Configure count input (replaces end date)
    this.countInput.type = "number";
    this.countInput.min = "1";
    this.countInput.max = "99";
    this.countInput.placeholder = "1-99";
    this.countInput.value = "1";

    // Configure frequency (interval in days)
this.frequencySelect.type = "number";
this.frequencySelect.min = "1";
this.frequencySelect.max = "99";
this.frequencySelect.step = "1";
this.frequencySelect.placeholder = "1-99";
this.frequencySelect.value = "1";

    // Form structure
    this.form.appendChild(this.taskIdInput);
    this.form.appendChild(this.createFormGroup("Task Type", this.typeSelect));
    this.form.appendChild(this.createFormGroup("Title", this.titleInput));
    this.form.appendChild(this.createFormGroup("Description", this.descInput));

    const dateGroup = document.createElement("div");
    dateGroup.className = "task-window__date-group";
    dateGroup.append(
      this.createFormGroup("Due Date", this.dateInput),
      this.createFormGroup("Number of Occurrences", this.countInput),
      this.createFormGroup("Interval (days)", this.frequencySelect)
    );
    this.form.appendChild(dateGroup);
    this.form.appendChild(this.createFormGroup("Status", this.statusSelect));

    const actionDiv = document.createElement("div");
    actionDiv.className = "task-window__actions";
    actionDiv.append(this.deleteBtn, this.cancelBtn, this.saveBtn);
    this.form.appendChild(actionDiv);
    this.modal.appendChild(this.form);

    // Type change listener
    this.typeSelect.addEventListener('change', () => this.toggleFields());
  }

  // ✅ CORRECTED FIELD TOGGLING
  toggleFields() {
    const isPeriodic = this.typeSelect.value === "periodic task";
    const isReminder = this.typeSelect.value === "reminder";
    const isChildTask = this.task && this.task.type === "periodic task" && 
                        this.task.parentId && this.task.parentId !== this.task.id;

    // For periodic tasks: mother can edit all three; child can edit none
    // For non-periodic tasks: only due date enabled; count and interval disabled
    if (isPeriodic) {
      // Periodic task: enable/disable based on child status
      this.dateInput.disabled = isChildTask;
      this.countInput.disabled = isChildTask;
      this.frequencySelect.disabled = isChildTask;
	  this.titleInput.disabled = isChildTask;
      this.typeSelect.disabled = isChildTask;
    } else {
      // Non-periodic: due date always enabled, count/interval always disabled
      this.dateInput.disabled = false;
      this.countInput.disabled = true;
      this.frequencySelect.disabled = true;
	  this.titleInput.disabled = false;
      this.typeSelect.disabled = false;
    }

    // Status field: disabled for reminders, and also disabled if no due date (planning mode)
    this.statusSelect.disabled = isReminder || !this.dateInput.value;

    // Handle parentId
    if (isPeriodic && !this.task.parentId) {
      this.task.parentId = this.task.id;
    } else if (!isPeriodic) {
      this.task.parentId = null;
    }
  }

  createFormGroup(labelText, inputElement) {
    const group = document.createElement("div");
    group.className = "task-window__form-group";
    const label = document.createElement("label");
    label.className = "task-window__label";
    label.textContent = labelText;
    inputElement.className = "task-window__input";
    
    if (inputElement.tagName === "TEXTAREA") {
      inputElement.classList.add("task-window__input--textarea");
    }
    
    group.append(label, inputElement);
    return group;
  }

  async open(taskData = {}) {
    if (document.querySelector(".task-window-overlay")) return;

    document.body.append(this.overlay, this.modal);
    document.body.classList.add("body--modal-open");
    document.addEventListener("keydown", this.handleKeyDown);

    this.task = new Task(taskData);
    this.taskIdInput.value = this.task.id;
    this.typeSelect.value = this.task.type;
    this.titleInput.value = this.task.title;
    this.descInput.value = this.task.desc;
    this.dateInput.value = this.task.due || "";
    this.statusSelect.disabled = !this.task.due; 

    this.deleteBtn.style.display = taskData.id ? "block" : "none";
    this.updateStatusOptions();

    // Date change listener
    this.dateInput.addEventListener('change', () => {
      this.task.due = this.dateInput.value;
      this.updateStatusOptions();
      this.toggleFields(); // re-evaluate disabled states (planning mode may change)
    });

    await new Promise(resolve => setTimeout(resolve, 50));
    this.titleInput.focus();

    // Initialize periodic fields
    this.countInput.value = this.task.count || "1";
    this.frequencySelect.value = this.task.frequency || "1";

    // Set initial disabled states
    this.toggleFields();

    // Form submit handler
    this.form.onsubmit = async (e) => {
      e.preventDefault();
      await this.handleSave();
    };

    return new Promise((resolve) => {
      this.cancelBtn.onclick = () => {
        this.close();
        resolve(false);
      };

      this.deleteBtn.onclick = async (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to delete this task?")) {
          const result = await this.task.delete();
          if (result) {
            window.refreshTaskStats();
            this.close();
            resolve(true);
          }
        }
      };
    });
  }

  updateStatusOptions() {
    const currentDue = this.dateInput.value;
    const isOverdue = currentDue && new Date(currentDue) < new Date();
    const currentStatus = this.task.status;
    const isDone = currentStatus === "done";

    this.statusSelect.innerHTML = '';
    this.statusSelect.disabled = !currentDue;

    const options = {};
    if (!currentDue) return;

    if (isOverdue) {
      options.late = 'Late';
      options.done = 'Done';
    } else {
      options.due = 'Due';
      options.done = 'Done';
    }

    if (isDone) {
      if (isOverdue) {
        options.late = 'Late';
      } else {
        options.due = 'Due';
      }
    }

    Object.entries(options).forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      option.disabled = this.isOptionDisabled(value, isOverdue, currentStatus);
      this.statusSelect.appendChild(option);
    });

    this.statusSelect.value = currentStatus;
  }

  isOptionDisabled(optionValue, isOverdue, currentStatus) {
    if (currentStatus === "done") {
      if (isOverdue) return optionValue !== "late";
      return optionValue !== "due";
    }
    
    if (isOverdue) return optionValue === "due";
    return optionValue === "late";
  }

  async handleSave() {
    this.task.title = this.titleInput.value;
    this.task.type = this.typeSelect.value;
    this.task.desc = this.descInput.value;
    this.task.due = this.dateInput.value || null;
    this.task.status = this.statusSelect.value;
    
    if (this.task.type === "periodic task") {
      this.task.frequency = parseInt(this.frequencySelect.value) || null;
      this.task.count = parseInt(this.countInput.value) || null;
    } else {
      this.task.frequency = null;
      this.task.count = null;
    }
    
    if (this.task.type === "periodic task") {
      this.task.parentId = this.task.parentId || this.task.id;
    } else {
      this.task.parentId = null;
    }
    
    if (this.task.validate()) {
      const success = await this.task.save();
      if (success) {
        window.refreshTaskStats();
        this.close();
        return true;
      }
    }
    return false;
  }

  close() {
    document.body.removeChild(this.overlay);
    document.body.removeChild(this.modal);
    document.body.classList.remove("body--modal-open");
    document.removeEventListener("keydown", this.handleKeyDown);
  }
}

// GLOBAL ACCESS TO TASK WINDOW
window.openTaskWindow = async (taskData) => {
  const taskWindow = new TaskWindow();
  return await taskWindow.open(taskData);
};