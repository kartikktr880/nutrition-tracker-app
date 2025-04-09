# Dark Mode Implementation

## Overview
The Nutrition Tracker application now includes a Dark Mode feature to improve user experience, especially during nighttime usage. This document outlines the implementation details, key files, and how to extend the dark theme to new components.

## Key Features
- System preference detection (automatically adopts OS/browser dark mode setting)
- Manual toggle in both desktop and mobile navigation
- Persistent preference storage using localStorage
- Optimized for readability and reduced eye strain
- Consistent styling across all pages and components

## Implementation Files

### CSS
- `styles/dark-mode.css`: Contains all Dark Mode specific styles and theme variables

### JavaScript
- `scripts/theme-manager.js`: Manages theme switching, preference storage, and event handling

### Components
- `components/theme-toggle.html`: Reusable theme toggle switch component
- Additional dark mode classes added to `mobile-nav.html` for mobile support

## How It Works

### Theme Variables
The dark mode implementation uses CSS variables to define two separate themes:

```css
/* Light Mode (Default) */
:root {
    --primary-color: #1A3C34;
    --background-light: #F4EDE4;
    /* other light theme variables */
}

/* Dark Mode */
:root {
    --dark-primary-color: #2a5f52;
    --dark-background: #1a1a1a;
    /* other dark theme variables */
}
```

### Toggling Themes
When a user toggles the theme or the system preference changes, the `ThemeManager` class adds or removes the `.dark-mode` class from the `body` element. CSS selectors then apply the appropriate theme:

```css
/* Light Mode */
.card {
    background-color: white;
}

/* Dark Mode */
.dark-mode .card {
    background-color: var(--dark-card-bg);
}
```

### Saving Preferences
User preferences are saved to `localStorage` using the key `nutrition_tracker_theme` with values of either `"light"` or `"dark"`.

## Adding Dark Mode to New Components

To support Dark Mode in new components:

1. Add appropriate `.dark-mode` selectors in your component CSS:

```css
.my-component {
    background-color: white;
    color: var(--text-primary);
}

.dark-mode .my-component {
    background-color: var(--dark-background-light);
    color: var(--dark-text-primary);
}
```

2. Listen for theme changes if your component needs to react dynamically:

```javascript
document.addEventListener('themeChanged', (e) => {
    const { theme } = e.detail;
    // Update your component based on the theme
});
```

## Chart.js Integration

For Chart.js graphs and visualizations, we use the theme change event to update chart colors:

```javascript
document.addEventListener('themeChanged', (e) => {
    const { theme } = e.detail;
    const isDark = theme === 'dark';
    
    // Update chart options
    chart.options.scales.x.grid.color = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    chart.options.scales.y.grid.color = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    chart.update();
});
```

## Known Limitations

- Third-party components may not fully adopt the dark theme
- PDF exports currently do not support dark mode styling
- Some images and icons may not have dark mode alternatives

## Future Improvements

- Add specific dark mode versions of logo and key imagery
- Improve contrast ratios for better accessibility
- Refine color scheme for better visual distinction in dark mode
- Add transition animations when switching themes 