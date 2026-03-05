// =============================================
// TASK CONVERTER CLASS (UPDATED)
// =============================================
class TaskConverter {
  /**
   * Convert a task from one type to another
   * @param {Task} task - The task to convert
   * @param {Array} allTasks - All tasks in the system
   * @returns {Object} - Object containing {tasks, success}
   */
  static async convertTask(task, allTasks) {
    // Extract only non-reference properties to avoid mutation
    const taskSnapshot = {...task};
    
    // Find the original task (if it exists)
    const originalTask = allTasks.find(t => Number(t.id) === Number(task.id));
    const isExisting = !!originalTask;
    
    // Create a true copy to avoid reference issues
    const originalTaskSnapshot = isExisting ? {...originalTask} : null;
    
    // =================================================================
    // 1. Handle conversion TO periodic task
    // =================================================================
    if (this.isConversionToPeriodicTask(taskSnapshot, originalTaskSnapshot)) {
      return await this.convertToPeriodicTask(taskSnapshot, allTasks);
    }

    // =================================================================
    // 2. Handle conversion FROM periodic task
    // =================================================================
    if (this.isConversionFromPeriodicTask(taskSnapshot, originalTaskSnapshot)) {
      return await this.convertFromPeriodicTask(taskSnapshot, originalTaskSnapshot, allTasks);
    }

    // =================================================================
    // 3. Handle conversion TO reminder
    // =================================================================
    if (this.isConversionToReminder(taskSnapshot, originalTaskSnapshot)) {
      return this.convertToReminder(taskSnapshot, allTasks);
    }

    // =================================================================
    // 4. Handle conversion FROM reminder
    // =================================================================
    if (this.isConversionFromReminder(taskSnapshot, originalTaskSnapshot)) {
      return this.convertFromReminder(taskSnapshot, originalTaskSnapshot, allTasks);
    }

    // No conversion needed - just update the task
    return {
      tasks: allTasks,
      success: true
    };
  }

  /**
   * Check if this is a conversion TO a periodic task
   */
  static isConversionToPeriodicTask(task, originalTask) {
    return (
      (originalTask && originalTask.type !== "periodic task" && task.type === "periodic task") || 
      (!originalTask && task.type === "periodic task")
    );
  }

  /**
   * Check if this is a conversion FROM a periodic task
   */
  static isConversionFromPeriodicTask(task, originalTask) {
    return (
      originalTask && 
      originalTask.type === "periodic task" && 
      task.type !== "periodic task"
    );
  }

  /**
   * Convert a task to a periodic task using count and frequency (interval)
   */
  static async convertToPeriodicTask(task, allTasks) {
    // Remove original task to prevent duplication
    const filteredTasks = allTasks.filter(t => t.id !== task.id);
    
    // Create new periodic group
    task.parentId = task.id;
    
    // Ensure count is valid (default to 1 if not provided)
    const count = task.count && task.count >= 1 ? task.count : 1;
    const interval = task.frequency || 1; // fallback
    
    const batchTasks = [task];
    
    if (count > 1) {
      let currentDue = new Date(task.due);
      for (let i = 1; i < count; i++) {
        currentDue.setDate(currentDue.getDate() + interval);
        const dueISO = currentDue.toISOString().split('T')[0];
        
        batchTasks.push(new Task({
          ...task,
          id: task.id * 1000 + i,
          parentId: task.id,
          due: dueISO,
          status: "due",
          desc: ""
        }));
      }
    }

    return {
      tasks: [...filteredTasks, ...batchTasks],
      success: true
    };
  }

  /**
   * Convert a periodic task to another type (regular or reminder)
   */
  static async convertFromPeriodicTask(task, originalTask, allTasks) {
    const parentId = originalTask.parentId || originalTask.id;
    
    const groupTasks = allTasks.filter(t => t.parentId === parentId || t.id === parentId);
    const filteredTasks = allTasks.filter(t => !groupTasks.some(gt => gt.id === t.id));

    const newTask = new Task({
      ...task,
      id: null, // Generate new ID
      parentId: null,
      type: task.type,
      frequency: null,
      count: null
    });

    return {
      tasks: [...filteredTasks, newTask],
      success: true
    };
  }

  /**
   * Check if this is a conversion TO a reminder
   */
  static isConversionToReminder(task, originalTask) {
    return (
      (originalTask && originalTask.type !== "reminder" && task.type === "reminder")
    );
  }

  /**
   * Check if this is a conversion FROM a reminder
   */
  static isConversionFromReminder(task, originalTask) {
    return (
      originalTask && 
      originalTask.type === "reminder" && 
      task.type !== "reminder"
    );
  }

  /**
   * Convert a task to a reminder
   */
  static convertToReminder(task, allTasks) {
    const filteredTasks = allTasks.filter(t => t.id !== task.id);
    const reminderTask = new Task({
      ...task,
      type: "reminder",
      status: null,
      frequency: null,
      count: null
    });

    return {
      tasks: [...filteredTasks, reminderTask],
      success: true
    };
  }

  /**
   * Convert a reminder to another type (regular task)
   */
  static convertFromReminder(task, originalTask, allTasks) {
    const filteredTasks = allTasks.filter(t => t.id !== task.id);
    const newTask = new Task({
      ...task,
      type: task.type,
      status: null, // constructor will calculate
      frequency: task.type === "periodic task" ? task.frequency : null,
      count: task.type === "periodic task" ? task.count : null
    });

    return {
      tasks: [...filteredTasks, newTask],
      success: true
    };
  }
}

// Make TaskConverter available globally
window.TaskConverter = TaskConverter;