// Minimal WebGLInfo interface for getWebGLInfo
interface WebGLInfo {
    vendor: string;
    renderer: string;
}
// Fallback for BatteryManager if not available in the global scope
// (If your TS config includes dom lib, you can remove this)
type BatteryManager = any;
// Add getBattery to Navigator if not present
declare global {
    interface Navigator {
        getBattery?: () => Promise<BatteryManager>;
    }
}

export class WebUtils {
    static getBrowserInfo(): { name: string; version: string } {
        const userAgent = navigator.userAgent;
        let browserName = 'Unknown';
        let browserVersion = 'Unknown';

        // Chrome
        if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1 && userAgent.indexOf('OPR') === -1) {
            browserName = 'Chrome';
            browserVersion = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/)?.[1] || 'Unknown';
        }
        // Edge
        else if (userAgent.indexOf('Edg') > -1) {
            browserName = 'Edge';
            browserVersion = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/)?.[1] || 'Unknown';
        }
        // Firefox
        else if (userAgent.indexOf('Firefox') > -1) {
            browserName = 'Firefox';
            browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown';
        }
        // Safari
        else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
            browserName = 'Safari';
            browserVersion = userAgent.match(/Version\/(\d+\.\d+\.\d+)/)?.[1] || 'Unknown';
        }
        // Opera
        else if (userAgent.indexOf('OPR') > -1) {
            browserName = 'Opera';
            browserVersion = userAgent.match(/OPR\/(\d+\.\d+\.\d+)/)?.[1] || 'Unknown';
        }

        return { name: browserName, version: browserVersion };
    }

    static getDeviceInfo(): { type: string; isMobile: boolean; isTablet: boolean; isDesktop: boolean } {
        const userAgent = navigator.userAgent;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
        const isDesktop = !isMobile && !isTablet;

        let deviceType = 'Desktop';
        if (isMobile) deviceType = 'Mobile';
        if (isTablet) deviceType = 'Tablet';

        return {
            type: deviceType,
            isMobile,
            isTablet,
            isDesktop
        };
    }

    static getScreenInfo(): { width: number; height: number; pixelRatio: number; orientation: string } {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            pixelRatio: window.devicePixelRatio,
            orientation: window.screen.orientation.type
        };
    }

    static getNetworkInfo(): Promise<{ online: boolean; effectiveType: string; downlink: number; rtt: number }> {
        return new Promise((resolve) => {
            const connection = (navigator as any).connection;
            if (connection) {
                resolve({
                    online: navigator.onLine,
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt
                });
            } else {
                resolve({
                    online: navigator.onLine,
                    effectiveType: 'unknown',
                    downlink: 0,
                    rtt: 0
                });
            }
        });
    }

    static getLocation(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
    }

    static getBatteryInfo(): Promise<BatteryManager> {
        return new Promise((resolve, reject) => {
            if (!navigator.getBattery) {
                reject(new Error('Battery API is not supported by your browser'));
                return;
            }

            navigator.getBattery().then(resolve).catch(reject);
        });
    }

    static getLanguageInfo(): { language: string; languages: string[] } {
        return {
            language: navigator.language,
            languages: Array.from(navigator.languages)
        };
    }

    static getTimezoneInfo(): { timezone: string; offset: number } {
        const date = new Date();
        return {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            offset: date.getTimezoneOffset()
        };
    }

    static getCookiesEnabled(): boolean {
        return navigator.cookieEnabled;
    }

    static getDoNotTrack(): boolean {
        return navigator.doNotTrack === '1';
    }

    static getWebGLInfo(): WebGLInfo | null {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                return null;
            }

            const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
            
            if (!debugInfo) {
                return {
                    vendor: 'Unknown',
                    renderer: 'Unknown'
                };
            }

            return {
                vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                renderer: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            };
        } catch (error) {
            console.warn('Failed to get WebGL info:', error);
            return null;
        }
    }

    static getWebRTCInfo(): Promise<{ hasWebRTC: boolean; hasGetUserMedia: boolean; hasRTCPeerConnection: boolean }> {
        return new Promise((resolve) => {
            const hasWebRTC = !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection);
            const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            const hasRTCPeerConnection = !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection);

            resolve({
                hasWebRTC,
                hasGetUserMedia,
                hasRTCPeerConnection
            });
        });
    }

    static getWebWorkerInfo(): boolean {
        return typeof Worker !== 'undefined';
    }

    static getServiceWorkerInfo(): Promise<boolean> {
        return new Promise((resolve) => {
            if (!('serviceWorker' in navigator)) {
                resolve(false);
                return;
            }

            navigator.serviceWorker.ready
                .then(() => resolve(true))
                .catch(() => resolve(false));
        });
    }

    static getIndexedDBInfo(): boolean {
        return !!window.indexedDB;
    }

    static getLocalStorageInfo(): boolean {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    }

    static getSessionStorageInfo(): boolean {
        try {
            sessionStorage.setItem('test', 'test');
            sessionStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    }
}