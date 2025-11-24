// =============================================
// TASK OBJECT CLASS
// =============================================
class Task {
  constructor({ id, title, desc, due, type, status, parentId, endDate, frequency }) {
    this.id = id ? parseInt(id) : Date.now();
    
    this.title = title || "";
    this.desc = desc || "";
    this.due = due || null;
    this.type = type || "regular task";
    // Special handling for reminders
    if (this.type === "reminder") {
      this.status = null; // or any default value you prefer
    } else {
      this.status = this.calculateInitialStatus(status, due);
    }
    this.parentId = parentId || null;
    this.endDate = endDate || null;
    this.frequency = frequency || null;
  }

  // Determine initial status based on due date and existing status
  calculateInitialStatus(status, due) {
    if (!due) return null; // Planning tasks
    if (status && ["done"].includes(status)) return status;
    return this.isOverdue(due) ? "late" : (status || "due");
  }

  // Check if due date has passed
  isOverdue(dueDate) {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    return due < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  validate() {
    if (!this.title.trim()) {
      alert("Title is required!");
      return false;
    }
    return true;
  }

  async save() {
    if (this.due && !["done"].includes(this.status)) {
      const oldStatus = this.status;
      this.status = this.isOverdue(this.due) ? "late" : this.status;
    }

    if (!this.validate()) {
      return false;
    }

    try {
      const tasks = await window.fetchTasks();
      
      const originalTask = tasks.find(t => Number(t.id) === Number(this.id));
      const isExisting = !!originalTask;
      
      // Create a true copy to avoid reference issues
      const originalTaskSnapshot = isExisting ? {...originalTask} : null;
      
      // =================================================================
      // 1. Validate periodic task parameters
      // =================================================================
      if (this.type === "periodic task" && (!this.endDate || !this.frequency)) {
        alert("Periodic tasks require both an end date and frequency!");
        return false;
      }

      // =================================================================
      // 2. Handle periodic task logic
      // =================================================================
      if (this.type === "periodic task" || (isExisting && originalTaskSnapshot.type === "periodic task")) {
        const result = await window.PeriodicTaskHandler.handlePeriodicTaskSave(
          this, 
          tasks, 
          originalTaskSnapshot, 
          isExisting
        );
        
        if (!result.shouldContinue) {
          return result.success;
        }
        
        // If shouldContinue is true, proceed with regular save logic below
        // (this handles cases where periodic logic doesn't need special handling)
      } else {
        // =================================================================
        // 3. Handle non-periodic task type conversions using TaskConverter
        // =================================================================
        const needsTypeConversion = 
          (isExisting && originalTaskSnapshot.type !== this.type);
        
        if (needsTypeConversion) {
          // Use TaskConverter for type conversions
          const result = await window.TaskConverter.convertTask(this, tasks);
          
          if (result.success) {
            const success = await window.saveTasks(result.tasks);
            
            if (success) {
              await window.refreshAllUI();
            }
            return success;
          }
          return false;
        }

        // =================================================================
        // 4. Update task in array for non-periodic tasks
        // =================================================================
        const index = tasks.findIndex(t => Number(t.id) === Number(this.id));
        
        if (index === -1) {
          tasks.push(this);
        } else {
          tasks[index] = this;
        }
      }

      // =================================================================
      // 5. Regular save
      // =================================================================
      const success = await window.saveTasks(tasks);
      
      if (success) {
        await window.refreshAllUI();
      }
      return success;

    } catch (error) {
      console.error("[ERROR] Save failed:", error);
      return false;
    }
  }

  async delete() {
    try {
      const tasks = await window.fetchTasks();
      
      // Handle periodic task deletion
      if (this.type === "periodic task") {
        const result = await window.PeriodicTaskHandler.handlePeriodicTaskDelete(this, tasks);
        return result.success;
      }
      
      // Handle regular task deletion
      const filteredTasks = tasks.filter(t => t.id !== this.id);
      const success = await window.saveTasks(filteredTasks);
         
      if (success) {
        await window.refreshAllUI();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Delete failed:", error);
      return false;
    }
  }
}