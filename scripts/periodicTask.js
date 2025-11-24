// =============================================
// PERIODIC TASK HANDLER CLASS
// =============================================
class PeriodicTaskHandler {
  
  /**
   * Handle all periodic task logic during save operation
   * @param {Task} task - The task being saved
   * @param {Array} tasks - All tasks array
   * @param {Object} originalTaskSnapshot - Snapshot of original task (if editing)
   * @param {boolean} isExisting - Whether this is an existing task
   * @returns {Object} - {success: boolean, tasks: Array, shouldContinue: boolean}
   */
  static async handlePeriodicTaskSave(task, tasks, originalTaskSnapshot, isExisting) {
    const groupProperties = ['title', 'frequency', 'endDate', 'type']; // Properties that propagate
    
    // =================================================================
    // 1. Handle task type conversions using TaskConverter
    // =================================================================
    const needsTypeConversion = 
      (isExisting && originalTaskSnapshot.type !== task.type) || 
      (!isExisting && task.type === "periodic task");
    
    if (needsTypeConversion) {
      // Use TaskConverter for type conversions
      const result = await window.TaskConverter.convertTask(task, tasks);
      
      if (result.success) {
        const success = await window.saveTasks(result.tasks);
        
        if (success) {
          await window.refreshAllUI();
        }
        return { success, tasks: result.tasks, shouldContinue: false };
      }
      return { success: false, tasks, shouldContinue: false };
    }

    // =================================================================
    // 2. Update task in array & find original mother task
    // =================================================================
    const index = tasks.findIndex(t => Number(t.id) === Number(task.id));
    
    if (index === -1) {
      tasks.push(task);
    } else {
      tasks[index] = task;
    }

    // Find the original mother task (properly create copy to avoid reference issues)
    let originalMotherTask = originalTaskSnapshot;
    if (isExisting && originalTaskSnapshot.parentId) {
      const motherTask = tasks.find(t => t.id === originalTaskSnapshot.parentId);
      originalMotherTask = motherTask ? {...motherTask} : {...originalTaskSnapshot};
    }

    // =================================================================
    // 3. SPECIAL HANDLING FOR MOTHER TASK END DATE CHANGES
    // =================================================================
    const isMother = (!task.parentId || task.id === task.parentId) && task.type === "periodic task";
    const endDateChanged = isExisting && task.endDate !== originalTaskSnapshot.endDate;
    
    if (isMother && endDateChanged) {
      return await this.handleMotherTaskEndDateChange(task, tasks, originalTaskSnapshot, groupProperties);
    }

    // =================================================================
    // 4. Handle child task changes for periodic tasks
    // =================================================================
    if (isExisting && task.type === "periodic task") {
      const parentId = originalMotherTask.id;
      
      const groupTasks = tasks.filter(t => (t.parentId === parentId || t.id === parentId) && t.type === "periodic task");
      
      if (groupTasks.length) {
        // If endDate changed, we need to handle surplus children or add new ones
        const endDateChanged = task.endDate !== originalMotherTask.endDate;
        
        groupTasks.forEach(task_item => {
          // Only update the specified group properties
          // This preserves individual status and desc for each task
          groupProperties.forEach(prop => {
            task_item[prop] = task[prop]; // Propagate only group properties
          });
        });
        
        // If end date changed, we need to handle it
        if (endDateChanged) {
          return await this.handleChildTaskEndDateChange(task, tasks, originalMotherTask, groupTasks);
        }
      }
    }

    // =================================================================
    // 5. Handle parameter changes
    // =================================================================
    if (isExisting && task.type === "periodic task" && this.parametersChanged(task, originalMotherTask)) {
      return await this.handleParameterChanges(task, tasks, originalMotherTask);
    }

    // Continue with regular save
    return { success: true, tasks, shouldContinue: true };
  }

  /**
   * Handle mother task end date changes
   */
  static async handleMotherTaskEndDateChange(task, tasks, originalTaskSnapshot, groupProperties) {
    const parentId = task.id;
    
    // Find all tasks in the group
    const groupTasks = tasks.filter(t => (t.parentId === parentId || t.id === parentId) && t.type === "periodic task");
    
    // Update all tasks in the group with ALL group properties, not just end date
    groupTasks.forEach(task_item => {
      // Propagate all group properties including title
      groupProperties.forEach(prop => {
        task_item[prop] = task[prop];
      });
    });
    
    // Handle end date changes
    const newEndDate = new Date(task.endDate);
    const originalEndDate = originalTaskSnapshot ? new Date(originalTaskSnapshot.endDate) : new Date();
    
    // If new end date is earlier than original, remove surplus children
    if (newEndDate < originalEndDate) {
      const tasksToKeep = [];
      const tasksToRemove = [];
      
      groupTasks.forEach(task_item => {
        if (task_item.due) {
          const taskDueDate = new Date(task_item.due);
          
          if (taskDueDate > newEndDate) {
            tasksToRemove.push(task_item.id);
          } else {
            tasksToKeep.push(task_item);
          }
        } else {
          tasksToKeep.push(task_item); // Keep tasks without due dates
        }
      });
      
      // Update the tasks array by removing surplus children
      const filteredTasks = tasks.filter(t => !tasksToRemove.includes(t.id));
      
      const success = await window.saveTasks(filteredTasks);
      
      if (success) {
        await window.refreshAllUI();
      }
      return { success, tasks: filteredTasks, shouldContinue: false };
    } 
    // If new end date is later than original, add new children
    else if (newEndDate > originalEndDate) {
      return await this.addNewChildTasks(task, tasks, parentId);
    }
    else {
      // End date technically changed (string comparison) but dates are equivalent
      // Still need to save to propagate changes
      const success = await window.saveTasks(tasks);
      
      if (success) {
        await window.refreshAllUI();
      }
      return { success, tasks, shouldContinue: false };
    }
  }

