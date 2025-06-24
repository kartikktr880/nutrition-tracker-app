// Footer Injection Script
// Premium, grouped, and centered structure

document.addEventListener('DOMContentLoaded', function() {
    const footerContainer = document.getElementById('footer-container');
    if (!footerContainer) return;
    
    footerContainer.innerHTML = `
    <footer class="footer">
        <div class="footer-container">
            <!-- Top: Logo, Description, Social -->
            <div class="footer-top">
                <div class="footer-logo">
                    <img src="images/logo.svg" alt="NutriTrack Logo" onerror="this.src='https://placehold.co/40x40/1A3C34/FFFFFF?text=NT'">
                    <span class="footer-logo-text">NutriTrack</span>
                </div>
                <p class="footer-description">
                    Your all-in-one solution to track your nutrition, plan your meals, and achieve your health goals with AI-powered insights.
                </p>
                <div class="footer-social">
                    <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
                    <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                    <a href="#" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
                </div>
            </div>
            <!-- Columns -->
            <div class="footer-columns">
                <div class="footer-column">
                    <h3>Features</h3>
                    <ul class="footer-links">
                        <li><a href="#"><i class="fas fa-utensils"></i> Food Tracking</a></li>
                        <li><a href="#"><i class="fas fa-calculator"></i> Nutrition Analysis</a></li>
                        <li><a href="#"><i class="fas fa-chart-line"></i> Progress Tracking</a></li>
                        <li><a href="#"><i class="fas fa-calendar-alt"></i> Meal Planning</a></li>
                        <li><a href="#"><i class="fas fa-users"></i> Community Support</a></li>
                    </ul>
                </div>
                <div class="footer-column">
                    <h3>Company</h3>
                    <ul class="footer-links">
                        <li><a href="#"><i class="fas fa-info-circle"></i> About Us</a></li>
                        <li><a href="#"><i class="fas fa-briefcase"></i> Careers</a></li>
                        <li><a href="#"><i class="fas fa-newspaper"></i> Press</a></li>
                        <li><a href="#"><i class="fas fa-handshake"></i> Partners</a></li>
                        <li><a href="#"><i class="fas fa-envelope"></i> Contact Us</a></li>
                    </ul>
                </div>
                <div class="footer-column">
                    <h3>Resources</h3>
                    <ul class="footer-links">
                        <li><a href="#"><i class="fas fa-book"></i> Blog</a></li>
                        <li><a href="#"><i class="fas fa-question-circle"></i> FAQs</a></li>
                        <li><a href="#"><i class="fas fa-headset"></i> Support</a></li>
                        <li><a href="#"><i class="fas fa-graduation-cap"></i> Tutorials</a></li>
                        <li><a href="#"><i class="fas fa-file-alt"></i> Documentation</a></li>
                    </ul>
                </div>
                <div class="footer-column">
                    <h3>Legal</h3>
                    <ul class="footer-links">
                        <li><a href="#"><i class="fas fa-shield-alt"></i> Privacy Policy</a></li>
                        <li><a href="#"><i class="fas fa-gavel"></i> Terms of Service</a></li>
                        <li><a href="#"><i class="fas fa-cookie"></i> Cookie Policy</a></li>
                        <li><a href="#"><i class="fas fa-user-shield"></i> GDPR</a></li>
                        <li><a href="#"><i class="fas fa-balance-scale"></i> Legal Notice</a></li>
                    </ul>
                </div>
            </div>
            <!-- Bottom: Copyright & Links -->
            <div class="footer-bottom-row">
                <div class="footer-bottom">
                    <p>&copy; ${new Date().getFullYear()} NutriTrack. All rights reserved.</p>
                </div>
                <div class="footer-bottom-links">
                    <a href="#">Privacy</a>
                    <a href="#">Terms</a>
                    <a href="#">Cookies</a>
                    <a href="#">Contact</a>
                </div>
            </div>
        </div>
    </footer>
    `;
}); 