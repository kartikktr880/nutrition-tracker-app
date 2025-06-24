/**
 * State Utilities
 * Enhanced state management and synchronization system
 */

import { LoggingUtils } from './logging-utils';
import { StorageUtils } from './storage-utils';
import { errorUtils, ErrorCategory, ErrorSeverity } from './error-utils';

interface StateChange {
    timestamp: number;
    key: string;
    oldValue: any;
    newValue: any;
    source: string;
    userId?: string;
    sessionId?: string;
}

interface StateConflict {
    timestamp: number;
    key: string;
    localValue: any;
    remoteValue: any;
    resolution: 'local' | 'remote' | 'merge';
    resolvedBy: string;
}

interface StateObserver {
    key: string;
    callback: (value: any, oldValue: any) => void;
    options?: {
        immediate?: boolean;
        deep?: boolean;
    };
}

export class StateUtils {
    private static instance: StateUtils;
    private state: Map<string, any> = new Map();
    private observers: StateObserver[] = [];
    private changeHistory: StateChange[] = [];
    private conflictHistory: StateConflict[] = [];
    private syncInterval: number | null = null;
    private readonly maxHistorySize = 100;
    private readonly syncIntervalMs = 5000; // 5 seconds
    private readonly conflictResolutionStrategy: 'local' | 'remote' | 'merge' = 'merge';
    private readonly stateVersion = '1.0.0';
    private readonly stateKey = 'app_state';
    private readonly stateHashKey = 'app_state_hash';
    private readonly stateTimestampKey = 'app_state_timestamp';

    private constructor() {
        this.initializeState();
    }

    static getInstance(): StateUtils {
        if (!StateUtils.instance) {
            StateUtils.instance = new StateUtils();
        }
        return StateUtils.instance;
    }

    private async initializeState(): Promise<void> {
        try {
            // Load state from storage
            const storedState = await this.loadStateFromStorage();
            if (storedState) {
                this.state = new Map(Object.entries(storedState));
            }

            // Start sync interval
            this.startSyncInterval();

            // Initialize observers
            this.initializeObservers();

            LoggingUtils.log('info', 'State management initialized');
        } catch (error) {
            await errorUtils.handleError(
                error,
                ErrorCategory.STORAGE,
                ErrorSeverity.HIGH,
                { context: 'State initialization' }
            );
        }
    }

    private async loadStateFromStorage(): Promise<Record<string, any> | null> {
        try {
            const stateData = await StorageUtils.get(this.stateKey);
            const stateHash = await StorageUtils.get(this.stateHashKey);
            const stateTimestamp = await StorageUtils.get(this.stateTimestampKey);

            if (!stateData || !stateHash || !stateTimestamp) {
                return null;
            }

            // Verify state integrity
            const calculatedHash = await this.calculateStateHash(stateData);
            if (calculatedHash !== stateHash) {
                LoggingUtils.log('warn', 'State integrity check failed');
                return null;
            }

            return JSON.parse(stateData);
        } catch (error) {
            await errorUtils.handleError(
                error,
                ErrorCategory.STORAGE,
                ErrorSeverity.MEDIUM,
                { context: 'State loading' }
            );
            return null;
        }
    }

