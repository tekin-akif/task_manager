// app.js - Updated to use backend API

window.taskStore = []; // Add to window object // Single source of truth

// Initialize the app
function initApp() {
  // Initialize only relevant components for the current page
  if (document.getElementById("calGrid")) initCalendar();
  if (document.getElementById("overdueGrid")) initOverdue();
  if (document.getElementById("planningGrid")) initPlanning();
  if (document.getElementById("diaryContainer")) initDiary();

  window.addEventListener('taskStoreUpdated', () => {
    if (document.getElementById("calGrid")) window.refreshCalendar();
    if (document.getElementById("overdueGrid")) window.loadOverdueTasks();
    if (document.getElementById("planningGrid")) window.loadPlanningTasks();
  });
}

// Fetch tasks from backend API
window.fetchTasks = async () => {
  try {
    // Add timestamp to bypass cache
    const url = `http://localhost:3000/tasks?timestamp=${Date.now()}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error('Failed to fetch tasks');

    window.taskStore = (await response.json()).map(taskData => {
      return new Task(taskData); // Recreate with fresh status calculation
    });

    return window.taskStore;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
};

// Save tasks via backend API
window.saveTasks = async (tasks) => {
  try {
    const response = await fetch('http://localhost:3000/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tasks)
    });
    
    if (!response.ok) throw new Error('Failed to save tasks');
    return true; // Return true on success
  } catch (error) {
    console.error('Error saving tasks:', error);
    return false; // Return false on failure
  }
};



// Initialize the app on page load
document.addEventListener('DOMContentLoaded', initApp);