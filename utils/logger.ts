export function logError(message: string, error?: Error | unknown) {
  if (error instanceof Error) {
    console.error(message, error);
  } else {
    console.error(message, error);
  }
}

export function logWarn(message: string, error?: Error | unknown) {
  if (error instanceof Error) {
    console.warn(message, error);
  } else {
    console.warn(message, error);
  }
}

export function logInfo(message: string, ...args: any[]) {
  console.info(message, ...args);
}

export function logDebug(message: string, ...args: any[]) {
  console.debug(message, ...args);
}