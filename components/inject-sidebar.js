// Injects the shared sidebar into the #sidebar-container element on each page
fetch('components/sidebar.html')
  .then(response => response.text())
  .then(html => {
    // Only inject sidebar for mobile/tablet (≤991px)
    if (window.innerWidth <= 991) {
    const container = document.getElementById('sidebar-container');
    if (container) {
      container.innerHTML = html;

      // Remove all debug/override styles from navLinks and sidebar
      // (Let CSS handle scroll and appearance)

      // Sidebar initial state
      const sidebar = container.querySelector('.side-nav');
      // Do not override sidebar.style.overflow, height, background, outline, etc.
      // Only handle transform and zIndex for open/close
      sidebar.style.transform = 'translateX(-100%)';
      sidebar.style.transition = 'transform 0.3s cubic-bezier(0.19,1,0.22,1)';
      sidebar.style.zIndex = '3000';
      sidebar.style.position = 'fixed';
      sidebar.style.left = '0';
      // Do not set height, background, outline, or overflow here

      // Remove any existing hamburger/overlay to avoid duplicates
      document.querySelectorAll('.mobile-menu-toggle, .mobile-nav-overlay').forEach(el => el.remove());

      // Only add hamburger and overlay on mobile/tablet
      if (window.innerWidth <= 991) {
        // Create hamburger button
        const hamburger = document.createElement('button');
        hamburger.className = 'mobile-menu-toggle';
        hamburger.setAttribute('aria-label', 'Open navigation');
        hamburger.innerHTML = '<span></span><span></span><span></span>';
        hamburger.style.position = 'fixed';
        hamburger.style.top = '10px';
        hamburger.style.left = '18px';
        hamburger.style.zIndex = '3100';
        hamburger.style.background = 'none';
        hamburger.style.border = 'none';
        hamburger.style.display = 'flex';
        hamburger.style.flexDirection = 'column';
        hamburger.style.justifyContent = 'center';
        hamburger.style.alignItems = 'center';
        hamburger.style.width = '40px';
        hamburger.style.height = '40px';
        hamburger.style.cursor = 'pointer';
        hamburger.querySelectorAll('span').forEach(span => {
          span.style.display = 'block';
          span.style.width = '24px';
          span.style.height = '3px';
          span.style.background = '#fff3e6';
          span.style.margin = '3px 0';
          span.style.borderRadius = '2px';
          span.style.transition = 'all 0.3s';
        });
        document.body.appendChild(hamburger);

        // Create close (cross) button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'sidebar-close-btn';
        closeBtn.setAttribute('aria-label', 'Close navigation');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.position = 'fixed';
        closeBtn.style.top = '10px';
        closeBtn.style.right = '18px';
        closeBtn.style.zIndex = '3101';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#fff3e6';
        closeBtn.style.fontSize = '2.2rem';
        closeBtn.style.fontWeight = 'bold';
        closeBtn.style.display = 'none';
        closeBtn.style.cursor = 'pointer';
        document.body.appendChild(closeBtn);

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'mobile-nav-overlay';
        overlay.style.display = 'none';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '2999';
        overlay.style.transition = 'opacity 0.3s';
        document.body.appendChild(overlay);

        // Toggle logic
        function openSidebar() {
          sidebar.style.transform = 'translateX(0)';
          sidebar.style.zIndex = '3000';
          sidebar.style.position = 'fixed';
          overlay.style.display = 'block';
          overlay.style.opacity = '1';
          hamburger.style.display = 'none';
          closeBtn.style.display = 'block';
          hamburger.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
        function closeSidebar() {
          sidebar.style.transform = 'translateX(-100%)';
          overlay.style.display = 'none';
          overlay.style.opacity = '0';
          hamburger.style.display = 'flex';
          closeBtn.style.display = 'none';
          hamburger.classList.remove('active');
          document.body.style.overflow = '';
        }
        function toggleSidebar() {
          if (sidebar.style.transform === 'translateX(0)') {
            closeSidebar();
          } else {
            openSidebar();
          }
        }
        hamburger.onclick = openSidebar;
        closeBtn.onclick = closeSidebar;
        overlay.onclick = closeSidebar;

        // Hide hamburger and close button on scroll down, show on scroll up
        let lastScrollY = window.scrollY;
        let ticking = false;
        function handleScroll() {
          if (!ticking) {
            window.requestAnimationFrame(() => {
              const currentScrollY = window.scrollY;
              if (currentScrollY > lastScrollY) {
                // Scrolling down
                hamburger.style.display = 'none';
                closeBtn.style.display = 'none';
              } else {
                // Scrolling up
                if (sidebar.style.transform !== 'translateX(0)') {
                  hamburger.style.display = 'flex';
                  closeBtn.style.display = 'none';
                } else {
                  hamburger.style.display = 'none';
                  closeBtn.style.display = 'block';
                }
              }
              lastScrollY = currentScrollY;
              ticking = false;
            });
            ticking = true;
          }
        }
        window.addEventListener('scroll', handleScroll);
      } else {
        // On desktop, show sidebar by default
        sidebar.style.transform = 'none';
        sidebar.style.position = 'fixed';
        sidebar.style.left = '0';
        sidebar.style.top = '0';
        sidebar.style.zIndex = '3000';
        // Do not set height, background, outline, or overflow here
      }

      // Highlight the active sidebar link based on current page
      const currentPath = window.location.pathname.split('/').pop();
      const sidebarLinks = container.querySelectorAll('.sidebar-link a');
      sidebarLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath || (linkPath === 'index.html' && (currentPath === '' || currentPath === 'index.html'))) {
          link.classList.add('active');
        }
      });
    }
    }
    // For desktop (≥992px), do not inject or render the sidebar at all
  }); 