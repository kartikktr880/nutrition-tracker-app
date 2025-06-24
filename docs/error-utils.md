# ErrorUtils Documentation

## Overview
The `ErrorUtils` class provides a robust error handling system with features for error tracking, recovery, and user-friendly error messages. It includes automatic error recovery strategies, error categorization, and error reporting capabilities.

## Features

### Error Handling
- Comprehensive error tracking
- Error categorization
- User-friendly error messages
- Error context preservation
- Error severity levels

### Error Recovery
- Automatic recovery strategies
- Retry mechanisms
- Data corruption handling
- Network error recovery
- Validation error recovery

### Error Reporting
- Error logging
- Error reporting to external services
- Error analytics
- Error grouping
- Error statistics

### Error Notifications
- User-friendly error messages
- Error notifications
- Error severity indicators
- Error action suggestions
- Error context display

## Usage

### Basic Usage
```typescript
// Handle an error
ErrorUtils.handleError(new Error('Test error'));

// Handle error with category
ErrorUtils.handleError(new Error('Network error'), 'NETWORK');

// Get error log
const errorLog = ErrorUtils.getErrorLog();
```

### Error Recovery
```typescript
// Attempt error recovery
const recoveryResult = await ErrorUtils.attemptErrorRecovery(new Error('Network error'));

// Check recovery success
if (recoveryResult.success) {
    // Handle successful recovery
} else {
    // Handle recovery failure
}
```

### Error Messages
```typescript
// Get user-friendly error message
const message = ErrorUtils.getUserFriendlyMessage(new Error('Network error'), 'NETWORK');

// Show error notification
ErrorUtils.showErrorMessage(new Error('Test error'));
```

### Error Reporting
```typescript
// Enable error reporting
ErrorUtils.enableErrorReporting('https://api.example.com/errors');

// Report an error
await ErrorUtils.reportError(new Error('Test error'));
```

## Error Categories

The class supports the following error categories:
- `NETWORK`: Network-related errors
- `VALIDATION`: Input validation errors
- `AUTH`: Authentication and authorization errors
- `DATA`: Data processing errors
- `UI`: User interface errors
- `SYSTEM`: System-level errors

## Recovery Strategies

### Network Errors
```typescript
const networkStrategy = {
    maxRetries: 3,
    retryDelay: 1000,
    recoverySteps: [
        'checkNetworkConnection',
        'retryOperation',
        'clearErrorCache'
    ]
};
```

### Storage Errors
```typescript
const storageStrategy = {
    maxRetries: 2,
    retryDelay: 500,
    recoverySteps: [
        'migrateCorruptedData',
        'resetStorage',
        'validateAndSanitizeInput'
    ]
};
```

### Validation Errors
```typescript
const validationStrategy = {
    maxRetries: 1,
    retryDelay: 0,
    recoverySteps: [
        'validateAndSanitizeInput',
        'clearErrorCache'
    ]
};
```

## Error Log Management

### Log Size
- Maximum log size: 100 entries
- Automatic log trimming
- Log persistence options
- Log export capabilities

### Log Features
- Timestamp tracking
- Error categorization
- Error severity levels
- Error context preservation
- Error recovery status

## Best Practices

1. **Error Handling**
   - Always use try-catch blocks
   - Provide meaningful error messages
   - Include error context
   - Handle errors at appropriate levels

2. **Error Recovery**
   - Implement appropriate recovery strategies
   - Set reasonable retry limits
   - Handle recovery failures gracefully
   - Log recovery attempts

3. **Error Reporting**
   - Enable error reporting in production
   - Include relevant error context
   - Set up error monitoring
   - Review error reports regularly

4. **Error Notifications**
   - Use user-friendly messages
   - Provide actionable feedback
   - Consider error severity
   - Include recovery suggestions

5. **Error Logging**
   - Maintain appropriate log size
   - Include relevant context
   - Use appropriate log levels
   - Regular log review

## Error Handling Flow

1. **Error Detection**
   - Error occurs
   - Error is caught
   - Error context is captured

2. **Error Processing**
   - Error is categorized
   - Error severity is determined
   - Error context is preserved

3. **Error Recovery**
   - Recovery strategy is selected
   - Recovery steps are executed
   - Recovery result is logged

4. **Error Notification**
   - User-friendly message is generated
   - Error notification is displayed
   - Error context is provided

5. **Error Reporting**
   - Error is logged
   - Error is reported (if enabled)
   - Error statistics are updated

## Browser Support

The class is designed to work in all modern browsers:
- Chrome
- Firefox
- Safari
- Edge

## Performance Impact

The class is designed to have minimal performance impact:
- Efficient error tracking
- Optimized error recovery
- Minimal memory footprint
- Automatic cleanup

## Contributing

When contributing to the ErrorUtils class:
1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Consider error handling edge cases
5. Maintain backward compatibility

## License

This utility is part of the Nutrition Tracker application and is subject to its license terms. 