// Handle feature box navigation
document.querySelectorAll('.feature-box').forEach(box => {
  box.addEventListener('click', () => {
    const target = box.getAttribute('data-target');
    if (target) {
      window.location.href = target;
    }
  });
});

// Handle logout button click
document.querySelector('.logout-btn').addEventListener('click', () => {
  alert('Logout functionality will be implemented soon!');
  // Redirect to homepage after logout
  window.location.href = 'homepage.html';
});
