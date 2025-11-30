// Quick fix for heading visibility
(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFix);
  } else {
    applyFix();
  }

  function applyFix() {
    // Find all h3 headings in the singers page
    const headings = document.querySelectorAll('h3');

    headings.forEach(heading => {
      const text = heading.textContent.trim();

      // Apply dark color to specific headings
      if (text === 'Voice Selection' || text === 'Profile Image (Optional)') {
        heading.style.color = 'rgb(15, 23, 42)'; // text-slate-900
        console.log(`Fixed heading: ${text}`);
      }
    });
  }

  // Also observe for dynamically added content
  const observer = new MutationObserver(applyFix);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
