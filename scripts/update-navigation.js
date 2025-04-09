// Simple navigation update script for Nutrition Tracker

document.addEventListener('DOMContentLoaded', function() {
    // Add header content to header container
    const headerContainer = document.getElementById('header-container');
    
    if (headerContainer) {
        headerContainer.innerHTML = `
            <div class="logo">
                <a href="index.html">
                    <img src="images/logo.png" alt="Nutrition Tracker" onerror="this.src='images/logo-placeholder.png';">
                    <span>Nutrition Tracker</span>
                </a>
            </div>
            
            <nav>
                <ul class="nav-menu">
                    <li><a href="index.html" class="nav-link active">Home</a></li>
                    <li><a href="dashboard.html" class="nav-link">Dashboard</a></li>
                    <li><a href="food-log.html" class="nav-link">Food Log</a></li>
                    <li><a href="meal-planner.html" class="nav-link">Meal Planner</a></li>
                    <li><a href="recipes.html" class="nav-link">Recipes</a></li>
                    <li><a href="reports.html" class="nav-link">Reports</a></li>
                </ul>
            </nav>
            
            <div class="nav-right">
                <a href="login.html" class="btn btn-secondary nav-cta-button">Log In</a>
                <a href="signup.html" class="btn btn-primary nav-cta-button">Sign Up</a>
                <div class="lang-selector">
                    <select id="language-selector">
                        <option value="en">EN</option>
                        <option value="es">ES</option>
                        <option value="fr">FR</option>
                        <option value="de">DE</option>
                    </select>
                </div>
                <button class="menu-toggle" aria-label="Toggle menu">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        `;
    }
    
    // Handle header scroll effect
    const header = document.querySelector('.header');
    let lastScrollPosition = 0;
    
    function handleScroll() {
        if (!header) return;
        
        const scrollPosition = window.scrollY;
        
        // Add scrolled class when scrolled down
        if (scrollPosition > 50) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
        
        // Hide header when scrolling down, show when scrolling up
        if (scrollPosition > lastScrollPosition && scrollPosition > 200) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
        
        lastScrollPosition = scrollPosition;
    }
    
    window.addEventListener('scroll', handleScroll);
    
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
    
    // Language selector functionality
    const languageSelector = document.getElementById('language-selector');
    if (languageSelector) {
        languageSelector.addEventListener('change', function() {
            // For demonstration - in a real app, this would change the language
            console.log('Language changed to:', this.value);
        });
    }
}); 