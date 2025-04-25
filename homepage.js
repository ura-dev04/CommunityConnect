document.addEventListener('DOMContentLoaded', () => {
  // Event listener for the login button
  document.querySelector('.login-btn').addEventListener('click', () => {
    window.location.href = '/login';
  });

  // Event listener for verify guest button
  document.querySelector('.verify-guest-btn').addEventListener('click', () => {
    // Direct to the verify-guest.html page which will operate in public mode
    window.location.href = '/Face-Detection-JavaScript-master/verify-guest.html';
  });

  // Add animation to feature cards when they come into view
  const featureCards = document.querySelectorAll('.feature-card');
  
  // Simple intersection observer to add animation when cards come into view
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    featureCards.forEach(card => {
      observer.observe(card);
    });
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    featureCards.forEach(card => {
      card.classList.add('animate');
    });
  }
  
  // Optional: Add click event to feature cards for more information or navigation
  featureCards.forEach(card => {
    card.addEventListener('click', function() {
      // Get the feature name from the h3 element
      const featureName = this.querySelector('h3').textContent;
      console.log(`${featureName} card clicked - could navigate to dedicated page`);
      
      // Could be expanded to navigate to specific feature pages
      // window.location.href = `features/${featureName.toLowerCase().replace(/\s+/g, '-')}.html`;
    });
  });
});
