/**
 * Structured logging utility for debugging and monitoring.
 * Provides consistent log format with timestamps, context, and severity levels.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: Record<string, unknown>;
  requestId?: string;
  error?: string;
}

/**
 * Logger instance that provides structured logging across the app.
 */
export class Logger {
  private component: string;
  private requestId?: string;

  constructor(component: string, requestId?: string) {
    this.component = component;
    this.requestId = requestId;
  }

  /**
   * Set or update request ID for correlation
   */
  setRequestId(id: string) {
    this.requestId = id;
  }

  /**
   * Log at debug level (development only)
   */
  debug(message: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      this.log("debug", message, data);
    }
  }

  /**
   * Log at info level
   */
  info(message: string, data?: Record<string, unknown>) {
    this.log("info", message, data);
  }

  /**
   * Log at warn level
   */
  warn(message: string, data?: Record<string, unknown>) {
    this.log("warn", message, data);
  }

  /**
   * Log at error level
   */
  error(message: string, err?: Error | string, data?: Record<string, unknown>) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    this.log("error", message, data, errorMsg);
  }

  /**
   * Internal logging method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    errorMsg?: string
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      ...(data && { data }),
      ...(this.requestId && { requestId: this.requestId }),
      ...(errorMsg && { error: errorMsg }),
    };

    // Use appropriate console method
    const logFn = level === "error" ? console.error : console[level];
    logFn(JSON.stringify(entry));
  }
}

/**
 * Create a logger for a component
 */
export function createLogger(component: string, requestId?: string): Logger {
  return new Logger(component, requestId);
}

/**
 * Generate a unique request ID for correlation
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
