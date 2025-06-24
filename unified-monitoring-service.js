const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const v8 = require('v8');
const path = require('path');
const fs = require('fs');
const net = require('net');

// Port management
const findAvailablePort = async (startPort) => {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
        server.listen(startPort, () => {
            server.close(() => {
                resolve(startPort);
            });
        });
    });
};

// Server management
let server;
const startServer = async () => {
    try {
        const port = await findAvailablePort(process.env.PORT || 4000);
        server = app.listen(port, () => {
            console.log(`Unified Monitoring Service running on http://localhost:${port}`);
            console.log('Health check available at /health');
            console.log('Security monitoring available at /security');
            console.log('Memory monitoring available at /memory');
            console.log('Operation monitoring available at /operations');
            console.log('Browser compatibility available at /browser');
            console.log('Dashboard available at /dashboard');
            console.log('Environment:', process.env.NODE_ENV || 'development');
        });

        // Graceful shutdown
        const gracefulShutdown = () => {
            console.log('Received shutdown signal, closing server...');
            if (server) {
                server.close(() => {
                    console.log('Server closed');
                    process.exit(0);
                });
            } else {
                process.exit(0);
            }
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

const app = express();

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Security configuration
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Monitoring configuration
const config = {
    logDir: path.join(__dirname, 'monitoring-logs'),
    maxHeapSize: 512 * 1024 * 1024, // 512MB
    warningThreshold: 0.8, // 80% of max heap size
    criticalThreshold: 0.9, // 90% of max heap size
    operationTimeout: 5000, // 5 seconds
    monitoringInterval: 1000, // 1 second
    supportedBrowsers: [
        { name: 'Chrome', minVersion: '80' },
        { name: 'Firefox', minVersion: '75' },
        { name: 'Safari', minVersion: '13' },
        { name: 'Edge', minVersion: '80' }
    ]
};

// Create log directory if it doesn't exist
if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir);
}

// Monitoring state
const monitoringState = {
    startTime: Date.now(),
    security: {
        vulnerabilities: [],
        recommendations: [],
        securityScore: 0,
        scoreHistory: [],
        maxHistorySize: 100
    },
    memory: {
        logs: [],
        warnings: [],
        leaks: [],
        maxLogSize: 1000
    },
    operations: {
        active: new Map(),
        warnings: [],
        raceConditions: []
    },
    browser: {
        tests: [],
        warnings: [],
        issues: []
    }
};

// Enhanced security monitoring
const performSecurityChecks = () => {
    const checks = [
        {
            name: 'Helmet Security Headers',
            check: () => {
                const helmetConfig = app._router.stack.find(layer => layer.name === 'helmet');
                return !!helmetConfig;
            },
            weight: 10
        },
        {
            name: 'CORS Configuration',
            check: () => {
                const corsConfig = app._router.stack.find(layer => layer.name === 'cors');
                return !!corsConfig;
            },
            weight: 8
        },
        {
            name: 'Rate Limiting',
            check: () => {
                const rateLimitConfig = app._router.stack.find(layer => layer.name === 'rateLimit');
                return !!rateLimitConfig;
            },
            weight: 8
        },
        {
            name: 'Request Logging',
            check: () => {
                const morganConfig = app._router.stack.find(layer => layer.name === 'morgan');
                return !!morganConfig;
            },
            weight: 5
        },
        {
            name: 'XSS Protection',
            check: () => {
                const helmetConfig = app._router.stack.find(layer => layer.name === 'helmet');
                return helmetConfig && helmetConfig.handle.toString().includes('xssFilter');
            },
            weight: 10
        },
        {
            name: 'CSRF Protection',
            check: () => {
                const helmetConfig = app._router.stack.find(layer => layer.name === 'helmet');
                return helmetConfig && helmetConfig.handle.toString().includes('csrf');
            },
            weight: 10
        }
    ];

    let currentScore = 0;
    checks.forEach(check => {
        const result = check.check();
        if (!result) {
            monitoringState.security.vulnerabilities.push({
                type: 'Missing Security Feature',
                name: check.name,
                severity: 'high',
                description: `${check.name} is not properly configured`,
                recommendation: `Implement ${check.name} to enhance security`
            });
        }
        currentScore += result ? check.weight : 0;
    });

    // Calculate security score percentage
    const maxScore = checks.reduce((sum, check) => sum + check.weight, 0);
    const scorePercentage = (currentScore / maxScore) * 100;
    
    // Update security score history
    monitoringState.security.scoreHistory.push({
        timestamp: new Date().toISOString(),
        score: scorePercentage
    });
    
    // Maintain history size
    if (monitoringState.security.scoreHistory.length > monitoringState.security.maxHistorySize) {
        monitoringState.security.scoreHistory.shift();
    }
    
    monitoringState.security.securityScore = scorePercentage;
};

// Memory monitoring
const monitorMemory = () => {
    const heapStats = v8.getHeapStatistics();
    const memoryUsage = process.memoryUsage();
    
    const usage = {
        timestamp: new Date().toISOString(),
        heapSize: heapStats.total_heap_size,
        heapUsed: heapStats.used_heap_size,
        external: memoryUsage.external,
        rss: memoryUsage.rss
    };
    
    monitoringState.memory.logs.push(usage);
    
    // Maintain log size
    if (monitoringState.memory.logs.length > monitoringState.memory.maxLogSize) {
        monitoringState.memory.logs.shift();
    }
    
    // Check for memory warnings
    if (usage.heapUsed > config.maxHeapSize * config.warningThreshold) {
        const warning = {
            timestamp: new Date().toISOString(),
            type: 'MEMORY_WARNING',
            message: `Memory usage is high: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`
        };
        monitoringState.memory.warnings.push(warning);
    }
    
    // Check for memory leaks
    if (usage.heapUsed > config.maxHeapSize * config.criticalThreshold) {
        const leak = {
            timestamp: new Date().toISOString(),
            type: 'MEMORY_LEAK',
            message: 'Potential memory leak detected'
        };
        monitoringState.memory.leaks.push(leak);
    }
};

// Operation monitoring
class Operation {
    constructor(id, type) {
        this.id = id;
        this.type = type;
        this.startTime = Date.now();
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

const trackOperation = (id, type) => {
    const operation = new Operation(id, type);
    monitoringState.operations.active.set(id, operation);
    return operation;
};

const checkOperations = () => {
    const now = Date.now();
    
    monitoringState.operations.active.forEach((operation, id) => {
        if (operation.status === 'running' && 
            now - operation.startTime > config.operationTimeout) {
            const warning = {
                timestamp: new Date().toISOString(),
                type: 'OPERATION_TIMEOUT',
                operationId: id,
                operationType: operation.type
            };
            monitoringState.operations.warnings.push(warning);
        }
    });
};

// Browser compatibility monitoring
const checkBrowserCompatibility = (userAgent) => {
    const browser = {
        name: 'Unknown',
        version: 'Unknown',
        timestamp: new Date().toISOString()
    };
    
    if (userAgent.includes('Chrome')) {
        browser.name = 'Chrome';
        browser.version = userAgent.match(/Chrome\/(\d+)/)[1];
    } else if (userAgent.includes('Firefox')) {
        browser.name = 'Firefox';
        browser.version = userAgent.match(/Firefox\/(\d+)/)[1];
    } else if (userAgent.includes('Safari')) {
        browser.name = 'Safari';
        browser.version = userAgent.match(/Version\/(\d+)/)[1];
    } else if (userAgent.includes('Edge')) {
        browser.name = 'Edge';
        browser.version = userAgent.match(/Edge\/(\d+)/)[1];
    }
    
    const supportedBrowser = config.supportedBrowsers.find(b => b.name === browser.name);
    if (supportedBrowser && parseInt(browser.version) < parseInt(supportedBrowser.minVersion)) {
        const warning = {
            timestamp: new Date().toISOString(),
            type: 'BROWSER_VERSION_NOT_SUPPORTED',
            browser: browser.name,
            version: browser.version,
            minVersion: supportedBrowser.minVersion
        };
        monitoringState.browser.warnings.push(warning);
    }
    
    return browser;
};

// Enhanced error monitoring
const errorMonitor = {
    errors: [],
    errorCount: 0,
    errorRate: 0,
    lastErrorTime: null,
    errorThreshold: 10,
    errorWindow: 60000,
    errorCategories: {
        security: { count: 0, severity: 'high' },
        performance: { count: 0, severity: 'medium' },
        validation: { count: 0, severity: 'low' },
        system: { count: 0, severity: 'high' }
    },

    addError(error) {
        const now = Date.now();
        const errorEntry = {
            ...error,
            timestamp: now,
            id: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            category: error.category || 'system'
        };

        // Update category count
        if (this.errorCategories[errorEntry.category]) {
            this.errorCategories[errorEntry.category].count++;
        }

        this.errors.push(errorEntry);
        
        // Remove errors older than the window
        this.errors = this.errors.filter(e => now - e.timestamp < this.errorWindow);
        
        this.errorCount = this.errors.length;
        this.errorRate = this.errorCount / (this.errorWindow / 60000);
        this.lastErrorTime = now;

        // Log error to file with enhanced context
        const errorLog = {
            timestamp: new Date(now).toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                type: error.type || 'Unknown',
                severity: error.severity || 'medium',
                category: errorEntry.category
            },
            context: error.context || {},
            metrics: {
                errorCount: this.errorCount,
                errorRate: this.errorRate,
                categoryCounts: this.errorCategories
            }
        };

        fs.appendFileSync(
            path.join(__dirname, 'logs', 'errors.log'),
            JSON.stringify(errorLog) + '\n'
        );

        // Check if error rate exceeds threshold
        if (this.errorRate > this.errorThreshold) {
            monitoringState.security.vulnerabilities.push({
                type: 'High Error Rate',
                name: 'Error Rate Threshold Exceeded',
                severity: 'high',
                description: `Error rate of ${this.errorRate.toFixed(2)} errors/minute exceeds threshold of ${this.errorThreshold}`,
                recommendation: 'Investigate recent errors and implement error handling improvements',
                category: 'system'
            });
        }
    },

    getErrorReport() {
        return {
            totalErrors: this.errorCount,
            errorRate: this.errorRate,
            lastErrorTime: this.lastErrorTime ? new Date(this.lastErrorTime).toISOString() : null,
            recentErrors: this.errors.slice(-10),
            errorThreshold: this.errorThreshold,
            status: this.errorRate > this.errorThreshold ? 'critical' : 'normal',
            categories: this.errorCategories,
            trends: {
                byCategory: Object.entries(this.errorCategories).map(([category, data]) => ({
                    category,
                    count: data.count,
                    severity: data.severity
                }))
            }
        };
    }
};

// Start monitoring
setInterval(performSecurityChecks, 60000); // Every minute
setInterval(monitorMemory, 1000); // Every second
setInterval(checkOperations, 1000); // Every second

// API endpoints
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/security', (req, res) => {
    const securityReport = {
        ...monitoringState.security,
        timestamp: new Date().toISOString(),
        recommendations: [
            ...monitoringState.security.vulnerabilities.map(v => v.recommendation),
            ...monitoringState.security.recommendations
        ]
    };
    res.json(securityReport);
});

