/**
 * Helpers
 * Global utility functions for refreshing UI components
 */

// Make refreshAllUI globally available
window.refreshAllUI = async function() {
  // Refresh task data
  await window.fetchTasks();
  
  // Refresh calendar if it exists
  if (document.getElementById("calGrid") && window.refreshCalendar) {
    await window.refreshCalendar();
  }
  
  // Refresh overdue tasks if component exists
  if (document.getElementById("overdueGrid") && window.loadOverdueTasks) {
    await window.loadOverdueTasks();
  }
  
  // Refresh planning tasks if component exists
  if (document.getElementById("planningGrid") && window.loadPlanningTasks) {
    await window.loadPlanningTasks();
  }
};

// Optional convenience method
//window.validateAndRefresh = async function(success) {
//  if (success) {
//    await window.refreshAllUI();
//  }
//  return success;
//};