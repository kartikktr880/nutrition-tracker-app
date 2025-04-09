/**
 * Social Sharing Module
 * Handles social sharing functionality for the Nutrition Tracker app
 */
class SocialSharing {
    constructor() {
        this.shareableTypes = {
            RECIPE: 'recipe',
            PROGRESS: 'progress',
            ACHIEVEMENT: 'achievement',
            MEAL: 'meal',
            WORKOUT: 'workout'
        };
        
        this.platforms = {
            FACEBOOK: 'facebook',
            TWITTER: 'twitter',
            PINTEREST: 'pinterest',
            EMAIL: 'email',
            WHATSAPP: 'whatsapp',
            COPY_LINK: 'copy_link'
        };
        
        this.baseUrl = window.location.origin;
    }
    
    /**
     * Share content on a specific platform
     * @param {Object} content - The content to share
     * @param {string} platform - The platform to share on
     * @returns {Promise<boolean>} - Whether the sharing was successful
     */
    async share(content, platform) {
        try {
            // Check if browser supports web share API
            if (platform === 'native' && navigator.share) {
                return this.nativeShare(content);
            }
            
            switch (platform) {
                case this.platforms.FACEBOOK:
                    return this.shareOnFacebook(content);
                case this.platforms.TWITTER:
                    return this.shareOnTwitter(content);
                case this.platforms.PINTEREST:
                    return this.shareOnPinterest(content);
                case this.platforms.EMAIL:
                    return this.shareViaEmail(content);
                case this.platforms.WHATSAPP:
                    return this.shareOnWhatsApp(content);
                case this.platforms.COPY_LINK:
                    return this.copyShareLink(content);
                default:
                    console.error('Unknown sharing platform:', platform);
                    return false;
            }
        } catch (error) {
            console.error('Error sharing content:', error);
            return false;
        }
    }
    
    /**
     * Share content using the native Web Share API
     * @param {Object} content - The content to share
     * @returns {Promise<boolean>} - Whether the sharing was successful
     */
    async nativeShare(content) {
        try {
            if (!navigator.share) {
                console.error('Web Share API not supported');
                return false;
            }
            
            // Prepare share data
            const shareData = {
                title: content.title || 'Nutrition Tracker',
                text: content.description || '',
                url: content.url || window.location.href
            };
            
            await navigator.share(shareData);
            return true;
        } catch (error) {
            console.error('Error using native share:', error);
            return false;
        }
    }
    
    /**
     * Share content on Facebook
     * @param {Object} content - The content to share
     * @returns {Promise<boolean>} - Whether the sharing was successful
     */
    async shareOnFacebook(content) {
        try {
            const url = encodeURIComponent(content.url || window.location.href);
            const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            
            this.openShareWindow(shareUrl, 'Facebook');
            return true;
        } catch (error) {
            console.error('Error sharing to Facebook:', error);
            return false;
        }
    }
    