app.get('/memory', (req, res) => {
    res.json(monitoringState.memory);
});

app.get('/operations', (req, res) => {
    res.json(Array.from(monitoringState.operations.active.values()));
});

app.get('/browser', (req, res) => {
    const browser = checkBrowserCompatibility(req.headers['user-agent']);
    res.json(browser);
});

app.get('/logs', (req, res) => {
    const { date } = req.query;
    const logFile = path.join(config.logDir, `monitoring-${date || new Date().toISOString().split('T')[0]}.log`);
    
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
            error: 'Failed to read monitoring logs',
            details: error.message
        });
    }
});

// Add error monitoring endpoint
app.get('/errors', (req, res) => {
    res.json(errorMonitor.getErrorReport());
});

// Add error monitoring to middleware
app.use((err, req, res, next) => {
    errorMonitor.addError({
        message: err.message,
        stack: err.stack,
        type: err.name,
        severity: err.status >= 500 ? 'high' : 'medium',
        context: {
            path: req.path,
            method: req.method,
            status: err.status || 500
        }
    });
    next(err);
});

// Add dashboard endpoint
app.get('/dashboard', (req, res) => {
    const dashboardData = {
        timestamp: new Date().toISOString(),
        health: {
            status: 'healthy',
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development'
        },
        security: {
            score: monitoringState.security.securityScore,
            vulnerabilities: monitoringState.security.vulnerabilities,
            recommendations: monitoringState.security.recommendations
        },
        performance: {
            memory: {
                current: monitoringState.memory.logs[monitoringState.memory.logs.length - 1] || null,
                warnings: monitoringState.memory.warnings,
                leaks: monitoringState.memory.leaks
            },
            operations: {
                active: Array.from(monitoringState.operations.active.values()),
                warnings: monitoringState.operations.warnings,
                raceConditions: monitoringState.operations.raceConditions
            }
        },
        errors: errorMonitor.getErrorReport(),
        browser: {
            current: checkBrowserCompatibility(req.headers['user-agent']),
            warnings: monitoringState.browser.warnings,
            issues: monitoringState.browser.issues
        }
    };
    res.json(dashboardData);
});

// Security metrics endpoint
app.get('/api/security-metrics', (req, res) => {
    performSecurityChecks();
    res.json({
        securityScore: monitoringState.security.securityScore,
        vulnerabilities: monitoringState.security.vulnerabilities,
        recommendations: monitoringState.security.recommendations,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    // Log error to file
    const errorLog = {
        timestamp: new Date().toISOString(),
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    };
    
    fs.appendFile(
        path.join(__dirname, 'logs', 'errors.log'),
        JSON.stringify(errorLog) + '\n',
        (writeErr) => {
            if (writeErr) console.error('Failed to write error log:', writeErr);
        }
    );

    // Send error response
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal Server Error' 
            : err.message,
        status: 'error'
    });
});

// Start the server
startServer(); 