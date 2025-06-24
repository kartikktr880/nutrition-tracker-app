import '../scripts/utils/logging-utils.js';
const { loggingUtils } = window;

describe('LoggingUtils', () => {
  beforeEach(() => {
    loggingUtils.state.cache.clear();
  });

  test('should log different levels', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    loggingUtils.log('info', 'Test info message');
    loggingUtils.log('warn', 'Test warning message');
    loggingUtils.log('error', 'Test error message');

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('should handle log levels', () => {
    const levels = ['debug', 'info', 'warn', 'error'];
    levels.forEach(level => {
      expect(loggingUtils.isValidLogLevel(level)).toBe(true);
    });
    expect(loggingUtils.isValidLogLevel('invalid')).toBe(false);
  });

  test('should format log messages', () => {
    const message = 'Test message';
    const formatted = loggingUtils.formatLogMessage('info', message);
    expect(formatted).toContain(message);
    expect(formatted).toContain('info');
  });

  test('should handle log context', () => {
    const message = 'Test message';
    const context = { userId: '123', action: 'save' };
    const logWithContext = loggingUtils.logWithContext('info', message, context);
    expect(logWithContext.context).toEqual(context);
  });

  test('should handle log grouping', () => {
    const groupName = 'test-group';
    loggingUtils.startLogGroup(groupName);
    loggingUtils.log('info', 'Test message');
    loggingUtils.endLogGroup();
    expect(loggingUtils.state.logGroups).toHaveProperty(groupName);
  });

  test('should handle log filtering', () => {
    loggingUtils.setLogFilter('info');
    expect(loggingUtils.shouldLog('info')).toBe(true);
    expect(loggingUtils.shouldLog('debug')).toBe(false);
  });

  test('should handle log persistence', () => {
    const message = 'Test message';
    loggingUtils.persistLog('info', message);
    expect(loggingUtils.state.persistedLogs).toContainEqual(
      expect.objectContaining({
        level: 'info',
        message
      })
    );
  });

  test('should handle log rotation', () => {
    // Fill up logs
    for (let i = 0; i < 1000; i++) {
      loggingUtils.persistLog('info', `Test message ${i}`);
    }
    loggingUtils.rotateLogs();
    expect(loggingUtils.state.persistedLogs.length).toBeLessThan(1000);
  });

  test('should handle log export', () => {
    loggingUtils.persistLog('info', 'Test message');
    const exported = loggingUtils.exportLogs();
    expect(exported).toContain('Test message');
  });

  test('should handle log cleanup', () => {
    loggingUtils.persistLog('info', 'Test message');
    loggingUtils.cleanupLogs();
    expect(loggingUtils.state.persistedLogs).toHaveLength(0);
  });

  test('should handle log statistics', () => {
    loggingUtils.log('info', 'Test info message');
    loggingUtils.log('warn', 'Test warning message');
    loggingUtils.log('error', 'Test error message');

    const stats = loggingUtils.getLogStatistics();
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('byLevel');
  });

  test('should handle log timestamps', () => {
    const message = 'Test message';
    const logWithTimestamp = loggingUtils.logWithTimestamp('info', message);
    expect(logWithTimestamp).toHaveProperty('timestamp');
  });

  test('should handle log categories', () => {
    const message = 'Test message';
    const logWithCategory = loggingUtils.logWithCategory('info', message, 'test');
    expect(logWithCategory.category).toBe('test');
  });

  test('should handle log tags', () => {
    const message = 'Test message';
    const tags = ['test', 'debug'];
    const logWithTags = loggingUtils.logWithTags('info', message, tags);
    expect(logWithTags.tags).toEqual(tags);
  });

  test('should handle log search', () => {
    loggingUtils.persistLog('info', 'Test message 1');
    loggingUtils.persistLog('info', 'Test message 2');
    const results = loggingUtils.searchLogs('Test message');
    expect(results).toHaveLength(2);
  });

  test('should handle log aggregation', () => {
    loggingUtils.persistLog('info', 'Test message 1');
    loggingUtils.persistLog('info', 'Test message 2');
    const aggregated = loggingUtils.aggregateLogs();
    expect(aggregated).toHaveProperty('count');
    expect(aggregated).toHaveProperty('levels');
  });
}); 