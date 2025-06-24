const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4004;

// Browser compatibility testing configuration
const config = {
    logDir: path.join(__dirname, 'browser-logs'),
    supportedBrowsers: [
        { name: 'Chrome', minVersion: '80' },
        { name: 'Firefox', minVersion: '75' },
        { name: 'Safari', minVersion: '13' },
        { name: 'Edge', minVersion: '80' }
    ],
    featureTests: [
        {
            name: 'CSS Grid',
            test: 'display: grid',
            fallback: 'display: flex'
        },
        {
            name: 'CSS Flexbox',
            test: 'display: flex',
            fallback: 'display: block'
        },
        {
            name: 'CSS Variables',
            test: 'var(--test)',
            fallback: 'inherit'
        },
        {
            name: 'ES6 Features',
            test: 'const test = () => {}',
            fallback: 'function test() {}'
        },
        {
            name: 'Local Storage',
            test: 'localStorage',
            fallback: 'sessionStorage'
        },
        {
            name: 'Session Storage',
            test: 'sessionStorage',
            fallback: 'cookies'
        },
        {
            name: 'Web Workers',
            test: 'Worker',
            fallback: 'setTimeout'
        },
        {
            name: 'Service Workers',
            test: 'serviceWorker',
            fallback: 'app cache'
        },
        {
            name: 'IndexedDB',
            test: 'indexedDB',
            fallback: 'WebSQL'
        },
        {
            name: 'WebGL',
            test: 'WebGLRenderingContext',
            fallback: 'Canvas 2D'
        }
    ]
};

// Create log directory if it doesn't exist
if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir);
}

// Browser compatibility state
const compatibilityState = {
    startTime: Date.now(),
    tests: [],
    warnings: [],
    issues: [],
    logs: []
};

// Run feature test
const runFeatureTest = (feature) => {
    const test = {
        name: feature.name,
        timestamp: new Date().toISOString(),
        supported: false,
        fallback: feature.fallback
    };
    
    try {
        // Create test element
        const element = document.createElement('div');
        element.style.cssText = feature.test;
        
        // Check if feature is supported
        test.supported = element.style[feature.test.split(':')[0]] !== undefined;
        
        if (!test.supported) {
            const warning = {
                timestamp: new Date().toISOString(),
                type: 'FEATURE_NOT_SUPPORTED',
                feature: feature.name,
                fallback: feature.fallback
            };
            compatibilityState.warnings.push(warning);
            
            // Log warning
            const warningLogFile = path.join(config.logDir, 'feature-warnings.log');
            fs.appendFileSync(warningLogFile, JSON.stringify(warning) + '\n');
        }
    } catch (error) {
        test.error = error.message;
        const issue = {
            timestamp: new Date().toISOString(),
            type: 'FEATURE_TEST_ERROR',
            feature: feature.name,
            error: error.message
        };
        compatibilityState.issues.push(issue);
        
        // Log issue
        const issueLogFile = path.join(config.logDir, 'feature-issues.log');
        fs.appendFileSync(issueLogFile, JSON.stringify(issue) + '\n');
    }
    
    compatibilityState.tests.push(test);
    return test;
};

// Check browser compatibility
const checkBrowserCompatibility = (userAgent) => {
    const browser = {
        name: 'Unknown',
        version: 'Unknown',
        timestamp: new Date().toISOString()
    };
    
    // Parse user agent
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
    
    // Check if browser is supported
    const supportedBrowser = config.supportedBrowsers.find(b => b.name === browser.name);
    if (supportedBrowser && parseInt(browser.version) < parseInt(supportedBrowser.minVersion)) {
        const warning = {
            timestamp: new Date().toISOString(),
            type: 'BROWSER_VERSION_NOT_SUPPORTED',
            browser: browser.name,
            version: browser.version,
            minVersion: supportedBrowser.minVersion
        };
        compatibilityState.warnings.push(warning);
        
        // Log warning
        const warningLogFile = path.join(config.logDir, 'browser-warnings.log');
        fs.appendFileSync(warningLogFile, JSON.stringify(warning) + '\n');
    }
    
    return browser;
};

// Log compatibility state
const logCompatibilityState = () => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        tests: compatibilityState.tests,
        warnings: compatibilityState.warnings,
        issues: compatibilityState.issues
    };
    
    compatibilityState.logs.push(logEntry);
    
    // Write to file
    const logFile = path.join(config.logDir, `compatibility-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
};

// API endpoints
app.get('/tests', (req, res) => {
    res.json(compatibilityState.tests);
});

app.get('/warnings', (req, res) => {
    res.json(compatibilityState.warnings);
});

app.get('/issues', (req, res) => {
    res.json(compatibilityState.issues);
});

app.get('/browser', (req, res) => {
    const browser = checkBrowserCompatibility(req.headers['user-agent']);
    res.json(browser);
});

app.get('/logs', (req, res) => {
    const { date } = req.query;
    const logFile = path.join(config.logDir, `compatibility-${date || new Date().toISOString().split('T')[0]}.log`);
    
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
            error: 'Failed to read compatibility logs',
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
    console.log(`Browser Compatibility Tester running on http://localhost:${PORT}`);
    console.log('Health check available at /health');
    console.log('Browser compatibility testing available at /browser');
    console.log('Environment:', process.env.NODE_ENV || 'development');
}); 