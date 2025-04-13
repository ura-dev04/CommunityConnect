// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
  const welcomeMessage = document.getElementById('welcome-message');
  const userRole = document.getElementById('user-role');
  
  // Check if user is logged in
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  
  if (!loggedInUser) {
    // User is not logged in, redirect to login page
    window.location.href = 'login.html';
    return;
  }
  
  // User is logged in, display welcome message and role
  const userData = JSON.parse(loggedInUser);
  welcomeMessage.textContent = `Hi ${userData.name}`;
  
  let roleText = `${userData.role}`;
  if (userData.sub_role) {
    roleText += ` (${userData.sub_role})`;
  }
  
  userRole.textContent = roleText;
});

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
  // Remove user data from session storage
  sessionStorage.removeItem('loggedInUser');
  // Redirect to homepage after logout
  window.location.href = 'homepage.html';
});
