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
    const groupProperties = ['title', 'type', 'frequency', 'count']; // Properties that propagate to all family members
    
    // =================================================================
    // 1. Handle task type conversions using TaskConverter
    // =================================================================
    const needsTypeConversion = 
      (isExisting && originalTaskSnapshot.type !== task.type) || 
      (!isExisting && task.type === "periodic task");
    
    if (needsTypeConversion) {
      const result = await window.TaskConverter.convertTask(task, tasks);
      if (result.success) {
        const success = await window.saveTasks(result.tasks);
        if (success) await window.refreshAllUI();
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

    // Find the original mother task (snapshot before any changes)
    let originalMotherTask = originalTaskSnapshot;
    if (isExisting && originalTaskSnapshot.parentId) {
      const motherTask = tasks.find(t => t.id === originalTaskSnapshot.parentId);
      originalMotherTask = motherTask ? {...motherTask} : {...originalTaskSnapshot};
    }

    // If task is not periodic (after conversion check), we should not proceed
    if (task.type !== "periodic task") {
      return { success: true, tasks, shouldContinue: true };
    }

    // =================================================================
    // 3. Ensure count property exists (for backward compatibility)
    // =================================================================
    if (task.count === undefined || task.count === null) {
      // Compute count from existing family if possible
      const motherId = task.parentId || task.id;
      const family = tasks.filter(t => t.id === motherId || t.parentId === motherId);
      task.count = family.length; // includes mother
      if (task.count < 1) task.count = 1;
    }

    // =================================================================
    // 4. Identify mother task and current group tasks
    // =================================================================
    const motherId = task.parentId || task.id;
    const motherTask = tasks.find(t => t.id === motherId);
    if (!motherTask) {
      console.error("Mother task not found for periodic family");
      return { success: false, tasks, shouldContinue: false };
    }

    // Get all current family members (including mother)
    let currentFamily = tasks.filter(t => t.id === motherId || t.parentId === motherId);

    // =================================================================
    // 5. Detect changes in group properties
    // =================================================================
    const isMotherBeingEdited = (task.id === motherId);
    
    // Values to compare against original mother
    const newGroupValues = {
      title: task.title,
      type: task.type,
      frequency: task.frequency,
      count: task.count,
      due: isMotherBeingEdited ? task.due : motherTask.due  // only mother's due matters
    };

    const oldGroupValues = {
      title: originalMotherTask.title,
      type: originalMotherTask.type,
      frequency: originalMotherTask.frequency,
      count: originalMotherTask.count,
      due: originalMotherTask.due
    };

    // Determine what changed
    const changedProps = [];
    for (let prop of ['title', 'type', 'frequency', 'count']) {
      if (newGroupValues[prop] !== oldGroupValues[prop]) {
        changedProps.push(prop);
      }
    }
    const dueChanged = isMotherBeingEdited && (newGroupValues.due !== oldGroupValues.due);

    // =================================================================
    // 6. Apply changes based on what changed
    // =================================================================

    // Case: No group property changes → just update the individual task (child status/desc)
    if (changedProps.length === 0 && !dueChanged) {
      return { success: true, tasks, shouldContinue: true };
    }

    // Case: Only title/type changed → propagate to all family members
    if (changedProps.every(p => p === 'title' || p === 'type') && !dueChanged && !changedProps.includes('frequency') && !changedProps.includes('count')) {
      currentFamily.forEach(member => {
        if (changedProps.includes('title')) member.title = task.title;
        if (changedProps.includes('type')) member.type = task.type;
      });
      // No regeneration needed, just save
      const success = await window.saveTasks(tasks);
      if (success) await window.refreshAllUI();
      return { success, tasks, shouldContinue: false };
    }

    // Case: Count changed (and possibly other properties, but we'll handle count separately)
    if (changedProps.includes('count')) {
      const result = await this.handleCountChange(motherTask, tasks, currentFamily, oldGroupValues.count, task.count);
      return result;
    }

    // Case: Frequency or due date changed (regenerate all children)
    if (changedProps.includes('frequency') || dueChanged) {
      const result = await this.handleRegeneration(motherTask, tasks, currentFamily, oldGroupValues);
      return result;
    }

    // Fallback: just propagate all group properties (should not reach here)
    currentFamily.forEach(member => {
      groupProperties.forEach(prop => {
        if (prop !== 'count') member[prop] = task[prop];
      });
      member.count = task.count;
    });
    const success = await window.saveTasks(tasks);
    if (success) await window.refreshAllUI();
    return { success, tasks, shouldContinue: false };
  }

  /**
   * Handle change in the number of child tasks (count)
   */
  static async handleCountChange(motherTask, tasks, currentFamily, oldCount, newCount) {
    const motherId = motherTask.id;
    const children = currentFamily.filter(t => t.id !== motherId).sort((a, b) => new Date(a.due) - new Date(b.due));
    const currentTotal = currentFamily.length; // includes mother

    if (newCount > currentTotal) {
      // Add new children at the end
      const result = await this.addNewChildren(motherTask, tasks, children, newCount - currentTotal);
      return result;
    } else if (newCount < currentTotal) {
      // Remove surplus children (the latest ones)
      const result = await this.removeSurplusChildren(motherTask, tasks, children, currentTotal - newCount);
      return result;
    } else {
      // Count unchanged, just propagate other properties if any (handled elsewhere)
      return { success: true, tasks, shouldContinue: true };
    }
  }

  /**
   * Add new child tasks when count increases
   */
  static async addNewChildren(motherTask, tasks, existingChildren, numberOfNew) {
    const motherId = motherTask.id;
    const interval = motherTask.frequency;
    const lastChild = existingChildren.length > 0 ? existingChildren[existingChildren.length - 1] : null;
    let nextDue;
    if (lastChild) {
      nextDue = new Date(lastChild.due);
      nextDue.setDate(nextDue.getDate() + interval);
    } else {
      // No children yet, start from mother's due + interval
      nextDue = new Date(motherTask.due);
      nextDue.setDate(nextDue.getDate() + interval);
    }

    // Find highest existing child index
    const highestChildIndex = existingChildren.reduce((max, child) => {
      const idx = child.id - motherId * 1000;
      return idx > max ? idx : max;
    }, 0);

    const newChildren = [];
    for (let i = 0; i < numberOfNew; i++) {
      const dueISO = nextDue.toISOString().split('T')[0];
      const childIndex = highestChildIndex + 1 + i;
      const newId = motherId * 1000 + childIndex;
      
      newChildren.push(new Task({
        ...motherTask,
        id: newId,
        parentId: motherId,
        due: dueISO,
        status: "due",
        desc: ""
      }));

      nextDue.setDate(nextDue.getDate() + interval);
    }

    const updatedTasks = [...tasks, ...newChildren];
    const success = await window.saveTasks(updatedTasks);
    if (success) await window.refreshAllUI();
    return { success, tasks: updatedTasks, shouldContinue: false };
  }

  /**
   * Remove surplus child tasks when count decreases
   */
  static async removeSurplusChildren(motherTask, tasks, existingChildren, numberToRemove) {
    const motherId = motherTask.id;
    // Children are sorted by due date ascending; remove the last `numberToRemove`
    const childrenToRemove = existingChildren.slice(-numberToRemove).map(c => c.id);
    const filteredTasks = tasks.filter(t => !childrenToRemove.includes(t.id));

    // Also update the mother's count (already set in task)
    const success = await window.saveTasks(filteredTasks);
    if (success) await window.refreshAllUI();
    return { success, tasks: filteredTasks, shouldContinue: false };
  }

  /**
   * Regenerate all child tasks when frequency or mother's due date changes
   */
  static async handleRegeneration(motherTask, tasks, currentFamily, oldMotherSnapshot) {
    const motherId = motherTask.id;
    const interval = motherTask.frequency;
    const count = motherTask.count; // total tasks including mother
    const startDue = new Date(motherTask.due);

    // Build a map of existing children by due date for preserving status/desc
    const childrenByDue = new Map();
    currentFamily.forEach(member => {
      if (member.id !== motherId && member.due) {
        childrenByDue.set(member.due, { status: member.status, desc: member.desc });
      }
    });

    // Generate new sequence
    const newFamily = [motherTask]; // mother already updated
    let currentDue = new Date(startDue);
    for (let i = 1; i < count; i++) {
      currentDue.setDate(currentDue.getDate() + interval);
      const dueISO = currentDue.toISOString().split('T')[0];
      const childId = motherId * 1000 + i;

      // Check if we had a child with this due date before
      const oldChild = childrenByDue.get(dueISO);
      const status = oldChild ? oldChild.status : "due";
      const desc = oldChild ? oldChild.desc : "";

      newFamily.push(new Task({
        ...motherTask,
        id: childId,
        parentId: motherId,
        due: dueISO,
        status: status,
        desc: desc
      }));
    }

    // Remove all old family members (except mother) and add new ones
    const filteredTasks = tasks.filter(t => t.id !== motherId && t.parentId !== motherId);
    const updatedTasks = [...filteredTasks, ...newFamily];

    const success = await window.saveTasks(updatedTasks);
    if (success) await window.refreshAllUI();
    return { success, tasks: updatedTasks, shouldContinue: false };
  }

  /**
   * Handle periodic task deletion (same as before)
   */
  static async handlePeriodicTaskDelete(task, tasks) {
    const parentIdToDelete = task.parentId || task.id;
    const tasksToDelete = tasks.filter(t => t.parentId === parentIdToDelete || t.id === parentIdToDelete);
    const filteredTasks = tasks.filter(t => !tasksToDelete.some(d => d.id === t.id));
    const success = await window.saveTasks(filteredTasks);
    if (success) {
      await window.refreshAllUI();
      return { success: true, tasks: filteredTasks };
    }
    return { success: false, tasks };
  }

  /**
   * Check if parameters have changed (legacy method, may not be used)
   */
  static parametersChanged(task, originalTask) {
    // Not used in new logic, kept for compatibility
    return false;
  }
}

// Make PeriodicTaskHandler available globally
window.PeriodicTaskHandler = PeriodicTaskHandler;