import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
interface AnimationProperties {
  [key: string]: string | number;
}

interface Animation {
  element: HTMLElement;
  properties: AnimationProperties;
  duration: number;
}

export class AnimationManager {
  private isEnabled: boolean;
  private performanceMode: boolean;
  private queue: Animation[];
  private reducedMotion: boolean;

  constructor() {
    this.isEnabled = true;
    this.performanceMode = false;
    this.queue = [];
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  addToQueue(animation: Animation): void {
    if (!this.isEnabled) return;

    // Adjust duration based on performance mode and reduced motion preference
    if (this.performanceMode) {
      animation.duration = Math.floor(animation.duration / 2);
    }
    
    if (this.reducedMotion) {
      animation.duration = 0;
    }

    this.queue.push(animation);
  }

  async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const animation = this.queue.shift();
      if (animation) {
        try {
          await this.animate(animation);
        } catch (error) {
          logError('Animation failed:', error);
        }
      }
    }
  }

  private async animate({ element, properties, duration }: Animation): Promise<void> {
    if (!element || !properties) return;

    return new Promise((resolve) => {
      if (duration === 0) {
        // Apply properties immediately if duration is 0
        Object.entries(properties).forEach(([property, value]) => {
          element.style[property as any] = String(value);
        });
        resolve();
        return;
      }

      // Create animation
      const animation = element.animate(
        Object.entries(properties).map(([property, value]) => ({
          [property]: value
        })),
        {
          duration,
          easing: 'ease-in-out',
          fill: 'forwards'
        }
      );

      animation.onfinish = () => {
        // Apply final values to style
        Object.entries(properties).forEach(([property, value]) => {
          element.style[property as any] = String(value);
        });
        resolve();
      };
    });
  }

  setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled;
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
    this.queue = []; // Clear queue when disabled
  }
} 