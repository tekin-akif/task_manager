// calendar.js - Handles calendar rendering and interactions

// Constants
// Replace the fixed YEAR and MONTHS with a more dynamic approach
function generateCalendarData() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  const currentDate = today.getDate();
  
  // Get the earliest task date from window.taskStore
  let startYear, startMonth;
  
  if (window.taskStore && Array.isArray(window.taskStore) && window.taskStore.length > 0) {
    // Filter tasks with valid due dates and find the earliest one
    const tasksWithDueDates = window.taskStore.filter(task => task.due && task.due.length >= 10);
    
    if (tasksWithDueDates.length > 0) {
      // Find the earliest due date
      const earliestDateStr = tasksWithDueDates.reduce((earliest, task) => {
        return (!earliest || task.due < earliest) ? task.due : earliest;
      }, null);
      
      if (earliestDateStr) {
        // Parse the earliest date (format: "YYYY-MM-DD")
        const [year, month] = earliestDateStr.split('-').map(num => parseInt(num, 10));
        startYear = year;
        startMonth = month - 1; // Convert to 0-based month index
      } else {
        // No valid due dates, fall back to current month
        startYear = currentYear;
        startMonth = currentMonth;
      }
    } else {
      // No tasks with due dates, fall back to current month
      startYear = currentYear;
      startMonth = currentMonth;
    }
  } else {
    // No tasks at all, fall back to current month
    startYear = currentYear;
    startMonth = currentMonth;
  }
  
  // Calculate end date: 12 months ahead of current month
  const endDate = new Date(currentYear, currentMonth + 12, 1);
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth(); // 0-11
  
  // Generate months from start to end (inclusive)
  const calendarMonths = [];
  let current = new Date(startYear, startMonth, 1);
  const end = new Date(endYear, endMonth, 1);
  
  while (current <= end) {
    const year = current.getFullYear();
    const monthIndex = current.getMonth();
    const monthName = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"][monthIndex];
    
    calendarMonths.push({ 
      name: monthName, 
      monthIndex: monthIndex, 
      year: year 
    });
    
    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }
  
  return { currentYear, calendarMonths };
}
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Define icon paths in one place (could be moved to a constants section)
const ICONS = {
  PERIODIC: "assets/icons/periodic.svg",
  PERIODIC_MOTHER: "assets/icons/periodic-mother.svg",
  REMINDER: "assets/icons/reminder.svg",
  REGULAR: "assets/icons/regular.svg"
};

// DOM Elements
const calGrid = document.getElementById("calGrid"); // Calendar grid container
const yearHead = document.getElementById("yearHead"); // Year header


// Initialize the calendar
function initCalendar() {
  renderYearHeader();
   // New line for event delegation
  calGrid.addEventListener("click", handleCalendarClick);
  
  // Load tasks FIRST before rendering
  loadTasks().then(() => {
    renderCalendarGrid();
  });
}

// Render the year header

function renderYearHeader() {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Alternatively, for a cleaner header, just show the main year
   yearHead.textContent = currentYear;
  
}

// Load tasks from data source and refresh UI
async function loadTasks() {
  try {
    await window.fetchTasks();
    
  } catch (error) {
    console.error("Error loading tasks:", error);
  }
}

