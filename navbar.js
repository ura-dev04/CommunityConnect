// Function to load navbar component
async function loadNavbar() {
  try {
    // Fetch the navbar HTML
    const response = await fetch('navbar.html');
    const data = await response.text();
    
    // Insert the navbar HTML
    document.getElementById('navbar-container').innerHTML = data;
    
    // Initialize navbar components after insertion
    initializeNavbar();
  } catch (error) {
    console.error('Error loading navbar:', error);
  }
}

// Initialize navbar components and functionality
function initializeNavbar() {
  const welcomeMessage = document.getElementById('navbar-welcome-message');
  const userRole = document.getElementById('navbar-user-role');
  const changePasswordBtn = document.querySelector('.change-password-btn');
  
  // Get current page filename
  const currentPage = window.location.pathname.split('/').pop();
  
  // Check if user is logged in
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  
  if (loggedInUser) {
    // Parse user data
    const userData = JSON.parse(loggedInUser);
    
    // Set welcome message and role
    welcomeMessage.textContent = `Hi ${userData.name}`;
    
    let roleText = `${userData.role}`;
    if (userData.sub_role) {
      roleText += ` (${userData.sub_role})`;
    }
    
    userRole.textContent = roleText;
    
    // Show change password button only on dashboard.html (home page)
    // Use CSS class instead of display property to maintain layout
    if (currentPage !== 'dashboard.html') {
      changePasswordBtn.classList.add('hidden');
    } else {
      changePasswordBtn.classList.remove('hidden');
      
      // Add event listener to change password button
      changePasswordBtn.addEventListener('click', () => {
        // Dispatch a custom event that dashboard.js can listen for
        document.dispatchEvent(new CustomEvent('openChangePasswordModal'));
      });
    }
    
    // Handle logout button click
    document.querySelector('.logout-btn').addEventListener('click', () => {
      // Remove user data from session storage
      sessionStorage.removeItem('loggedInUser');
      // Redirect to homepage after logout
      window.location.href = 'homepage.html';
    });
    
  } else {
    // User is not logged in, redirect to login page
    window.location.href = 'login.html';
    return;
  }
}

// Load navbar when document is ready
document.addEventListener('DOMContentLoaded', loadNavbar);
