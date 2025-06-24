/**
 * Script Loader
 * Manages script loading order and dependencies
 */
class ScriptLoader {
    constructor() {
        this.loadedScripts = new Set();
        this.loadingScripts = new Map();
    }

    /**
     * Load a script with dependencies
     * @param {string} src - Script source
     * @param {string[]} dependencies - Array of script dependencies
     * @returns {Promise} - Promise that resolves when script is loaded
     */
    async loadScript(src, dependencies = []) {
        // Check if already loaded
        if (this.loadedScripts.has(src)) {
            return Promise.resolve();
        }

        // Check if currently loading
        if (this.loadingScripts.has(src)) {
            return this.loadingScripts.get(src);
        }

        // Load dependencies first
        const dependencyPromises = dependencies.map(dep => this.loadScript(dep));
        await Promise.all(dependencyPromises);

        // Create loading promise
        const loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Maintain execution order

            script.onload = () => {
                this.loadedScripts.add(src);
                this.loadingScripts.delete(src);
                resolve();
            };

            script.onerror = (error) => {
                this.loadingScripts.delete(src);
                reject(new Error(`Failed to load script: ${src}`));
            };

            document.head.appendChild(script);
        });

        this.loadingScripts.set(src, loadPromise);
        return loadPromise;
    }

    /**
     * Load multiple scripts in order
     * @param {Object[]} scripts - Array of script configurations
     * @returns {Promise} - Promise that resolves when all scripts are loaded
     */
    async loadScripts(scripts) {
        for (const script of scripts) {
            try {
                await this.loadScript(script.src, script.dependencies || []);
            } catch (error) {
                console.error(`Error loading script ${script.src}:`, error);
                // Continue loading other scripts even if one fails
            }
        }
    }
}

// Export for use in other scripts
window.ScriptLoader = ScriptLoader; 