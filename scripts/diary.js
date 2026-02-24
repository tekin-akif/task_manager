// Handles diary functionality

// DOM Elements
const diaryContainer = document.getElementById("diaryContainer");
let diaryEntries = []; // Store diary entries as an array
import { openDiaryWindow } from "./diaryWindow.js"; // Import modal opener

// Initialize the diary page
function initDiary() {
  renderYearHeader();
  if (!diaryContainer) return;
  
  // Load diary entries from API
  fetchDiaryEntries().then(() => {
    renderDiaryDays();
  });
}

// Fetch diary entries from backend API
window.fetchDiaryEntries = async () => {
  try {
    // Add timestamp to bypass cache
    const url = `http://localhost:3000/diary-entries?timestamp=${Date.now()}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('Failed to fetch diary entries');
    
    diaryEntries = await response.json();
    return diaryEntries;
  } catch (error) {
    console.error('Error fetching diary entries:', error);
    return [];
  }
};

// Save diary entries via backend API
window.saveDiaryEntries = async (entries) => {
  try {
    const response = await fetch('http://localhost:3000/diary-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries)
    });
    if (!response.ok) throw new Error('Failed to save diary entries');
    return true;
  } catch (error) {
    console.error('Error saving diary entries:', error);
    return false;
  }
};

// Get diary entry by date
function getDiaryEntryByDate(dateKey) {
  return diaryEntries.find(entry => entry.diaryEntryDate === dateKey);
}

// diary sayfasında görüntülenecek olan tarihleri tespit edip ilgili array'e (datesToDisplay) ekleyen fonksiyon
function getDates(day, array) {
  const lastWeek = formatLastWeek(day);
  const allDates = diaryEntries.map(entry => entry.diaryEntryDate);
  const aWeekAgo = allDates.filter(item => item < lastWeek);
  const aWeekAgoSorted = aWeekAgo.sort((a,b) => new Date(a) - new Date(b));
  aWeekAgoSorted.forEach(entry => array.push(new Date(entry)));
  
  const a = day;
  let b = new Date(a);
  b.setDate(b.getDate() - 6);
  while (b <= a) {
    array.push(new Date(b));
    b.setDate(b.getDate() + 1);
  }
}

// Update or create diary entry
async function updateDiaryEntry(dateKey, content) {
  // Find existing entry
  const existingEntryIndex = diaryEntries.findIndex(entry => entry.diaryEntryDate === dateKey);
  
  if (existingEntryIndex >= 0) {
    // Update existing entry
    diaryEntries[existingEntryIndex].diaryEntry = content;
  } else {
    // Create new entry with ID derived from the date
    const dateId = parseInt(dateKey.replace(/-/g, ''));
      
    diaryEntries.push({
      diaryEntryId: dateId,
      diaryEntryDate: dateKey,
      diaryEntry: content
    });
  }
  
  // Save to backend
  await window.saveDiaryEntries(diaryEntries);
}

function renderDiaryDays() {
  diaryContainer.innerHTML = '';
  
  const today = getAdjustedToday();
  const currentYear = today.getFullYear();

  // Create title for the diary
  const title = document.createElement('h2');
  title.className = 'diary-title';
  title.textContent = `Diary`;
  diaryContainer.appendChild(title);
  
  // Create diary grid
  const diaryGrid = document.createElement('div');
  diaryGrid.className = 'diary-grid';
  diaryGrid.id = 'diaryGrid';
  diaryContainer.appendChild(diaryGrid);

  // Collect all dates we need to display (in chronological order)
  const datesToDisplay = [];
  getDates(today, datesToDisplay);
    
  // Reverse the array to display most recent first (today at the top)
  datesToDisplay.reverse();
 
  const lastWeek = formatLastWeek(today);
   
  // Create a row for each day
  for (const currentDate of datesToDisplay) {
    const dateKey = formatDateKey(currentDate);
    const dateDisplay = formatDateDisplay(currentDate);
    
    const dayRow = document.createElement('div');
    dayRow.className = 'diary-row';
    dayRow.dataset.date = dateKey;
    
    // Is this today?
    if (isSameDay(currentDate, today)) {
      dayRow.classList.add('diary-row--today');
    }
    
    // Create date display cell
    const dateCell = document.createElement('div');
    dateCell.className = 'diary-row__date';
    
    // Add year to the date display for December and January to distinguish them
    if (currentDate.getMonth() === 11 && currentDate.getFullYear() === currentYear - 1) {
      dateCell.textContent = `${dateDisplay} ${currentYear - 1}`;
    } else if (currentDate.getMonth() === 0 && currentDate.getFullYear() === currentYear + 1) {
      dateCell.textContent = `${dateDisplay} ${currentYear + 1}`;
    } else {
      dateCell.textContent = dateDisplay;
    }
    
    // Create diary entry cell with display element (instead of editable textarea)
    const entryCell = document.createElement('div');
    entryCell.className = 'diary-row__entry';
    
    const entryDisplay = document.createElement('div');
    entryDisplay.className = 'diary-entry__display';
    entryDisplay.dataset.date = dateKey;
    
    // Find entry for this date
    const existingEntry = getDiaryEntryByDate(dateKey);
    entryDisplay.textContent = existingEntry ? existingEntry.diaryEntry : '';
    
    // Add the display to the entry cell
    entryCell.appendChild(entryDisplay);
        
    // Add cells to the row
    dayRow.appendChild(dateCell);
    dayRow.appendChild(entryCell);

    // Add row to the grid based on age and content
    if (dateKey < lastWeek) {
      if (entryDisplay.textContent) {
        diaryGrid.appendChild(dayRow);
      }
    } else {
      diaryGrid.appendChild(dayRow);
    }
  }
  
  // Add click listener to open modal when a diary entry display is clicked
  diaryGrid.addEventListener('click', (e) => {
    const display = e.target.closest('.diary-entry__display');
    if (!display) return;

    const dateKey = display.dataset.date;
    const currentText = display.textContent;

    // Open modal with callbacks
    openDiaryWindow(
      currentText,
      // onSave callback
      async (newText) => {
        await updateDiaryEntry(dateKey, newText);
        display.textContent = newText; // Update the display immediately
      },
      // onDelete callback
      async () => {
        await updateDiaryEntry(dateKey, '');
        display.textContent = ''; // Clear the display
      }
    );
  });
}

function getAdjustedToday() {
  const now = new Date();
  const hour = now.getHours();
  
  // If it's between midnight and 6 AM, use the previous day as "today"
  if (hour < 6) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  
  // Otherwise, use the actual current date
  return now;
}

// Format date for storage key: YYYY-MM-DD
function formatDateKey(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// Format date of 6 days ago to set the threshold for showing older entries: YYYY-MM-DD
function formatLastWeek(date) {
  const lastWeekDate = new Date(date);
  lastWeekDate.setDate(lastWeekDate.getDate() - 6);
  return formatDateKey(lastWeekDate);
}

// Format date for display: Mon, Jan 1
function formatDateDisplay(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

// Check if two dates are the same day
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// Helper to render year header (if needed)
function renderYearHeader() {
  const yearHead = document.getElementById('yearHead');
  if (yearHead) {
    yearHead.textContent = new Date().getFullYear();
  }
}

// Initialize the diary page on load
document.addEventListener("DOMContentLoaded", initDiary);