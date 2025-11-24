// taskStats.js - Simplified version

// Initialize the stats object
const taskStats = {
  counts: {
    total: 0,
    done: 0,
    due: 0,
    late: 0
  },
  
  
  calculate(tasks) {
  if (!Array.isArray(tasks)) return this.counts;

  // Only tasks with a valid status
  const validStatuses = ["done", "due", "late"];
  const countableTasks = tasks.filter(task => validStatuses.includes(task.status));

  // Reset counts
  this.counts.total = countableTasks.length;
  this.counts.done = countableTasks.filter(t => t.status === "done").length;
  this.counts.due = countableTasks.filter(t => t.status === "due").length;
  this.counts.late = countableTasks.filter(t => t.status === "late").length;

  return this.counts;
},
  
  // Update the UI elements
  updateUI() {
    document.querySelectorAll('.done-counter').forEach(el => {
      el.textContent = this.counts.done;
    });
    
    document.querySelectorAll('.due-counter').forEach(el => {
      el.textContent = this.counts.due;
    });
    
    document.querySelectorAll('.late-counter').forEach(el => {
      el.textContent = this.counts.late;
    });
  }
};

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
  try {
	  //const response = await fetch('/tasks'); <-- doesnt work this way
    const response = await fetch('http://localhost:3000/tasks'); 
    if (response.ok) {
      const tasks = await response.json();
      taskStats.calculate(tasks);
      taskStats.updateUI();
    }
  } catch (error) {
    console.error("Failed to load task stats:", error);
  }
});

// Make refreshing available globally
window.refreshTaskStats = async function() {
  try {
    const response = await fetch('http://localhost:3000/tasks');
    if (response.ok) {
      const tasks = await response.json();
      taskStats.calculate(tasks);
      taskStats.updateUI();
    }
  } catch (error) {
    console.error("Failed to refresh task stats:", error);
  }
};