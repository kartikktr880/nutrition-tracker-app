# PerformanceUtils Documentation

## Overview
The `PerformanceUtils` class provides a comprehensive set of tools for monitoring and optimizing application performance. It includes features for real-time performance monitoring, automatic performance mode switching, and performance metrics tracking.

## Features

### Performance Monitoring
- Real-time FPS monitoring
- Memory usage tracking
- CPU usage monitoring
- Long task detection
- Performance threshold monitoring

### Performance Mode
- Manual performance mode toggle
- Automatic performance mode based on metrics
- Performance mode thresholds configuration

### Performance Dashboard
- Development-only performance dashboard
- Real-time metrics display
- Toggle functionality
- Non-intrusive UI

### Performance Measurements
- Execution time measurement
- Performance marks and measures
- Resource timing
- Custom performance metrics

### Utility Functions
- Debouncing
- Throttling
- Performance optimization helpers

## Usage

### Basic Usage
```typescript
// Toggle performance mode
PerformanceUtils.setPerformanceMode(true);

// Enable auto performance mode
PerformanceUtils.setAutoPerformanceMode(true);

// Get current metrics
const metrics = PerformanceUtils.getMetrics();
```

### Performance Monitoring
```typescript
// Start performance monitoring
PerformanceUtils.startPerformanceMonitoring();

// Track long tasks
PerformanceUtils.trackLongTask(() => {
    // Your long-running task
});

// Track errors
PerformanceUtils.trackError(new Error('Test error'));
```

### Performance Dashboard
```typescript
// Toggle performance dashboard (development only)
PerformanceUtils.togglePerformanceDashboard();
```

### Performance Measurements
```typescript
// Measure execution time
const executionTime = PerformanceUtils.measureExecutionTime(() => {
    // Your code to measure
});

// Use performance marks
PerformanceUtils.mark('start');
// Your code
PerformanceUtils.mark('end');
PerformanceUtils.measure('duration', 'start', 'end');
```

### Utility Functions
```typescript
// Debounce function
const debouncedFn = PerformanceUtils.debounce(() => {
    // Your debounced function
}, 100);

// Throttle function
const throttledFn = PerformanceUtils.throttle(() => {
    // Your throttled function
}, 100);
```

## Configuration

### Performance Thresholds
```typescript
const thresholds = {
    fps: {
        warning: 30,
        critical: 15
    },
    frameTime: {
        warning: 33,
        critical: 50
    },
    memoryUsage: {
        warning: 0.7,
        critical: 0.9
    },
    cpuUsage: {
        warning: 0.7,
        critical: 0.9
    }
};
```

### Dashboard Configuration
```typescript
const dashboardConfig = {
    updateInterval: 1000, // Update every second
    maxMetrics: 100, // Maximum number of metrics to store
    showInProduction: false // Whether to show in production
};
```

## Events

### Performance Issues
The class emits events when performance issues are detected:
```typescript
PerformanceUtils.addObserver((event) => {
    if (event.type === 'performanceIssues') {
        // Handle performance issues
        console.log(event.issues);
    }
});
```

## Best Practices

1. **Performance Mode**
   - Use automatic performance mode in production
   - Manually toggle performance mode during development
   - Monitor performance mode changes

2. **Performance Monitoring**
   - Start monitoring early in the application lifecycle
   - Set appropriate thresholds for your application
   - Handle performance issues gracefully

3. **Dashboard Usage**
   - Use the dashboard only in development
   - Monitor key metrics regularly
   - Use the dashboard to identify performance bottlenecks

4. **Performance Measurements**
   - Use marks and measures for critical operations
   - Measure execution time for expensive operations
   - Track resource timing for network requests

5. **Utility Functions**
   - Use debouncing for frequent events
   - Use throttling for continuous operations
   - Apply performance optimizations where needed

## Error Handling

The class includes comprehensive error handling:
- Graceful degradation when performance APIs are not available
- Fallback mechanisms for unsupported features
- Error logging and reporting
- User-friendly error messages

## Browser Support

The class is designed to work in modern browsers that support the Performance API:
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Performance Impact

The class is designed to have minimal performance impact:
- Efficient metric collection
- Optimized dashboard updates
- Minimal memory footprint
- Automatic cleanup of unused resources

## Contributing

When contributing to the PerformanceUtils class:
1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Consider performance impact
5. Handle edge cases

## License

This utility is part of the Nutrition Tracker application and is subject to its license terms. 