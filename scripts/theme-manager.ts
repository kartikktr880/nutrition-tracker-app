class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: 'light' | 'dark';
  private themeToggle: HTMLElement | null = null;

  private constructor() {
    this.currentTheme = this.getInitialTheme();
    this.init();
  }

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  private getInitialTheme(): 'light' | 'dark' {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  private init(): void {
    // Apply initial theme
    this.applyTheme(this.currentTheme);

    // Set up theme toggle
    this.themeToggle = document.getElementById('theme-toggle');
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    localStorage.setItem('theme', theme);

    // Update toggle button if it exists
    if (this.themeToggle) {
      this.themeToggle.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
      this.themeToggle.innerHTML = this.getThemeIcon(theme);
    }
  }

  private getThemeIcon(theme: 'light' | 'dark'): string {
    return theme === 'light'
      ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>'
      : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>';
  }

  public toggleTheme(): void {
    this.applyTheme(this.currentTheme === 'light' ? 'dark' : 'light');
  }

  public getCurrentTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }
}

// Initialize theme manager
const themeManager = ThemeManager.getInstance();

// Export for use in other files
export default themeManager; 