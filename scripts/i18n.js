import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Internationalization Manager
 * Handles language selection and translation
 */
class I18nManager {
    constructor() {
        this.translations = {};
        this.currentLanguage = 'en';
        this.defaultLanguage = 'en';
        this.availableLanguages = ['en', 'es', 'fr'];
        this.init();
    }

    /**
     * Initialize the internationalization system
     */
    async init() {
        // Load saved language preference or use browser language
        const savedLanguage = localStorage.getItem('preferredLanguage');
        
        if (savedLanguage && this.availableLanguages.includes(savedLanguage)) {
            this.currentLanguage = savedLanguage;
        } else {
            // Try to use browser language if available
            const browserLang = navigator.language.split('-')[0];
            if (this.availableLanguages.includes(browserLang)) {
                this.currentLanguage = browserLang;
            }
        }
        
        try {
            // Load default language first as fallback
            await this.loadTranslations(this.defaultLanguage);
            
            // If current language is different from default, load it
            if (this.currentLanguage !== this.defaultLanguage) {
                await this.loadTranslations(this.currentLanguage);
            }
            
            // Update content with loaded translations
            this.updateContent();
            
            logInfo(`Internationalization initialized with language: ${this.currentLanguage}`);
        } catch (error) {
            logError('Failed to initialize internationalization:', error);
        }
    }

    /**
     * Load translations for a specific language
     * @param {string} language - Language code (e.g., 'en', 'es')
     */
    async loadTranslations(language) {
        try {
            const response = await fetch(`translations/${language}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load translations for ${language}`);
            }
            
            const data = await response.json();
            this.translations[language] = data;
            
            logInfo(`Loaded translations for ${language}`);
            return data;
        } catch (error) {
            logError(`Error loading translations for ${language}:`, error);
            
            // Create a minimal translation file for demo purposes
            if (language === 'en') {
                this.translations.en = {
                    nav: {
                        home: 'Home',
                        dashboard: 'Dashboard',
                        foodLog: 'Food Log',
                        mealPlanner: 'Meal Planner',
                        recipes: 'Recipes',
                        reports: 'Reports',
                        profile: 'Profile',
                        settings: 'Settings',
                        logout: 'Logout',
                        login: 'Login',
                        signup: 'Sign Up'
                    },
                    footer: {
                        description: 'Your personal nutrition companion. Track meals, analyze nutrients, and reach your health goals.',
                        features: 'Features',
                        dashboard: 'Dashboard',
                        foodLog: 'Food Log',
                        mealPlanner: 'Meal Planner',
                        reports: 'Reports',
                        recipes: 'Recipes',
                        resources: 'Resources',
                        blog: 'Blog',
                        guides: 'Guides',
                        faq: 'FAQ',
                        support: 'Support',
                        api: 'API',
                        company: 'Company',
                        about: 'About Us',
                        careers: 'Careers',
                        press: 'Press',
                        contact: 'Contact',
                        partners: 'Partners',
                        legal: 'Legal',
                        terms: 'Terms of Service',
                        privacy: 'Privacy Policy',
                        cookies: 'Cookie Policy',
                        disclaimer: 'Disclaimer',
                        rights: 'All rights reserved.'
                    }
                };
            }
            
            if (language === 'es') {
                this.translations.es = {
                    nav: {
                        home: 'Inicio',
                        dashboard: 'Panel',
                        foodLog: 'Registro de Alimentos',
                        mealPlanner: 'Planificador de Comidas',
                        recipes: 'Recetas',
                        reports: 'Informes',
                        profile: 'Perfil',
                        settings: 'Ajustes',
                        logout: 'Cerrar Sesión',
                        login: 'Iniciar Sesión',
                        signup: 'Registrarse'
                    },
                    footer: {
                        description: 'Tu compañero de nutrición personal. Registra comidas, analiza nutrientes y alcanza tus metas de salud.',
                        features: 'Características',
                        dashboard: 'Panel',
                        foodLog: 'Registro de Alimentos',
                        mealPlanner: 'Planificador de Comidas',
                        reports: 'Informes',
                        recipes: 'Recetas',
                        resources: 'Recursos',
                        blog: 'Blog',
                        guides: 'Guías',
                        faq: 'Preguntas Frecuentes',
                        support: 'Soporte',
                        api: 'API',
                        company: 'Compañía',
                        about: 'Acerca de Nosotros',
                        careers: 'Empleos',
                        press: 'Prensa',
                        contact: 'Contacto',
                        partners: 'Socios',
                        legal: 'Legal',
                        terms: 'Términos de Servicio',
                        privacy: 'Política de Privacidad',
                        cookies: 'Política de Cookies',
                        disclaimer: 'Aviso Legal',
                        rights: 'Todos los derechos reservados.'
                    }
                };
            }

            throw error;
        }
    }

    /**
     * Change the current language
     * @param {string} language - Language code to change to
     */
    async changeLanguage(language) {
        if (!this.availableLanguages.includes(language)) {
            logError(`Language ${language} is not available`);
            return;
        }
        
        // If translations for this language haven't been loaded yet
        if (!this.translations[language]) {
            try {
                await this.loadTranslations(language);
            } catch (error) {
                logError(`Failed to change language to ${language}:`, error);
                return;
            }
        }
        
        this.currentLanguage = language;
        localStorage.setItem('preferredLanguage', language);
        
        // Update all translated content
        this.updateContent();
        
        // Update language selection UI
        this.updateLanguageSelectionUI();
        
        logInfo(`Language changed to ${language}`);
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language } 
        }));
    }

    /**
     * Get a translation value
     * @param {string} key - Dot notation key for translation (e.g., 'nav.home')
     * @returns {string} Translated text or key if not found
     */
    get(key) {
        // Split key into parts (e.g., 'nav.home' -> ['nav', 'home'])
        const parts = key.split('.');
        
        // Get translations for current language
        let translations = this.translations[this.currentLanguage];
        
        // If not found, try default language
        if (!translations) {
            translations = this.translations[this.defaultLanguage];
        }
        
        // Navigate through the translation object
        for (const part of parts) {
            if (!translations || typeof translations !== 'object') {
                return key; // Return the key if not found
            }
            translations = translations[part];
        }
        
        // Return the translation or the key if not found
        return translations || key;
    }

    /**
     * Update all elements with data-i18n attribute
     */
    updateContent() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.get(key);
        });
        
        // Update placeholder attributes
        const inputElements = document.querySelectorAll('[data-i18n-placeholder]');
        inputElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.setAttribute('placeholder', this.get(key));
        });
        
        // Update title attributes
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.setAttribute('title', this.get(key));
        });
    }

    /**
     * Update language selection UI elements
     */
    updateLanguageSelectionUI() {
        // Update language selection dropdowns
        const langSelectors = document.querySelectorAll('.lang-selector select, #footer-language-selector');
        langSelectors.forEach(select => {
            if (select) {
                select.value = this.currentLanguage;
            }
        });
        
        // Update current language display
        const currentLangElements = document.querySelectorAll('#currentLang');
        currentLangElements.forEach(element => {
            if (element) {
                element.textContent = this.currentLanguage.toUpperCase();
            }
        });
        
        // Update language items in dropdowns
        const langItems = document.querySelectorAll('.lang-item');
        langItems.forEach(item => {
            const itemLang = item.getAttribute('data-lang');
            if (itemLang === this.currentLanguage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// Initialize the internationalization system
window.i18n = new I18nManager(); 