// =============================================
// TASK CONVERTER CLASS
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
   * Convert a task to a periodic task
   */
  static async convertToPeriodicTask(task, allTasks) {
    // Remove original task to prevent duplication
    const filteredTasks = allTasks.filter(t => t.id !== task.id);
    
    // Create new periodic group
    task.parentId = task.id;
    
    const batchTasks = [task];
    let currentDue = new Date(task.due);
    const endDate = new Date(task.endDate);
    
    let childIndex = 1;

    while (currentDue <= endDate) {
      currentDue.setDate(currentDue.getDate() + task.frequency);
      if (currentDue > endDate) {
        break;
      }

      const dueISO = currentDue.toISOString().split('T')[0];
      
      batchTasks.push(new Task({
        ...task,
        id: task.id * 1000 + childIndex,
        parentId: task.id,
        due: dueISO,
        status: "due"
      }));
      childIndex++;
    }

    return {
      tasks: [...filteredTasks, ...batchTasks],
      success: true
    };
  }

  /**
   * Convert a periodic task to another type
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
      endDate: null,
      frequency: null
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
    // Find the original task and filter it out
    const filteredTasks = allTasks.filter(t => t.id !== task.id);
    
    // Create new reminder task
    const reminderTask = new Task({
      ...task,
      type: "reminder",
      status: null // Status is null for reminders
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
  // Find the original task and filter it out
  const filteredTasks = allTasks.filter(t => t.id !== task.id);
  
  // Create a new task object using the Task constructor
  // This ensures all methods are properly available
  const newTask = new Task({
    ...task,
    type: task.type,
    // Let the Task constructor handle the status calculation
    // Don't try to call calculateInitialStatus directly
    status: null // The constructor will calculate the proper status based on due date
  });

  return {
    tasks: [...filteredTasks, newTask],
    success: true
  };
}
}



// Make TaskConverter available globally
window.TaskConverter = TaskConverter;