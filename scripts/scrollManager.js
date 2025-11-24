
(() => {
  // Save scroll position
  window.addEventListener("beforeunload", () => {
    const path = window.location.pathname;
    const scrollPositions = JSON.parse(localStorage.getItem("scrollPositions") || "{}");
    scrollPositions[path] = window.scrollY;
    localStorage.setItem("scrollPositions", JSON.stringify(scrollPositions));
  });

  // Improved restoration logic
  const restoreScroll = () => {
    const path = window.location.pathname;
    const scrollPositions = JSON.parse(localStorage.getItem("scrollPositions") || "{}");
    const targetY = scrollPositions[path] || 0;

    // Wait for dynamic content to stabilize
    const observer = new MutationObserver(() => {
  const calendarReady = document.getElementById("calGrid")?.children.length > 0;
  const overdueReady = document.getElementById("overdueGrid")?.children.length > 0;
  const planningReady = document.getElementById("planningGrid")?.children.length > 1; // >1 to skip empty line

  if (calendarReady || overdueReady || planningReady) {
    window.scrollTo(0, targetY);
    observer.disconnect();
  }
});

    // Observe the main content area
    observer.observe(document.querySelector("main"), {
      childList: true,
      subtree: true
    });
  };

  window.addEventListener("DOMContentLoaded", restoreScroll);
})();