    /**
     * Share content on Twitter
     * @param {Object} content - The content to share
     * @returns {Promise<boolean>} - Whether the sharing was successful
     */
    async shareOnTwitter(content) {
        try {
            const url = encodeURIComponent(content.url || window.location.href);
            const text = encodeURIComponent(content.description || '');
            const title = encodeURIComponent(content.title || '');
            
            const shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text || title}`;
            
            this.openShareWindow(shareUrl, 'Twitter');
            return true;
        } catch (error) {
            console.error('Error sharing to Twitter:', error);
            return false;
        }
    }
    
    /**
     * Share content on Pinterest
     * @param {Object} content - The content to share
     * @returns {Promise<boolean>} - Whether the sharing was successful
     */
    async shareOnPinterest(content) {
        try {
            const url = encodeURIComponent(content.url || window.location.href);
            const description = encodeURIComponent(content.description || content.title || '');
            const media = encodeURIComponent(content.image || '');
            
            const shareUrl = `https://pinterest.com/pin/create/button/?url=${url}&media=${media}&description=${description}`;
            
            this.openShareWindow(shareUrl, 'Pinterest');
            return true;
        } catch (error) {
            console.error('Error sharing to Pinterest:', error);
            return false;
        }
    }
    
    /**
     * Share content via email
     * @param {Object} content - The content to share
     * @returns {Promise<boolean>} - Whether the sharing was successful
     */
    async shareViaEmail(content) {
        try {
            const subject = encodeURIComponent(content.title || 'Check this out from Nutrition Tracker');
            const body = encodeURIComponent(
                `${content.description || ''}\n\n${content.url || window.location.href}`
            );
            
            const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
            
            window.location.href = mailtoUrl;
            return true;
        } catch (error) {
            console.error('Error sharing via email:', error);
            return false;
        }
    }
    
    /**
     * Share content on WhatsApp
     * @param {Object} content - The content to share
     * @returns {Promise<boolean>} - Whether the sharing was successful
     */
    async shareOnWhatsApp(content) {
        try {
            const text = encodeURIComponent(
                `${content.title || ''}\n${content.description || ''}\n${content.url || window.location.href}`
            );
            
            const shareUrl = `https://wa.me/?text=${text}`;
            
            this.openShareWindow(shareUrl, 'WhatsApp');
            return true;
        } catch (error) {
            console.error('Error sharing to WhatsApp:', error);
            return false;
        }
    }
    
    /**
     * Copy share link to clipboard
     * @param {Object} content - The content to share
     * @returns {Promise<boolean>} - Whether the copy was successful
     */
    async copyShareLink(content) {
        try {
            const url = content.url || window.location.href;
            
            await navigator.clipboard.writeText(url);
            return true;
        } catch (error) {
            console.error('Error copying link:', error);
            
            // Fallback for browsers that don't support clipboard API
            try {
                const textarea = document.createElement('textarea');
                textarea.value = content.url || window.location.href;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                return true;
            } catch (fallbackError) {
                console.error('Error with clipboard fallback:', fallbackError);
                return false;
            }
        }
    }
    
    /**
     * Generate a shareable URL for content
     * @param {string} type - The type of content
     * @param {string} id - The ID of the content
     * @returns {string} - The shareable URL
     */
    generateShareUrl(type, id) {
        let path = '';
        
        switch (type) {
            case this.shareableTypes.RECIPE:
                path = `/recipes.html?id=${id}`;
                break;
            case this.shareableTypes.PROGRESS:
                path = `/dashboard.html?progress=${id}`;
                break;
            case this.shareableTypes.ACHIEVEMENT:
                path = `/profile.html?achievement=${id}`;
                break;
            case this.shareableTypes.MEAL:
                path = `/food-logger.html?meal=${id}`;
                break;
            case this.shareableTypes.WORKOUT:
                path = `/activity-tracker.html?workout=${id}`;
                break;
            default:
                path = '/';
        }
        
        return `${this.baseUrl}${path}`;
    }
    
    /**
     * Generate share content for a recipe
     * @param {Object} recipe - The recipe to share
     * @returns {Object} - The shareable content
     */
    generateRecipeShareContent(recipe) {
        if (!recipe) return null;
        
        const url = this.generateShareUrl(this.shareableTypes.RECIPE, recipe.id);
        
        return {
            title: `Recipe: ${recipe.name}`,
            description: recipe.description || `Check out this ${recipe.name} recipe with ${Math.round(recipe.nutrition.calories)} calories per serving!`,
            url: url,
            image: recipe.image || null,
            type: this.shareableTypes.RECIPE
        };
    }
    
    /**
     * Generate share content for progress data
     * @param {Object} progressData - The progress data to share
     * @returns {Object} - The shareable content
     */
    generateProgressShareContent(progressData) {
        if (!progressData) return null;
        
        const url = this.generateShareUrl(this.shareableTypes.PROGRESS, progressData.id);
        
        return {
            title: `My Nutrition Progress`,
            description: `I've tracked ${progressData.days} days of nutrition data with Nutrition Tracker! Average daily calories: ${Math.round(progressData.averageCalories)}`,
            url: url,
            image: progressData.chartImage || null,
            type: this.shareableTypes.PROGRESS
        };
    }
    
    /**
     * Generate share content for an achievement
     * @param {Object} achievement - The achievement to share
     * @returns {Object} - The shareable content
     */
    generateAchievementShareContent(achievement) {
        if (!achievement) return null;
        
        const url = this.generateShareUrl(this.shareableTypes.ACHIEVEMENT, achievement.id);
        
        return {
            title: `I Earned an Achievement!`,
            description: `I just earned the "${achievement.name}" achievement in Nutrition Tracker: ${achievement.description}`,
            url: url,
            image: achievement.image || null,
            type: this.shareableTypes.ACHIEVEMENT
        };
    }
    
    /**
     * Generate share content for a workout
     * @param {Object} workout - The workout to share
     * @returns {Object} - The shareable content
     */
    generateWorkoutShareContent(workout) {
        if (!workout) return null;
        
        const url = this.generateShareUrl(this.shareableTypes.WORKOUT, workout.id);
        
        return {
            title: `My Workout`,
            description: `I just completed a ${workout.duration} minute ${workout.type} workout and burned ${Math.round(workout.caloriesBurned)} calories!`,
            url: url,
            image: null,
            type: this.shareableTypes.WORKOUT
        };
    }
    
    /**
     * Open a popup window for sharing
     * @param {string} url - The URL to open
     * @param {string} title - The window title
     * @private
     */
    openShareWindow(url, title) {
        const width = 600;
        const height = 400;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        window.open(
            url,
            title,
            `width=${width},height=${height},top=${top},left=${left},toolbar=0,location=0,menubar=0,status=0`
        );
    }
    
    /**
     * Show the share modal
     * @param {Object} content - The content to share
     */
    showShareModal(content) {
        // Find the share modal element
        const modal = document.getElementById('share-modal');
        if (!modal) {
            console.error('Share modal element not found');
            return;
        }
        
        // Get references to modal elements
        const titleElement = modal.querySelector('#share-title');
        const descriptionElement = modal.querySelector('#share-description');
        const imageElement = modal.querySelector('#share-image');
        
        // Update modal content
        if (titleElement) titleElement.textContent = content.title || '';
        if (descriptionElement) descriptionElement.textContent = content.description || '';
        
        if (imageElement) {
            if (content.image) {
                imageElement.src = content.image;
                imageElement.style.display = 'block';
            } else {
                imageElement.style.display = 'none';
            }
        }
        
        // Set up platform buttons
        const platformButtons = modal.querySelectorAll('.share-platform-btn');
        platformButtons.forEach(button => {
            const platform = button.dataset.platform;
            const originalClickHandler = button.onclick;
            
            // Remove existing click handler
            if (originalClickHandler) {
                button.removeEventListener('click', originalClickHandler);
            }
            
            // Add new click handler
            button.addEventListener('click', async () => {
                const success = await this.share(content, platform);
                
                if (success) {
                    this.hideShareModal();
                    
                    if (platform === this.platforms.COPY_LINK) {
                        this.showNotification('Link copied to clipboard!');
                    } else {
                        this.showNotification('Shared successfully!');
                    }
                } else {
                    this.showNotification('Failed to share. Please try again.', true);
                }
            });
        });
        
        // Show the modal
        modal.classList.add('active');
    }
    
    /**
     * Hide the share modal
     */
    hideShareModal() {
        const modal = document.getElementById('share-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    /**
     * Show a notification
     * @param {string} message - The notification message
     * @param {boolean} isError - Whether it's an error notification
     */
    showNotification(message, isError = false) {
        const notification = document.createElement('div');
        notification.className = `notification ${isError ? 'error' : 'success'}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Create and export singleton instance
const socialSharing = new SocialSharing();
export default socialSharing; 