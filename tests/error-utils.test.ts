import { ErrorUtils } from '../scripts/utils/error-utils';

describe('ErrorUtils', () => {
    beforeEach(() => {
        // Reset error log before each test
        ErrorUtils.clearErrorLog();
    });

    describe('Error Handling', () => {
        test('should handle and log errors', () => {
            const error = new Error('Test error');
            ErrorUtils.handleError(error);

            const errorLog = ErrorUtils.getErrorLog();
            expect(errorLog).toHaveLength(1);
            expect(errorLog[0].error).toBe(error);
        });

        test('should categorize errors correctly', () => {
            const networkError = new Error('Network error');
            const validationError = new Error('Validation error');
            const authError = new Error('Authentication error');

            ErrorUtils.handleError(networkError, 'NETWORK');
            ErrorUtils.handleError(validationError, 'VALIDATION');
            ErrorUtils.handleError(authError, 'AUTH');

            const errorLog = ErrorUtils.getErrorLog();
            expect(errorLog[0].category).toBe('NETWORK');
            expect(errorLog[1].category).toBe('VALIDATION');
            expect(errorLog[2].category).toBe('AUTH');
        });
    });

    describe('Error Recovery', () => {
        test('should attempt error recovery', async () => {
            const error = new Error('Network error');
            const recoveryResult = await ErrorUtils.attemptErrorRecovery(error);

            expect(recoveryResult).toBeDefined();
            expect(recoveryResult.success).toBeDefined();
        });

        test('should handle recovery strategy failures', async () => {
            const error = new Error('Invalid recovery strategy');
            const recoveryResult = await ErrorUtils.attemptErrorRecovery(error);

            expect(recoveryResult.success).toBe(false);
        });
    });

    describe('Error Messages', () => {
        test('should get user-friendly error messages', () => {
            const networkError = new Error('Network error');
            const message = ErrorUtils.getUserFriendlyMessage(networkError, 'NETWORK');

            expect(message).toBeDefined();
            expect(typeof message).toBe('string');
        });

        test('should show error notifications', () => {
            const error = new Error('Test error');
            ErrorUtils.showErrorMessage(error);

            // Check if notification element exists
            const notification = document.querySelector('.error-notification');
            expect(notification).toBeTruthy();
        });
    });

    describe('Error Reporting', () => {
        test('should enable error reporting', () => {
            const endpoint = 'https://api.example.com/errors';
            ErrorUtils.enableErrorReporting(endpoint);

            // Verify reporting is enabled
            expect(ErrorUtils.isErrorReportingEnabled()).toBe(true);
        });

        test('should report errors when enabled', async () => {
            const endpoint = 'https://api.example.com/errors';
            ErrorUtils.enableErrorReporting(endpoint);

            const error = new Error('Test error');
            await ErrorUtils.reportError(error);

            // Verify error was reported
            const errorLog = ErrorUtils.getErrorLog();
            expect(errorLog[0].reported).toBe(true);
        });
    });

    describe('Error Log Management', () => {
        test('should clear error log', () => {
            const error = new Error('Test error');
            ErrorUtils.handleError(error);
            ErrorUtils.clearErrorLog();

            expect(ErrorUtils.getErrorLog()).toHaveLength(0);
        });

        test('should limit error log size', () => {
            // Add more errors than the maximum log size
            for (let i = 0; i < 150; i++) {
                ErrorUtils.handleError(new Error(`Error ${i}`));
            }

            const errorLog = ErrorUtils.getErrorLog();
            expect(errorLog.length).toBeLessThanOrEqual(100);
        });
    });
}); 