// Render the calendar grid
// Updated renderCalendarGrid function
function renderCalendarGrid(tasksToRender) {
  // Use fresh tasks if provided, otherwise use cached tasks
  const currentTasks = Array.isArray(tasksToRender) ? tasksToRender : window.taskStore;
  
  if (!Array.isArray(currentTasks)) {
    console.error("Invalid tasks data:", currentTasks);
    return;
  }
  
  console.log("Rendering calendar with tasks:", currentTasks);
  calGrid.innerHTML = ""; // Clear existing grid
  
  // Get calendar data
  const { calendarMonths } = generateCalendarData();
  
  // Loop through each month (including Dec of prev year and Jan of next year)
  calendarMonths.forEach((monthData) => {
    const { name: month, monthIndex, year } = monthData;
    
    // Create month section
    const monthSection = document.createElement("div");
    monthSection.className = "calendar__month";

    // Add month header with year if it's December or January (to clarify the year)
    const monthHeader = document.createElement("h2");
    monthHeader.className = "calendar__header";

    monthHeader.textContent = `${month} ${year}`;

    monthSection.appendChild(monthHeader);

    // Create month grid
    const monthGrid = document.createElement("div");
    monthGrid.className = "calendar__grid";

    // Add day labels (Mon, Tue, ..., Sun)
    DAYS.forEach(day => {
      const dayLabel = document.createElement("div");
      dayLabel.className = "calendar__day-label";
      dayLabel.textContent = day;
      monthGrid.appendChild(dayLabel);
    });

    // Add empty cells for days before the first day of the month
    const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
    const emptyCells = (firstDayOfMonth + 6) % 7; // Adjust for Monday as the first day
    for (let i = 0; i < emptyCells; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "calendar__day --empty";
      monthGrid.appendChild(emptyCell);
    }

    // Add days of the month
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement("div");
      dayCell.className = "calendar__day";
      
      // Format date with the correct year
      const dateKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      dayCell.dataset.date = dateKey;
      
      // Check if this cell is today and add special class if it is
      if (dateKey === getTodayDateString()) {
        dayCell.classList.add("calendar__day--today");
      }

      // Add day header with formatted date
      const dayHeader = document.createElement("div");
      dayHeader.className = "calendar__day-header";
      
      // Format the date as "01 Jan 2025" with the correct year
      const formattedDay = String(day).padStart(2, '0');
      const formattedMonth = month.substring(0, 3);
      dayHeader.textContent = `${formattedDay} ${formattedMonth} ${year}`;
      
      dayCell.appendChild(dayHeader);

      // The rest of your code for rendering tasks remains the same
      const tasksForDay = currentTasks
        .filter(task => task.due === dayCell.dataset.date)
        .sort((a, b) => {
          const typePriority = {
            reminder: 0,
            "periodic task": 1
          };

          const aType = typePriority[a.type] ?? 2;
          const bType = typePriority[b.type] ?? 2;

          return aType - bType;
        });
      
      tasksForDay.forEach(task => {
        // Your existing task rendering code...
        const taskElement = document.createElement("div");
        taskElement.className = `calendar__task task-type--${task.type.toLowerCase().replace(/ /g, '-')} task-status--${task.status}`;
        
        // Your icon insertion code...
        taskElement.textContent = "";
        
        if (task.type === "periodic task") {
          if (task.id === task.parentId) {
            const motherIcon = document.createElement("img");
            motherIcon.src = ICONS.PERIODIC_MOTHER;
            motherIcon.className = "task-icon";
            motherIcon.alt = "Mother";
            taskElement.appendChild(motherIcon);
          }
          
          const periodicIcon = document.createElement("img");
          periodicIcon.src = ICONS.PERIODIC;
          periodicIcon.className = "task-icon";
          periodicIcon.alt = "Periodic";
          taskElement.appendChild(periodicIcon);
        } else if (task.type === "reminder") {
          const reminderIcon = document.createElement("img");
          reminderIcon.src = ICONS.REMINDER;
          reminderIcon.className = "task-icon";
          reminderIcon.alt = "Reminder";
          taskElement.appendChild(reminderIcon);
        } else if (task.type === "regular task") {
          const regularIcon = document.createElement("img");
          regularIcon.src = ICONS.REGULAR;
          regularIcon.className = "task-icon";
          regularIcon.alt = "Regular";
          taskElement.appendChild(regularIcon);
        } 
        
        const titleText = document.createTextNode(task.title);
        taskElement.appendChild(titleText);
        
        taskElement.dataset.taskId = task.id;
        dayCell.appendChild(taskElement);
      });

      monthGrid.appendChild(dayCell);
    }

    monthSection.appendChild(monthGrid);
    calGrid.appendChild(monthSection);
  });
}


// Handle click on a day cell
function handleDayClick(date) {
  // Open Task Window for creating a new task
  openTaskWindow({ due: date });
}

// Handle click on a task
function handleTaskClick(taskId) {
  // Find the task and open Task Window for editing
  const task = window.taskStore.find(t => Number(t.id) === Number(taskId));
  if (task) {
    openTaskWindow(task);
  }
}

// Open Task Window (assumes task.js handles this)
function openTaskWindow(taskData) {
  // Trigger Task Window from task.js
  if (window.openTaskWindow) {
    window.openTaskWindow(taskData);
  } else {
    console.error("Task Window functionality not found.");
  }
}

// New function for event delegation
function handleCalendarClick(event) {
  const target = event.target;
  
  // Find the closest day cell (if any)
  const dayCell = target.closest(".calendar__day");
  if (dayCell && !target.closest(".calendar__task")) {
    // Only trigger if they clicked the day itself, not a task within it
    handleDayClick(dayCell.dataset.date);
    return;
  }
  
  // Find the closest task (if any)
  const taskElement = target.closest(".calendar__task");
  if (taskElement) {
    event.stopPropagation(); // Prevent triggering day click
    handleTaskClick(taskElement.dataset.taskId);
    return;
  }
}

// Get today's date in the same format as your dataset.date to style today emphasized
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Expose function to refresh calendar
window.refreshCalendar = async function() {
  // Force fresh data and explicit render
  await window.fetchTasks();
  renderCalendarGrid(window.taskStore); // Directly pass updated store
};

// Expose renderCalendarGrid globally
window.renderCalendarGrid = renderCalendarGrid;