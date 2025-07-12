import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const searchInput = document.getElementById('blog-search-input');
    const searchBtn = document.getElementById('blog-search-btn');
    const categoryBtns = document.querySelectorAll('.category-btn');
    const blogCards = document.querySelectorAll('.blog-card');
    const paginationBtns = document.querySelectorAll('.pagination-btn');
    
    // Current active category
    let activeCategory = 'all';
    let currentPage = 1;
    
    // Add event listener for search button
    searchBtn.addEventListener('click', function() {
        searchArticles();
    });
    
    // Add event listener for pressing enter in search input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchArticles();
        }
    });
    
    // Search articles function
    function searchArticles() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        // If search term is empty, restore to current category filter
        if (searchTerm === '') {
            filterByCategory(activeCategory);
            return;
        }
        
        // Hide all articles that don't match the search term
        blogCards.forEach(card => {
            const title = card.querySelector('h2').textContent.toLowerCase();
            const excerpt = card.querySelector('.blog-excerpt').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || excerpt.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
        
        // Reset pagination to first page
        setActivePage(1);
    }
    
    // Add event listeners for category buttons
    categoryBtns.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            
            // Update active button
            categoryBtns.forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Set active category and filter
            activeCategory = category;
            filterByCategory(category);
            
            // Reset pagination to first page
            setActivePage(1);
        });
    });
    
    // Filter articles by category
    function filterByCategory(category) {
        blogCards.forEach(card => {
            if (category === 'all') {
                card.style.display = 'block';
            } else {
                const categories = card.getAttribute('data-categories');
                if (categories && categories.includes(category)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            }
        });
    }
    
    // Add event listeners for pagination buttons
    paginationBtns.forEach(button => {
        button.addEventListener('click', function() {
            // Skip if current button is already active or it's the "Next" button
            if (this.classList.contains('active') || this.classList.contains('next')) {
                return;
            }
            
            if (this.classList.contains('next')) {
                // Handle next button
                if (currentPage < 3) { // Assuming 3 pages total
                    setActivePage(currentPage + 1);
                }
            } else {
                // Set active page based on button text
                const page = parseInt(this.textContent);
                setActivePage(page);
            }
        });
    });
    
    // Next button functionality
    const nextBtn = document.querySelector('.pagination-btn.next');
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (currentPage < 3) { // Assuming 3 pages total
                setActivePage(currentPage + 1);
            }
        });
    }
    
    // Set active page
    function setActivePage(page) {
        currentPage = page;
        
        // Update active page button
        paginationBtns.forEach(btn => {
            if (!btn.classList.contains('next')) {
                const btnPage = parseInt(btn.textContent);
                if (btnPage === page) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
        
        // In a real implementation, this would load different articles
        // For now, we'll just simulate page changes
        logInfo(`Navigated to page ${page}`);
    }
    
    // Add click event listeners to "Read More" links
    const readMoreLinks = document.querySelectorAll('.read-more');
    readMoreLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const articleTitle = this.closest('.blog-card').querySelector('h2').textContent;
            alert(`You clicked to read more about: ${articleTitle}`);
            // In a real implementation, this would navigate to the full article page
        });
    });
}); 