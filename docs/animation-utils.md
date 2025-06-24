# AnimationUtils Documentation

## Overview
The `AnimationUtils` class provides a comprehensive animation system with features for creating, managing, and previewing animations. It includes animation presets, queue management, and performance optimization capabilities.

## Features

### Animation Presets
- Fade animations
- Slide animations
- Scale animations
- Bounce animations
- Shake animations
- Custom animations

### Animation Controls
- Play/pause
- Stop
- Reverse
- Speed control
- Progress tracking

### Animation Queue
- Queue management
- Sequential playback
- Queue status monitoring
- Queue manipulation

### Animation Preview
- Preview container
- Animation preview
- Preset preview
- Custom animation preview

## Usage

### Basic Usage
```typescript
// Apply a fade animation
await AnimationUtils.animate(element, 'fade', { duration: 1000 });

// Apply a slide animation
await AnimationUtils.animate(element, 'slideIn', { duration: 1000 });

// Apply a scale animation
await AnimationUtils.animate(element, 'scale', { duration: 1000 });
```

### Animation Controls
```typescript
// Stop animation
AnimationUtils.stopAnimation(element);

// Pause animation
AnimationUtils.pauseAnimation(element);

// Resume animation
AnimationUtils.resumeAnimation(element);

// Reverse animation
AnimationUtils.reverseAnimation(element);
```

### Animation Queue
```typescript
// Queue animations
AnimationUtils.queueAnimation(element, 'fade', { duration: 1000 });
AnimationUtils.queueAnimation(element, 'slideIn', { duration: 1000 });

// Clear queue
AnimationUtils.clearAnimationQueue(element);

// Get queue status
const queuedCount = AnimationUtils.getQueuedAnimations(element);
```

### Animation Preview
```typescript
// Create preview container
AnimationUtils.createPreviewContainer();

// Preview animation
await AnimationUtils.previewAnimation('fade', { duration: 1000 });
```

### Custom Animations
```typescript
// Create custom animation
const customAnimation = AnimationUtils.createCustomAnimation({
    keyframes: [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.5)', opacity: 0.5 }
    ],
    options: { duration: 1000 }
});

// Apply custom animation
await AnimationUtils.animate(element, customAnimation);
```

## Animation Presets

### Fade
```typescript
const fadePreset = {
    keyframes: [
        { opacity: 1 },
        { opacity: 0 }
    ],
    options: {
        duration: 1000,
        easing: 'ease-in-out'
    }
};
```

### Slide
```typescript
const slidePreset = {
    keyframes: [
        { transform: 'translateX(0)' },
        { transform: 'translateX(100px)' }
    ],
    options: {
        duration: 1000,
        easing: 'ease-out'
    }
};
```

### Scale
```typescript
const scalePreset = {
    keyframes: [
        { transform: 'scale(1)' },
        { transform: 'scale(1.5)' }
    ],
    options: {
        duration: 1000,
        easing: 'ease-in-out'
    }
};
```

## Animation Options

### Duration
- Default: 1000ms
- Range: 0-∞
- Unit: milliseconds

### Easing
- Default: 'ease-in-out'
- Options: 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'
- Custom cubic-bezier values

### Delay
- Default: 0ms
- Range: 0-∞
- Unit: milliseconds

### Iterations
- Default: 1
- Range: 1-∞
- Special value: 'infinity'

## Best Practices

1. **Animation Performance**
   - Use transform and opacity for animations
   - Avoid animating layout properties
   - Use will-change property appropriately
   - Monitor animation performance

2. **Animation Queue**
   - Clear queue when component unmounts
   - Monitor queue size
   - Handle queue errors
   - Use appropriate queue timing

3. **Animation Preview**
   - Use preview in development
   - Test animations before deployment
   - Consider performance impact
   - Handle preview errors

4. **Custom Animations**
   - Use appropriate keyframes
   - Set reasonable durations
   - Consider easing functions
   - Test across browsers

5. **Animation Controls**
   - Handle animation state
   - Clean up animations
   - Monitor animation progress
   - Handle animation errors

## Browser Support

The class is designed to work in modern browsers that support the Web Animations API:
- Chrome 36+
- Firefox 48+
- Safari 13.1+
- Edge 79+

## Performance Impact

The class is designed to have minimal performance impact:
- Efficient animation handling
- Optimized queue management
- Minimal memory footprint
- Automatic cleanup

## Contributing

When contributing to the AnimationUtils class:
1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Consider performance impact
5. Handle edge cases

## License

This utility is part of the Nutrition Tracker application and is subject to its license terms. 