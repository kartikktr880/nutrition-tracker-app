import { AnimationUtils } from '../scripts/utils/animation-utils';

describe('AnimationUtils', () => {
    let testElement: HTMLElement;

    beforeEach(() => {
        // Create a test element
        testElement = document.createElement('div');
        document.body.appendChild(testElement);
    });

    afterEach(() => {
        // Clean up
        document.body.removeChild(testElement);
        AnimationUtils.stopAllAnimations();
    });

    describe('Animation Presets', () => {
        test('should apply fade animation', async () => {
            const animation = await AnimationUtils.animate(testElement, 'fade', { duration: 100 });
            expect(animation).toBeDefined();
            expect(testElement.style.opacity).toBe('0');
        });

        test('should apply slide animation', async () => {
            const animation = await AnimationUtils.animate(testElement, 'slideIn', { duration: 100 });
            expect(animation).toBeDefined();
            expect(testElement.style.transform).toBeDefined();
        });

        test('should apply scale animation', async () => {
            const animation = await AnimationUtils.animate(testElement, 'scale', { duration: 100 });
            expect(animation).toBeDefined();
            expect(testElement.style.transform).toBeDefined();
        });
    });

    describe('Animation Controls', () => {
        test('should stop animation', async () => {
            const animation = await AnimationUtils.animate(testElement, 'fade', { duration: 1000 });
            AnimationUtils.stopAnimation(testElement);
            expect(AnimationUtils.isAnimating(testElement)).toBe(false);
        });

        test('should pause and resume animation', async () => {
            const animation = await AnimationUtils.animate(testElement, 'fade', { duration: 1000 });
            AnimationUtils.pauseAnimation(testElement);
            expect(AnimationUtils.isAnimating(testElement)).toBe(false);

            AnimationUtils.resumeAnimation(testElement);
            expect(AnimationUtils.isAnimating(testElement)).toBe(true);
        });

        test('should reverse animation', async () => {
            const animation = await AnimationUtils.animate(testElement, 'fade', { duration: 1000 });
            AnimationUtils.reverseAnimation(testElement);
            expect(AnimationUtils.getAnimationProgress(testElement)).toBeDefined();
        });
    });

    describe('Animation Queue', () => {
        test('should queue animations', () => {
            AnimationUtils.queueAnimation(testElement, 'fade', { duration: 100 });
            AnimationUtils.queueAnimation(testElement, 'slideIn', { duration: 100 });
            expect(AnimationUtils.getQueuedAnimations(testElement)).toBe(2);
        });

        test('should process animation queue', async () => {
            AnimationUtils.queueAnimation(testElement, 'fade', { duration: 100 });
            AnimationUtils.queueAnimation(testElement, 'slideIn', { duration: 100 });
            
            await new Promise(resolve => setTimeout(resolve, 300));
            expect(AnimationUtils.getQueuedAnimations(testElement)).toBe(0);
        });

        test('should clear animation queue', () => {
            AnimationUtils.queueAnimation(testElement, 'fade', { duration: 100 });
            AnimationUtils.queueAnimation(testElement, 'slideIn', { duration: 100 });
            
            AnimationUtils.clearAnimationQueue(testElement);
            expect(AnimationUtils.getQueuedAnimations(testElement)).toBe(0);
        });
    });

    describe('Animation Preview', () => {
        test('should create preview container', () => {
            AnimationUtils.createPreviewContainer();
            const container = document.querySelector('.animation-preview-container');
            expect(container).toBeTruthy();
        });

        test('should preview animation', async () => {
            await AnimationUtils.previewAnimation('fade', { duration: 100 });
            const previewElement = document.querySelector('.animation-preview');
            expect(previewElement).toBeTruthy();
        });
    });

    describe('Custom Animations', () => {
        test('should create custom animation', () => {
            const customAnimation = AnimationUtils.createCustomAnimation({
                keyframes: [
                    { transform: 'scale(1)', opacity: 1 },
                    { transform: 'scale(1.5)', opacity: 0.5 }
                ],
                options: { duration: 100 }
            });

            expect(customAnimation).toBeDefined();
            expect(customAnimation.keyframes).toBeDefined();
            expect(customAnimation.options).toBeDefined();
        });

        test('should apply custom animation', async () => {
            const customAnimation = AnimationUtils.createCustomAnimation({
                keyframes: [
                    { transform: 'scale(1)', opacity: 1 },
                    { transform: 'scale(1.5)', opacity: 0.5 }
                ],
                options: { duration: 100 }
            });

            const animation = await AnimationUtils.animate(testElement, customAnimation);
            expect(animation).toBeDefined();
        });
    });

    describe('Animation State', () => {
        test('should check if element is animating', async () => {
            expect(AnimationUtils.isAnimating(testElement)).toBe(false);
            
            await AnimationUtils.animate(testElement, 'fade', { duration: 1000 });
            expect(AnimationUtils.isAnimating(testElement)).toBe(true);
        });

        test('should get animation progress', async () => {
            await AnimationUtils.animate(testElement, 'fade', { duration: 1000 });
            const progress = AnimationUtils.getAnimationProgress(testElement);
            expect(progress).toBeGreaterThanOrEqual(0);
            expect(progress).toBeLessThanOrEqual(1);
        });
    });
}); 