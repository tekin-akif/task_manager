// Handles diary functionality

// DOM Elements
const diaryContainer = document.getElementById("diaryContainer");
let diaryEntries = []; // Store diary entries as an array

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
    return true;  // Return true on success
  } catch (error) {
    console.error('Error saving diary entries:', error);
    return false;  // Return false on failure
  }
};

// Get diary entry by date
function getDiaryEntryByDate(dateKey) {
  return (diaryEntries.find(entry => entry.diaryEntryDate === dateKey));

}

// diary sayfasında görüntülenecek olan tarihleri tespit edip ilgili array'e (datesToDisplay) ekleyen fonksiyon
function getDates(day, array) {

	const lastWeek = formatLastWeek(day);
	const allDates = diaryEntries.map(entry => entry.diaryEntryDate);
	const aWeekAgo = allDates.filter(item => item < lastWeek);
	const aWeekAgoSorted = aWeekAgo.sort((a,b) => new Date(a) - new Date(b));
	const sortedRealDates = aWeekAgoSorted.map(entry => array.push(new Date(entry)));
	
	const a = day; // new Date(); new date yapınca yeni gün sabah altıda değil gece 12'de geliyor.	
	let b = new Date();
	b.setDate(b.getDate() - 6);
	while (b<=a) {
		array.push(new Date(b));
		b.setDate(b.getDate()+1);
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
    // Convert YYYY-MM-DD to a number by removing hyphens
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
  getDates(today, datesToDisplay);    // YA BÖYLE DİREKT FUNCTION ÇAĞIRMAK BİR SECURITY PROBLEM Mİ ÇÜNKÜ PEK GÖRMÜYORUM, BUNU Bİ SOR.
    
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
    
    // Create diary entry cell with editable content
    const entryCell = document.createElement('div');
    entryCell.className = 'diary-row__entry';
    
    const entryTextarea = document.createElement('textarea');
    entryTextarea.className = 'diary-entry__textarea';
    entryTextarea.placeholder = 'Write your diary entry here...';
    
    // Find entry for this date
    const existingEntry = getDiaryEntryByDate(dateKey);
    entryTextarea.value = existingEntry ? existingEntry.diaryEntry : '';
    entryTextarea.dataset.date = dateKey;	
    
    // Add the textarea to the entry cell
    entryCell.appendChild(entryTextarea);
    
    // Add cells to the row
    dayRow.appendChild(dateCell);
    dayRow.appendChild(entryCell);

    // Add row to the grid 
	                                
	if (dateKey < lastWeek) {																
		if (entryTextarea.value){           

			diaryGrid.appendChild(dayRow);  
		}	                                
	} else {
		diaryGrid.appendChild(dayRow);		
	}
  }
  
  // Setup autosave after rendering
  setupAutoSave();
}

// Setup autosave for diary entries
function setupAutoSave() {
  // Remove any existing listeners to avoid duplicates
  const oldGrid = document.getElementById('diaryGrid');
  const newGrid = oldGrid.cloneNode(true);
  oldGrid.parentNode.replaceChild(newGrid, oldGrid);
  
  // Add event listener to parent for delegation
  newGrid.addEventListener('input', function(e) {
    if (e.target.classList.contains('diary-entry__textarea')) {
      const dateKey = e.target.dataset.date;
      const content = e.target.value;
      
      // Use debounce to save after typing stops
      clearTimeout(e.target.saveTimeout);
      e.target.saveTimeout = setTimeout(() => {
        updateDiaryEntry(dateKey, content);
      }, 500);
    }
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

// Format date of 6 days ago to set it critical date in the if logic: YYYY-MM-DD
function formatLastWeek(date) {
	  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${(date.getDate() - 6).toString().padStart(2, '0')}`;
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

// Initialize the diary page on load
document.addEventListener("DOMContentLoaded", initDiary);