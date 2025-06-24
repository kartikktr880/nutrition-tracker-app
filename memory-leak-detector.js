const express = require('express');
const v8 = require('v8');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4002;

// Memory monitoring configuration
const config = {
    maxHeapSize: 512 * 1024 * 1024, // 512MB
    warningThreshold: 0.8, // 80% of max heap size
    criticalThreshold: 0.9, // 90% of max heap size
    logDir: path.join(__dirname, 'memory-logs')
};

// Create log directory if it doesn't exist
if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir);
}

// Memory monitoring state
const monitoringState = {
    startTime: Date.now(),
    logs: [],
    warnings: [],
    leaks: [],
    lastHeapSize: 0,
    growthRate: 0
};

// Calculate memory usage
const getMemoryUsage = () => {
    const heapStats = v8.getHeapStatistics();
    const memoryUsage = process.memoryUsage();
    
    return {
        timestamp: new Date().toISOString(),
        heapSize: heapStats.total_heap_size,
        heapUsed: heapStats.used_heap_size,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        growthRate: monitoringState.growthRate
    };
};

// Log memory usage
const logMemoryUsage = () => {
    const usage = getMemoryUsage();
    const logEntry = {
        ...usage,
        type: 'MEMORY_USAGE'
    };
    
    monitoringState.logs.push(logEntry);
    
    // Write to file
    const logFile = path.join(config.logDir, `memory-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    
    return logEntry;
};

// Monitor memory growth
const monitorMemoryGrowth = () => {
    const currentHeapSize = v8.getHeapStatistics().used_heap_size;
    const timeDiff = Date.now() - monitoringState.startTime;
    
    if (monitoringState.lastHeapSize > 0) {
        const growth = currentHeapSize - monitoringState.lastHeapSize;
        monitoringState.growthRate = growth / timeDiff;
        
        // Check for potential memory leaks
        if (monitoringState.growthRate > 0 && currentHeapSize > config.maxHeapSize * config.warningThreshold) {
            const warning = {
                timestamp: new Date().toISOString(),
                type: 'WARNING',
                message: `Memory usage is growing at ${(monitoringState.growthRate / 1024 / 1024).toFixed(2)} MB/s`,
                heapSize: currentHeapSize,
                growthRate: monitoringState.growthRate
            };
            monitoringState.warnings.push(warning);
            
            // Log critical memory usage
            if (currentHeapSize > config.maxHeapSize * config.criticalThreshold) {
                const leak = {
                    timestamp: new Date().toISOString(),
                    type: 'CRITICAL',
                    message: 'Potential memory leak detected',
                    heapSize: currentHeapSize,
                    growthRate: monitoringState.growthRate
                };
                monitoringState.leaks.push(leak);
                
                // Write to critical log
                const criticalLogFile = path.join(config.logDir, 'critical-memory.log');
                fs.appendFileSync(criticalLogFile, JSON.stringify(leak) + '\n');
            }
        }
    }
    
    monitoringState.lastHeapSize = currentHeapSize;
};

// Start memory monitoring
setInterval(monitorMemoryGrowth, 1000);
setInterval(logMemoryUsage, 60000); // Log every minute

// API endpoints
app.get('/memory', (req, res) => {
    res.json(getMemoryUsage());
});

app.get('/warnings', (req, res) => {
    res.json(monitoringState.warnings);
});

app.get('/leaks', (req, res) => {
    res.json(monitoringState.leaks);
});

app.get('/logs', (req, res) => {
    const { date } = req.query;
    const logFile = path.join(config.logDir, `memory-${date || new Date().toISOString().split('T')[0]}.log`);
    
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
            error: 'Failed to read memory logs',
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
    console.log(`Memory Leak Detector running on http://localhost:${PORT}`);
    console.log('Health check available at /health');
    console.log('Memory monitoring available at /memory');
    console.log('Environment:', process.env.NODE_ENV || 'development');
}); 