// Injects the shared sidebar into the #sidebar-container element on each page
fetch('components/sidebar.html')
  .then(response => response.text())
  .then(html => {
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
          hamburger.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
        function closeSidebar() {
          sidebar.style.transform = 'translateX(-100%)';
          overlay.style.display = 'none';
          overlay.style.opacity = '0';
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
        hamburger.onclick = toggleSidebar;
        overlay.onclick = closeSidebar;
      } else {
        // On desktop, show sidebar by default
        sidebar.style.transform = 'none';
        sidebar.style.position = 'fixed';
        sidebar.style.left = '0';
        sidebar.style.top = '0';
        sidebar.style.zIndex = '3000';
        // Do not set height, background, outline, or overflow here
      }
    }
  }); 