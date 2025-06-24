export class AnimationUtils {
    private static readonly ANIMATION_PRESETS = {
        fade: {
            keyframes: [
                { opacity: 0 },
                { opacity: 1 }
            ],
            options: {
                duration: 300,
                easing: 'ease-in-out'
            }
        },
        slideIn: {
            keyframes: [
                { transform: 'translateX(-100%)' },
                { transform: 'translateX(0)' }
            ],
            options: {
                duration: 400,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            }
        },
        slideOut: {
            keyframes: [
                { transform: 'translateX(0)' },
                { transform: 'translateX(100%)' }
            ],
            options: {
                duration: 400,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            }
        },
        scale: {
            keyframes: [
                { transform: 'scale(0.8)', opacity: 0 },
                { transform: 'scale(1)', opacity: 1 }
            ],
            options: {
                duration: 300,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            }
        },
        bounce: {
            keyframes: [
                { transform: 'scale(0.3)', opacity: 0 },
                { transform: 'scale(1.1)', opacity: 1 },
                { transform: 'scale(0.9)', opacity: 1 },
                { transform: 'scale(1)', opacity: 1 }
            ],
            options: {
                duration: 600,
                easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            }
        },
        shake: {
            keyframes: [
                { transform: 'translateX(0)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(0)' }
            ],
            options: {
                duration: 500,
                easing: 'ease-in-out'
            }
        }
    } as const;

    private static activeAnimations: Map<Element, Animation> = new Map();
    private static previewContainer: HTMLElement | null = null;

    private static animationQueue: Map<Element, Array<{
        preset: keyof typeof this.ANIMATION_PRESETS;
        options?: Partial<KeyframeAnimationOptions>;
    }>> = new Map();

    private static isProcessingQueue: boolean = false;

    static animate(
        element: Element,
        preset: keyof typeof this.ANIMATION_PRESETS,
        options: Partial<KeyframeAnimationOptions> = {}
    ): Animation {
        const presetConfig = this.ANIMATION_PRESETS[preset];
        const mergedOptions = {
            ...presetConfig.options,
            ...options
        };

        const animation = element.animate(presetConfig.keyframes, mergedOptions);
        this.activeAnimations.set(element, animation);

        animation.onfinish = () => {
            this.activeAnimations.delete(element);
        };

        return animation;
    }

    static stopAnimation(element: Element): void {
        const animation = this.activeAnimations.get(element);
        if (animation) {
            animation.cancel();
            this.activeAnimations.delete(element);
        }
    }

    static stopAllAnimations(): void {
        this.activeAnimations.forEach(animation => animation.cancel());
        this.activeAnimations.clear();
    }

    static previewAnimation(preset: keyof typeof this.ANIMATION_PRESETS): void {
        if (!this.previewContainer) {
            this.createPreviewContainer();
        }

        const previewElement = document.createElement('div');
        previewElement.className = 'animation-preview-element';
        previewElement.style.width = '100px';
        previewElement.style.height = '100px';
        previewElement.style.backgroundColor = '#3498db';
        previewElement.style.borderRadius = '8px';
        previewElement.style.margin = '20px';

        this.previewContainer.appendChild(previewElement);
        this.animate(previewElement, preset);

        // Remove preview element after animation
        setTimeout(() => {
            previewElement.remove();
        }, this.ANIMATION_PRESETS[preset].options.duration + 100);
    }

    private static createPreviewContainer(): void {
        this.previewContainer = document.createElement('div');
        this.previewContainer.className = 'animation-preview-container';
        this.previewContainer.style.position = 'fixed';
        this.previewContainer.style.bottom = '20px';
        this.previewContainer.style.right = '20px';
        this.previewContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.previewContainer.style.padding = '20px';
        this.previewContainer.style.borderRadius = '8px';
        this.previewContainer.style.zIndex = '1000';
        document.body.appendChild(this.previewContainer);
    }

    static getAvailablePresets(): string[] {
        return Object.keys(this.ANIMATION_PRESETS);
    }

    static createCustomAnimation(
        element: Element,
        keyframes: Keyframe[],
        options: KeyframeAnimationOptions
    ): Animation {
        const animation = element.animate(keyframes, options);
        this.activeAnimations.set(element, animation);

        animation.onfinish = () => {
            this.activeAnimations.delete(element);
        };

        return animation;
    }

    static isAnimating(element: Element): boolean {
        return this.activeAnimations.has(element);
    }

    static getAnimationProgress(element: Element): number {
        const animation = this.activeAnimations.get(element);
        if (!animation) return 0;
        return animation.currentTime ? animation.currentTime / animation.effect!.getComputedTiming().duration : 0;
    }

    static pauseAnimation(element: Element): void {
        const animation = this.activeAnimations.get(element);
        if (animation) {
            animation.pause();
        }
    }

    static resumeAnimation(element: Element): void {
        const animation = this.activeAnimations.get(element);
        if (animation) {
            animation.play();
        }
    }

    static reverseAnimation(element: Element): void {
        const animation = this.activeAnimations.get(element);
        if (animation) {
            animation.reverse();
        }
    }

    static queueAnimation(
        element: Element,
        preset: keyof typeof this.ANIMATION_PRESETS,
        options?: Partial<KeyframeAnimationOptions>
    ): void {
        if (!this.animationQueue.has(element)) {
            this.animationQueue.set(element, []);
        }

        this.animationQueue.get(element)!.push({ preset, options });
        this.processAnimationQueue(element);
    }

    private static async processAnimationQueue(element: Element): Promise<void> {
        if (this.isProcessingQueue || !this.animationQueue.has(element)) return;

        this.isProcessingQueue = true;
        const queue = this.animationQueue.get(element)!;

        while (queue.length > 0) {
            const { preset, options } = queue[0];
            const animation = this.animate(element, preset, options);

            await new Promise<void>(resolve => {
                animation.onfinish = () => {
                    queue.shift();
                    resolve();
                };
            });
        }

        this.animationQueue.delete(element);
        this.isProcessingQueue = false;
    }

    static clearAnimationQueue(element: Element): void {
        this.animationQueue.delete(element);
        this.stopAnimation(element);
    }

    static getQueuedAnimations(element: Element): number {
        return this.animationQueue.get(element)?.length || 0;
    }

    static isQueueProcessing(): boolean {
        return this.isProcessingQueue;
    }
} 