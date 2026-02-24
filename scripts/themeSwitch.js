// themeSwitch.js – unified theme management for light, dark, summer, winter

document.addEventListener('DOMContentLoaded', function() {
  const themeSelect = document.getElementById('theme-select');
  if (!themeSelect) return; // exit if dropdown not present (e.g., on other pages)

  // List of all theme classes
  const themeClasses = ['light-theme', 'dark-theme', 'summer-theme', 'winter-theme'];

  // Function to set a theme on <body>
  function setTheme(theme) {
    // Remove all theme classes
    themeClasses.forEach(cls => document.body.classList.remove(cls));
    // Add the new theme class
    document.body.classList.add(theme);
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }

  // Set dropdown initial value from saved theme
  const savedTheme = localStorage.getItem('theme');
  const initialTheme = savedTheme && themeClasses.includes(savedTheme) ? savedTheme : 'light-theme';
  themeSelect.value = initialTheme;

  // Listen for dropdown changes
  themeSelect.addEventListener('change', function(e) {
    const newTheme = e.target.value;
    setTheme(newTheme);
  });
});