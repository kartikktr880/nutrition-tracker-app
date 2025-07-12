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
        preset: keyof typeof AnimationUtils.ANIMATION_PRESETS;
        options?: Partial<KeyframeAnimationOptions>;
    }>> = new Map();

    private static isProcessingQueue: boolean = false;

    static animate(
        element: Element,
        preset: keyof typeof AnimationUtils.ANIMATION_PRESETS,
        options: Partial<KeyframeAnimationOptions> = {}
    ): Animation {
        const presetConfig = AnimationUtils.ANIMATION_PRESETS[preset];
        const mergedOptions = {
            ...presetConfig.options,
            ...options
        };

        const animation = element.animate([...presetConfig.keyframes] as Keyframe[], mergedOptions);
        AnimationUtils.activeAnimations.set(element, animation);

        animation.onfinish = () => {
            AnimationUtils.activeAnimations.delete(element);
        };

        return animation;
    }

    static stopAnimation(element: Element): void {
        const animation = AnimationUtils.activeAnimations.get(element);
        if (animation) {
            animation.cancel();
            AnimationUtils.activeAnimations.delete(element);
        }
    }

    static stopAllAnimations(): void {
        AnimationUtils.activeAnimations.forEach(animation => animation.cancel());
        AnimationUtils.activeAnimations.clear();
    }

    static previewAnimation(preset: keyof typeof AnimationUtils.ANIMATION_PRESETS): void {
        if (!AnimationUtils.previewContainer) {
            AnimationUtils.createPreviewContainer();
        }

        const previewElement = document.createElement('div');
        previewElement.className = 'animation-preview-element';
        previewElement.style.width = '100px';
        previewElement.style.height = '100px';
        previewElement.style.backgroundColor = '#3498db';
        previewElement.style.borderRadius = '8px';
        previewElement.style.margin = '20px';

        if (AnimationUtils.previewContainer) {
            AnimationUtils.previewContainer.appendChild(previewElement);
        }
        AnimationUtils.animate(previewElement, preset);

        // Remove preview element after animation
        setTimeout(() => {
            previewElement.remove();
        }, (AnimationUtils.ANIMATION_PRESETS[preset].options.duration ?? 300) + 100);
    }

    private static createPreviewContainer(): void {
        AnimationUtils.previewContainer = document.createElement('div');
        AnimationUtils.previewContainer.className = 'animation-preview-container';
        AnimationUtils.previewContainer.style.position = 'fixed';
        AnimationUtils.previewContainer.style.bottom = '20px';
        AnimationUtils.previewContainer.style.right = '20px';
        AnimationUtils.previewContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        AnimationUtils.previewContainer.style.padding = '20px';
        AnimationUtils.previewContainer.style.borderRadius = '8px';
        AnimationUtils.previewContainer.style.zIndex = '1000';
        document.body.appendChild(AnimationUtils.previewContainer);
    }

    static getAvailablePresets(): string[] {
        return Object.keys(AnimationUtils.ANIMATION_PRESETS);
    }

    static createCustomAnimation(
        element: Element,
        keyframes: Keyframe[],
        options: KeyframeAnimationOptions
    ): Animation {
        const animation = element.animate(keyframes, options);
        AnimationUtils.activeAnimations.set(element, animation);

        animation.onfinish = () => {
            AnimationUtils.activeAnimations.delete(element);
        };

        return animation;
    }

    static isAnimating(element: Element): boolean {
        return AnimationUtils.activeAnimations.has(element);
    }

    static getAnimationProgress(element: Element): number {
        const animation = AnimationUtils.activeAnimations.get(element);
        if (!animation) return 0;
        const currentTime = typeof animation.currentTime === 'number' ? animation.currentTime : 0;
        const effect = animation.effect;
        const duration = typeof effect?.getComputedTiming === 'function'
            ? Number(effect.getComputedTiming().duration)
            : 1;
        return currentTime && duration ? currentTime / duration : 0;
    }

    static pauseAnimation(element: Element): void {
        const animation = AnimationUtils.activeAnimations.get(element);
        if (animation) {
            animation.pause();
        }
    }

    static resumeAnimation(element: Element): void {
        const animation = AnimationUtils.activeAnimations.get(element);
        if (animation) {
            animation.play();
        }
    }

    static reverseAnimation(element: Element): void {
        const animation = AnimationUtils.activeAnimations.get(element);
        if (animation) {
            animation.reverse();
        }
    }

    static queueAnimation(
        element: Element,
        preset: keyof typeof AnimationUtils.ANIMATION_PRESETS,
        options?: Partial<KeyframeAnimationOptions>
    ): void {
        if (!AnimationUtils.animationQueue.has(element)) {
            AnimationUtils.animationQueue.set(element, []);
        }
        AnimationUtils.animationQueue.get(element)!.push({ preset, options });
        if (!AnimationUtils.isProcessingQueue) {
            AnimationUtils.processAnimationQueue(element);
        }
    }

    private static async processAnimationQueue(element: Element): Promise<void> {
        if (AnimationUtils.isProcessingQueue || !AnimationUtils.animationQueue.has(element)) return;

        AnimationUtils.isProcessingQueue = true;
        const queue = AnimationUtils.animationQueue.get(element)!;

        while (queue.length > 0) {
            const { preset, options } = queue[0];
            const animation = AnimationUtils.animate(element, preset, options);

            await new Promise<void>(resolve => {
                animation.onfinish = () => {
                    queue.shift();
                    resolve();
                };
            });
        }

        AnimationUtils.animationQueue.delete(element);
        AnimationUtils.isProcessingQueue = false;
    }

    static clearAnimationQueue(element: Element): void {
        AnimationUtils.animationQueue.delete(element);
        AnimationUtils.stopAnimation(element);
    }

    static getQueuedAnimations(element: Element): number {
        return AnimationUtils.animationQueue.get(element)?.length || 0;
    }

    static isQueueProcessing(): boolean {
        return AnimationUtils.isProcessingQueue;
    }
} 