    private async calculateStateHash(state: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(state);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private startSyncInterval(): void {
        if (this.syncInterval) {
            return;
        }

        this.syncInterval = window.setInterval(async () => {
            try {
                await this.syncState();
            } catch (error) {
                await errorUtils.handleError(
                    error,
                    ErrorCategory.STORAGE,
                    ErrorSeverity.MEDIUM,
                    { context: 'State synchronization' }
                );
            }
        }, this.syncIntervalMs);
    }

    private async syncState(): Promise<void> {
        try {
            const remoteState = await this.fetchRemoteState();
            if (!remoteState) {
                return;
            }

            const conflicts = this.detectConflicts(remoteState);
            if (conflicts.length > 0) {
                await this.resolveConflicts(conflicts);
            }

            await this.saveState();
        } catch (error) {
            await errorUtils.handleError(
                error,
                ErrorCategory.STORAGE,
                ErrorSeverity.MEDIUM,
                { context: 'State synchronization' }
            );
        }
    }

    private async fetchRemoteState(): Promise<Record<string, any> | null> {
        try {
            // Implement remote state fetching
            // This could be from a server, IndexedDB, or other storage
            return null;
        } catch (error) {
            await errorUtils.handleError(
                error,
                ErrorCategory.NETWORK,
                ErrorSeverity.MEDIUM,
                { context: 'Remote state fetching' }
            );
            return null;
        }
    }

    private detectConflicts(remoteState: Record<string, any>): StateConflict[] {
        const conflicts: StateConflict[] = [];

        Object.entries(remoteState).forEach(([key, remoteValue]) => {
            const localValue = this.state.get(key);
            if (localValue !== remoteValue) {
                conflicts.push({
                    timestamp: Date.now(),
                    key,
                    localValue,
                    remoteValue,
                    resolution: this.conflictResolutionStrategy,
                    resolvedBy: 'system'
                });
            }
        });

        return conflicts;
    }

    private async resolveConflicts(conflicts: StateConflict[]): Promise<void> {
        for (const conflict of conflicts) {
            try {
                let resolvedValue: any;

                switch (conflict.resolution) {
                    case 'local':
                        resolvedValue = conflict.localValue;
                        break;
                    case 'remote':
                        resolvedValue = conflict.remoteValue;
                        break;
                    case 'merge':
                        resolvedValue = this.mergeValues(conflict.localValue, conflict.remoteValue);
                        break;
                }

                this.state.set(conflict.key, resolvedValue);
                this.conflictHistory.push(conflict);

                // Notify observers
                this.notifyObservers(conflict.key, resolvedValue, conflict.localValue);
            } catch (error) {
                await errorUtils.handleError(
                    error,
                    ErrorCategory.STORAGE,
                    ErrorSeverity.MEDIUM,
                    { context: 'Conflict resolution', conflict }
                );
            }
        }
    }

    private mergeValues(localValue: any, remoteValue: any): any {
        if (typeof localValue !== typeof remoteValue) {
            return remoteValue;
        }

        if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
            return [...new Set([...localValue, ...remoteValue])];
        }

        if (typeof localValue === 'object' && localValue !== null) {
            return { ...localValue, ...remoteValue };
        }

        return remoteValue;
    }

    async setState(key: string, value: any, source: string = 'local'): Promise<void> {
        try {
            const oldValue = this.state.get(key);
            this.state.set(key, value);

            // Record change
            const change: StateChange = {
                timestamp: Date.now(),
                key,
                oldValue,
                newValue: value,
                source,
                userId: this.getUserId(),
                sessionId: this.getSessionId()
            };

            this.changeHistory.unshift(change);
            if (this.changeHistory.length > this.maxHistorySize) {
                this.changeHistory.pop();
            }

            // Notify observers
            this.notifyObservers(key, value, oldValue);

            // Save state
            await this.saveState();
        } catch (error) {
            await errorUtils.handleError(
                error,
                ErrorCategory.STORAGE,
                ErrorSeverity.MEDIUM,
                { context: 'State update', key, value }
            );
        }
    }

    getState(key: string): any {
        return this.state.get(key);
    }

    getAllState(): Record<string, any> {
        return Object.fromEntries(this.state);
    }

    private async saveState(): Promise<void> {
        try {
            const stateData = JSON.stringify(Object.fromEntries(this.state));
            const stateHash = await this.calculateStateHash(stateData);
            const timestamp = Date.now();

            await StorageUtils.set(this.stateKey, stateData);
            await StorageUtils.set(this.stateHashKey, stateHash);
            await StorageUtils.set(this.stateTimestampKey, timestamp.toString());

            LoggingUtils.log('info', 'State saved successfully');
        } catch (error) {
            await errorUtils.handleError(
                error,
                ErrorCategory.STORAGE,
                ErrorSeverity.HIGH,
                { context: 'State saving' }
            );
        }
    }

    addObserver(observer: StateObserver): void {
        this.observers.push(observer);
        if (observer.options?.immediate) {
            const value = this.state.get(observer.key);
            observer.callback(value, value);
        }
    }

    removeObserver(observer: StateObserver): void {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    private notifyObservers(key: string, newValue: any, oldValue: any): void {
        this.observers.forEach(observer => {
            if (observer.key === key) {
                if (observer.options?.deep) {
                    if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
                        observer.callback(newValue, oldValue);
                    }
                } else {
                    observer.callback(newValue, oldValue);
                }
            }
        });
    }

    private getUserId(): string | undefined {
        // Implement secure user ID retrieval
        return undefined;
    }

    private getSessionId(): string | undefined {
        // Implement secure session ID retrieval
        return undefined;
    }

    getChangeHistory(): StateChange[] {
        return [...this.changeHistory];
    }

    getConflictHistory(): StateConflict[] {
        return [...this.conflictHistory];
    }

    getStateStats(): { totalKeys: number; lastSync: number; conflicts: number } {
        return {
            totalKeys: this.state.size,
            lastSync: parseInt(StorageUtils.get(this.stateTimestampKey) || '0'),
            conflicts: this.conflictHistory.length
        };
    }

    reset(): void {
        this.state.clear();
        this.changeHistory = [];
        this.conflictHistory = [];
        this.observers = [];
        this.saveState();
    }

    cleanup(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.observers = [];
    }
}

export const stateUtils = StateUtils.getInstance(); 