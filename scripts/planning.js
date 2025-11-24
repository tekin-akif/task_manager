// planning.js - Handles planning tasks logic

// DOM Elements
const planningGrid = document.getElementById("planningGrid");

// Initialize the planning page
function initPlanning() {
	renderYearHeader();
  if (!document.getElementById("planningGrid")) return;
  
  // Load tasks first
  window.fetchTasks().then(() => {
    loadPlanningTasks();
  });
}

// Load planning tasks
function loadPlanningTasks() {
  const planningTasks = window.taskStore.filter(task => !task.due);
  renderPlanningTasks(planningTasks);
}

// Render planning tasks
function renderPlanningTasks(tasks) {
  const planningGrid = document.getElementById("planningGrid");
  if (!planningGrid) return;
  planningGrid.innerHTML = "";

  // Empty line (always first)
  const emptyLine = document.createElement("div");
  emptyLine.className = "task-row task-row--empty";
  emptyLine.innerHTML = `
    <div class="task-row__index">#</div>
    <button class="task-row__title">Click here to create a task</button>
  `;
  emptyLine.querySelector("button").addEventListener("click", () => handleTaskClick(null));
  planningGrid.appendChild(emptyLine);

  if (tasks.length === 0) return;

  // Sort by creation time (using ID)
  const sortedTasks = tasks.sort((a, b) => a.id - b.id);

  sortedTasks.forEach((task, index) => {
    const taskRow = document.createElement("div");
    taskRow.className = "task-row";
    taskRow.innerHTML = `
      <div class="task-row__index">${index + 1}</div>
      <button class="task-row__title">${
  task.type === "periodic task" ? '<img src="assets/icons/periodic.svg" class="task-icon" alt="Periodic">' : ''
}${task.title}</button>
    `;

    taskRow.querySelector("button").addEventListener("click", () => {
      handleTaskClick(task.id);
    });

    planningGrid.appendChild(taskRow);
  });
}


// Handle task click
function handleTaskClick(taskId) {
  if (taskId === null) {
    window.openTaskWindow({});
  } else {
    // Changed from local 'tasks' to window.taskStore
    const task = window.taskStore.find(task => Number(task.id) === Number(taskId));
    if (task) {
      window.openTaskWindow(task);
    }
  }
}

// Initialize the planning page on load
document.addEventListener("DOMContentLoaded", initPlanning);