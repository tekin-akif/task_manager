// On page load, check if a theme was previously saved
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
document.body.classList.add(savedTheme);
}

// The function to toggle and SAVE the theme
function themeSwitch() {
	const body = document.body;
	if (body.classList.contains('dark-theme')) {
		body.classList.remove('dark-theme');
		localStorage.setItem('theme', 'light-theme'); // Save choice
	} else {
		body.classList.add('dark-theme');
		localStorage.setItem('theme', 'dark-theme'); // Save choice
	}
}