// Memory Monitor Widget (Developer Only)
(function() {
    // Only show in development mode
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'development') return;
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return;

    // Check if performance.memory is supported
    const hasMemory = performance && performance.memory && performance.memory.usedJSHeapSize !== undefined;
    if (!hasMemory) return;

    // Create widget
    const widget = document.createElement('div');
    widget.className = 'memory-monitor-widget';
    widget.innerHTML = `
        <strong>Memory Usage</strong><br>
        <span class="heap">Heap: -- MB</span><br>
        <span class="limit">Limit: -- MB</span>
    `;
    document.body.appendChild(widget);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .memory-monitor-widget {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #222;
            color: #fff;
            padding: 10px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-family: monospace;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            opacity: 0.85;
            pointer-events: none;
        }
        .memory-monitor-widget strong {
            font-size: 15px;
        }
    `;
    document.head.appendChild(style);

    // Update function
    function updateMemory() {
        const mem = performance.memory;
        const heapMB = (mem.usedJSHeapSize / 1024 / 1024).toFixed(1);
        const limitMB = (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(0);
        widget.querySelector('.heap').textContent = `Heap: ${heapMB} MB`;
        widget.querySelector('.limit').textContent = `Limit: ${limitMB} MB`;
    }

    updateMemory();
    setInterval(updateMemory, 2000);
})(); 