  /**
   * Handle child task end date changes
   */
  static async handleChildTaskEndDateChange(task, tasks, originalMotherTask, groupTasks) {
    const newEndDate = new Date(task.endDate);
    const originalEndDate = new Date(originalMotherTask.endDate);
    
    // If new end date is earlier than original, remove surplus children
    if (newEndDate < originalEndDate) {
      const tasksToKeep = [];
      const tasksToRemove = [];
      
      groupTasks.forEach(task_item => {
        if (task_item.due) {
          const taskDueDate = new Date(task_item.due);
          
          if (taskDueDate > newEndDate) {
            tasksToRemove.push(task_item.id);
          } else {
            tasksToKeep.push(task_item);
          }
        } else {
          tasksToKeep.push(task_item); // Keep tasks without due dates (shouldn't happen, but just in case)
        }
      });
      
      // Update all tasks in memory with the new end date
      tasks.forEach(task_item => {
        if (task_item.id === originalMotherTask.id || task_item.parentId === originalMotherTask.id) {
          task_item.endDate = task.endDate;
        }
      });
      
      // Update the tasks array by removing surplus children
      const filteredTasks = tasks.filter(t => !tasksToRemove.includes(t.id));
      
      const success = await window.saveTasks(filteredTasks);
      
      if (success) {
        await window.refreshAllUI();
      }
      return { success, tasks: filteredTasks, shouldContinue: false };
    } 
    // If new end date is later than original, add new children
    else if (newEndDate > originalEndDate) {
      return await this.addNewChildTasksForGroup(task, tasks, originalMotherTask);
    }
    
    // Continue with regular save
    return { success: true, tasks, shouldContinue: true };
  }

  /**
   * Add new child tasks when end date is extended
   */
  static async addNewChildTasks(task, tasks, parentId) {
    // Find all existing child tasks (including the mother task)
    const allGroupTasks = tasks.filter(t => t.id === parentId || t.parentId === parentId);
    
    // Find the latest existing task date
    const latestTaskDate = allGroupTasks
      .map(t => t.due ? new Date(t.due) : null)
      .filter(date => date !== null)
      .reduce((latest, current) => current > latest ? current : latest, new Date(0));
    
    // Calculate the next date after the latest existing task
    let nextDate = new Date(latestTaskDate);
    nextDate.setDate(nextDate.getDate() + task.frequency);
  
    // Find the highest existing child index to ensure unique IDs
    const highestChildIndex = allGroupTasks
      .filter(t => t.id !== parentId) // Exclude the mother task
      .reduce((max, task_item) => {
        const childIndex = task_item.id - parentId * 1000;
        return childIndex > max ? childIndex : max;
      }, 0);
    
    // Generate new tasks from the day after the latest to the new end date
    const newChildTasks = [];
    let childIndex = highestChildIndex + 1; // Start after the highest existing index
    const newEndDate = new Date(task.endDate);
    
    while (nextDate <= newEndDate) {
      const dueISO = nextDate.toISOString().split('T')[0];
      
      newChildTasks.push(new Task({
        ...task,
        id: parentId * 1000 + childIndex,
        parentId: parentId,
        due: dueISO,
        status: "due",
        desc: "" // Empty description
      }));
      
      nextDate.setDate(nextDate.getDate() + task.frequency);
      childIndex++;
    }
    
    // Add the new tasks to the existing ones
    const success = await window.saveTasks([...tasks, ...newChildTasks]);
    
    if (success) {
      await window.refreshAllUI();
    }
    return { success, tasks: [...tasks, ...newChildTasks], shouldContinue: false };
  }

