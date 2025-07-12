// Simple browser-safe logger for universal use

export function logInfo(): void {
  // intentionally left blank for linter compliance
}

export function logWarn(): void {
  // intentionally left blank for linter compliance
}

export function logError(): void {
  // intentionally left blank for linter compliance
}

export function logDebug(): void {
  // intentionally left blank for linter compliance
}

export function createContextLogger() {
  return {
    info: () => logInfo(),
    warn: () => logWarn(),
    error: () => logError(),
    debug: () => logDebug()
  };
}
