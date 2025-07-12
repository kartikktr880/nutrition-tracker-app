import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4003;

// Race condition monitoring configuration
const config = {
    logDir: path.join(__dirname, 'race-logs'),
    maxConcurrentOperations: 100,
    operationTimeout: 5000, // 5 seconds
    monitoringInterval: 1000 // 1 second
};

// Create log directory if it doesn't exist
if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir);
}

// Race condition monitoring state
const monitoringState = {
    startTime: Date.now(),
    operations: new Map(),
    warnings: [],
    raceConditions: [],
    logs: []
};

// Operation tracking
class Operation {
    constructor(id, type, startTime) {
        this.id = id;
        this.type = type;
        this.startTime = startTime;
        this.endTime = null;
        this.status = 'running';
        this.dependencies = new Set();
        this.dependents = new Set();
    }

    complete() {
        this.endTime = Date.now();
        this.status = 'completed';
    }

    fail(error) {
        this.endTime = Date.now();
        this.status = 'failed';
        this.error = error;
    }
}

// Track operation
const trackOperation = (id, type) => {
    const operation = new Operation(id, type, Date.now());
    monitoringState.operations.set(id, operation);
    return operation;
};

// Complete operation
const completeOperation = (id) => {
    const operation = monitoringState.operations.get(id);
    if (operation) {
        operation.complete();
    }
};

// Fail operation
const failOperation = (id, error) => {
    const operation = monitoringState.operations.get(id);
    if (operation) {
        operation.fail(error);
    }
};

// Add operation dependency
const addDependency = (operationId, dependencyId) => {
    const operation = monitoringState.operations.get(operationId);
    const dependency = monitoringState.operations.get(dependencyId);
    
    if (operation && dependency) {
        operation.dependencies.add(dependencyId);
        dependency.dependents.add(operationId);
    }
};

// Check for race conditions
const checkRaceConditions = () => {
    const now = Date.now();
    
    // Check for timeout operations
    monitoringState.operations.forEach((operation, id) => {
        if (operation.status === 'running' && 
            now - operation.startTime > config.operationTimeout) {
            const warning = {
                timestamp: new Date().toISOString(),
                type: 'OPERATION_TIMEOUT',
                operationId: id,
                operationType: operation.type,
                duration: now - operation.startTime
            };
            monitoringState.warnings.push(warning);
            
            // Log warning
            const warningLogFile = path.join(config.logDir, 'operation-warnings.log');
            fs.appendFileSync(warningLogFile, JSON.stringify(warning) + '\n');
        }
    });
    
    // Check for circular dependencies
    monitoringState.operations.forEach((operation, id) => {
        const visited = new Set();
        const stack = new Set();
        
        const hasCycle = (currentId) => {
            if (stack.has(currentId)) return true;
            if (visited.has(currentId)) return false;
            
            visited.add(currentId);
            stack.add(currentId);
            
            const current = monitoringState.operations.get(currentId);
            if (current) {
                for (const dependentId of current.dependents) {
                    if (hasCycle(dependentId)) {
                        const raceCondition = {
                            timestamp: new Date().toISOString(),
                            type: 'CIRCULAR_DEPENDENCY',
                            operationId: id,
                            dependentId,
                            operationType: operation.type
                        };
                        monitoringState.raceConditions.push(raceCondition);
                        
                        // Log race condition
                        const raceLogFile = path.join(config.logDir, 'race-conditions.log');
                        fs.appendFileSync(raceLogFile, JSON.stringify(raceCondition) + '\n');
                        
                        return true;
                    }
                }
            }
            
            stack.delete(currentId);
            return false;
        };
        
        hasCycle(id);
    });
};

// Log operation state
const logOperationState = () => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        activeOperations: Array.from(monitoringState.operations.values())
            .filter(op => op.status === 'running')
            .map(op => ({
                id: op.id,
                type: op.type,
                startTime: op.startTime,
                duration: Date.now() - op.startTime
            }))
    };
    
    monitoringState.logs.push(logEntry);
    
    // Write to file
    const logFile = path.join(config.logDir, `operations-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
};

// Start monitoring
setInterval(checkRaceConditions, config.monitoringInterval);
setInterval(logOperationState, 60000); // Log every minute

// API endpoints
app.get('/operations', (req, res) => {
    res.json(Array.from(monitoringState.operations.values()));
});

app.get('/warnings', (req, res) => {
    res.json(monitoringState.warnings);
});

app.get('/race-conditions', (req, res) => {
    res.json(monitoringState.raceConditions);
});

app.get('/logs', (req, res) => {
    const { date } = req.query;
    const logFile = path.join(config.logDir, `operations-${date || new Date().toISOString().split('T')[0]}.log`);
    
    try {
        if (fs.existsSync(logFile)) {
            const logs = fs.readFileSync(logFile, 'utf8')
                .split('\n')
                .filter(Boolean)
                .map(line => JSON.parse(line));
            res.json(logs);
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({
            error: 'Failed to read operation logs',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Start the server
app.listen(PORT, () => {
    logInfo(`Race Condition Detector running on http://localhost:${PORT}`);
    logInfo('Health check available at /health');
    logInfo('Operation monitoring available at /operations');
    logInfo('Environment:', process.env.NODE_ENV || 'development');
}); 