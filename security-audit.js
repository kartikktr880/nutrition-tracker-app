const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4001; // Using different port than main API

// Security audit results storage
const auditResults = {
    timestamp: new Date().toISOString(),
    vulnerabilities: [],
    recommendations: [],
    securityScore: 0
};

// Basic security checks
const performBasicSecurityChecks = () => {
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
        }
    ];

    checks.forEach(check => {
        const result = check.check();
        if (!result) {
            auditResults.vulnerabilities.push({
                type: 'Missing Security Feature',
                name: check.name,
                severity: 'high',
                description: `${check.name} is not properly configured`
            });
        }
        auditResults.securityScore += result ? check.weight : 0;
    });
};

// Dependency vulnerability check
const checkDependencies = () => {
    return new Promise((resolve, reject) => {
        exec('npm audit --json', (error, stdout, stderr) => {
            if (error) {
                auditResults.vulnerabilities.push({
                    type: 'Dependency Check Error',
                    severity: 'high',
                    description: `Failed to check dependencies: ${error.message}`
                });
                resolve();
                return;
            }

            try {
                const auditData = JSON.parse(stdout);
                if (auditData.vulnerabilities) {
                    Object.entries(auditData.vulnerabilities).forEach(([pkg, vuln]) => {
                        auditResults.vulnerabilities.push({
                            type: 'Dependency Vulnerability',
                            package: pkg,
                            severity: vuln.severity,
                            description: vuln.description
                        });
                    });
                }
            } catch (e) {
                auditResults.vulnerabilities.push({
                    type: 'Dependency Check Error',
                    severity: 'high',
                    description: `Failed to parse audit results: ${e.message}`
                });
            }
            resolve();
        });
    });
};

// Security headers check
const checkSecurityHeaders = (req, res) => {
    const headers = res.getHeaders();
    const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security',
        'content-security-policy'
    ];

    requiredHeaders.forEach(header => {
        if (!headers[header]) {
            auditResults.vulnerabilities.push({
                type: 'Missing Security Header',
                header,
                severity: 'medium',
                description: `Security header ${header} is missing`
            });
        }
    });
};

// API endpoint to trigger security audit
app.get('/audit', async (req, res) => {
    try {
        // Reset audit results
        auditResults.timestamp = new Date().toISOString();
        auditResults.vulnerabilities = [];
        auditResults.recommendations = [];
        auditResults.securityScore = 0;

        // Perform security checks
        performBasicSecurityChecks();
        await checkDependencies();

        // Generate recommendations
        auditResults.vulnerabilities.forEach(vuln => {
            auditResults.recommendations.push({
                issue: vuln.type,
                recommendation: `Address ${vuln.type.toLowerCase()} by implementing proper security measures`
            });
        });

        // Calculate final security score
        const maxScore = 100;
        const currentScore = auditResults.securityScore;
        const vulnDeduction = auditResults.vulnerabilities.length * 5;
        auditResults.securityScore = Math.max(0, currentScore - vulnDeduction);

        res.json(auditResults);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to perform security audit',
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
    console.log(`Security Audit API running on http://localhost:${PORT}`);
    console.log('Health check available at /health');
    console.log('Security audit available at /audit');
    console.log('Environment:', process.env.NODE_ENV || 'development');
}); 