  /**
   * Add new child tasks for group (when editing child task)
   */
  static async addNewChildTasksForGroup(task, tasks, originalMotherTask) {
    // Find the parent ID (will be the same regardless of which task we're editing)
    const parentId = originalMotherTask.id;
    
    // Find all existing child tasks (including the mother task)
    const allGroupTasks = tasks.filter(t => t.id === parentId || t.parentId === parentId);
    
    // Find the latest existing task date
    const latestTaskDate = allGroupTasks
      .map(t => t.due ? new Date(t.due) : null)
      .filter(date => date !== null)
      .reduce((latest, current) => current > latest ? current : latest, new Date(0));
    
    // Calculate the next date after the latest existing task
    let nextDate = new Date(latestTaskDate);
    nextDate.setDate(nextDate.getDate() + task.frequency);
    
    // Find the highest existing child index to ensure unique IDs
    const highestChildIndex = allGroupTasks
      .filter(t => t.id !== parentId) // Exclude the mother task
      .reduce((max, task_item) => {
        const childIndex = task_item.id - parentId * 1000;
        return childIndex > max ? childIndex : max;
      }, 0);
    
    // Generate new tasks from the day after the latest to the new end date
    const newChildTasks = [];
    let childIndex = highestChildIndex + 1; // Start after the highest existing index
    const newEndDate = new Date(task.endDate);
    
    while (nextDate <= newEndDate) {
      const dueISO = nextDate.toISOString().split('T')[0];
      
      // FIXED: Place desc: "" after the spread to ensure it overrides
      newChildTasks.push(new Task({
        ...task,
        id: parentId * 1000 + childIndex,
        parentId: parentId,
        due: dueISO,
        status: "due",
        desc: "" // Empty description - place AFTER spread to override
      }));
      
      nextDate.setDate(nextDate.getDate() + task.frequency);
      childIndex++;
    }
    
    // Update all tasks in memory with the new end date
    tasks.forEach(task_item => {
      if (task_item.id === parentId || task_item.parentId === parentId) {
        task_item.endDate = task.endDate;
      }
    });
    
    // Add the new tasks to the existing ones
    const success = await window.saveTasks([...tasks, ...newChildTasks]);
    
    if (success) {
      await window.refreshAllUI();
    }
    return { success, tasks: [...tasks, ...newChildTasks], shouldContinue: false };
  }

  /**
   * Handle parameter changes for periodic tasks
   */
  static async handleParameterChanges(task, tasks, originalMotherTask) {
    const parentId = originalMotherTask.id;
    
    const groupTasks = tasks.filter(t => t.parentId === parentId || t.id === parentId);
    
    const newTasks = tasks.filter(t => !groupTasks.some(gt => gt.id === t.id));
  
    let currentDue = new Date(originalMotherTask.due);
    const endDate = new Date(task.endDate);
    
    const batch = [];
    let childIndex = 1;

    // For the first task (mother task), preserve its current status and desc
    const motherTask = groupTasks.find(t => t.id === originalMotherTask.id);
    const motherStatus = motherTask ? motherTask.status : originalMotherTask.status;
    const motherDesc = motherTask ? motherTask.desc : originalMotherTask.desc;

    while (currentDue <= endDate) {
      const dueISO = currentDue.toISOString().split('T')[0];
      
      // Find if this date already had a task in the old sequence
      const existingTask = groupTasks.find(t => t.due === dueISO);
      
      const newTaskId = batch.length === 0 ? originalMotherTask.id : originalMotherTask.id * 1000 + childIndex;
      const newTaskStatus = batch.length === 0 ? motherStatus : (existingTask ? existingTask.status : "due");
      const newTaskDesc = batch.length === 0 ? motherDesc : (existingTask ? existingTask.desc : "");
      
      batch.push(new Task({
        ...task,
        id: newTaskId,
        parentId: originalMotherTask.id,
        due: dueISO,
        title: task.title,
        // Preserve individual status and description when possible
        status: newTaskStatus,
        desc: newTaskDesc
      }));
      
      currentDue.setDate(currentDue.getDate() + originalMotherTask.frequency);
      childIndex++;
    }
    
    const success = await window.saveTasks([...newTasks, ...batch]);
    
    if (success) {
      await window.refreshAllUI();
    }
    return { success, tasks: [...newTasks, ...batch], shouldContinue: false };
  }

  /**
   * Check if parameters have changed for periodic task
   */
  static parametersChanged(task, originalTask) {
    // Check if this IS the mother task and being directly edited
    const isMotherTask = task.id === originalTask.id && !task.parentId;
    
    // For mother tasks, compare against the STORED values rather than runtime values
    const changedParams = ['title', 'due', 'endDate', 'frequency'].filter(prop => {
      const oldValue = originalTask[prop];
      const newValue = task[prop];
      const changed = oldValue !== newValue;
      
      return changed;
    });
    
    // Return true if any parameters changed OR if this is a mother task with endDate change
    return changedParams.length > 0 || (isMotherTask && task.endDate !== originalTask.endDate);
  }

  /**
   * Handle periodic task deletion
   * @param {Task} task - The task to delete
   * @param {Array} tasks - All tasks array
   * @returns {Object} - {success: boolean, tasks: Array}
   */
  static async handlePeriodicTaskDelete(task, tasks) {
    const parentIdToDelete = task.parentId || task.id;
    
    // Find all tasks in the group (including parent and children)
    const tasksToDelete = tasks.filter(t => 
      t.parentId === parentIdToDelete || t.id === parentIdToDelete
    );

    // Remove all group members
    const filteredTasks = tasks.filter(t => 
      !tasksToDelete.some(d => d.id === t.id)
    );

    const success = await window.saveTasks(filteredTasks);
       
    if (success) {
      await window.refreshAllUI();
      return { success: true, tasks: filteredTasks };
    }
    return { success: false, tasks };
  }
}

// Make PeriodicTaskHandler available globally
window.PeriodicTaskHandler = PeriodicTaskHandler;