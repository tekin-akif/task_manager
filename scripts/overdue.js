// overdue.js - Handles overdue tasks logic

function formatDate(dateString) {
  if (!dateString) return 'No date';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// DOM Elements
const overdueGrid = document.getElementById("overdueGrid");

// Initialize the overdue page
function initOverdue() {
	renderYearHeader();
  // Force fresh status calculations
  window.fetchTasks().then(() => {
    loadOverdueTasks();
  });
}

// Load overdue tasks with status validation
function loadOverdueTasks() {
  // Validate late status against current date
  const validatedTasks = window.taskStore.filter(task => {
    if (task.status === "late") {
      // Re-validate late status on load
      return new Task(task).isOverdue(task.due);
    }
    return false;
  });
  
  renderOverdueTasks(validatedTasks);
}

// Render overdue tasks with status awareness
function renderOverdueTasks(tasks) {
  const overdueGrid = document.getElementById("overdueGrid");
  if (!overdueGrid) return;
  
  overdueGrid.innerHTML = "";
  overdueGrid.classList.toggle("--empty", tasks.length === 0);

  if (tasks.length === 0) {
    overdueGrid.textContent = "No overdue tasks.";
    return;
  }

  const sortedTasks = tasks.sort((a, b) => 
    new Date(a.due) - new Date(b.due)
  );

  sortedTasks.forEach((task, index) => {
    const taskRow = document.createElement("div");
    taskRow.className = "task-row";
    taskRow.innerHTML = `
      <div class="task-row__index">${index + 1}</div>
      <button class="task-row__title task-status--${task.status}">${
  task.type === "periodic task" ? '<img src="assets/icons/periodic.svg" class="task-icon" alt="Periodic">' : ''
}${task.title}</button>
      <div class="task-row__due">${formatDate(task.due)}</div>
    `;

    taskRow.querySelector("button").addEventListener("click", () => {
      handleTaskClick(task.id);
    });

    overdueGrid.appendChild(taskRow);
  });
}

function handleTaskClick(taskId) {
  const task = window.taskStore.find(t => Number(t.id) === Number(taskId));
  if (task) window.openTaskWindow(task);
}

// Initialize on load and add refresh capability
document.addEventListener("DOMContentLoaded", initOverdue);
window.loadOverdueTasks = loadOverdueTasks; // Expose for global access