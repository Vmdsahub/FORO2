import fs from "fs";
import path from "path";

export enum SecurityLogLevel {
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL",
}

export enum SecurityEventType {
  FILE_UPLOAD = "FILE_UPLOAD",
  FILE_VALIDATION = "FILE_VALIDATION",
  FILE_QUARANTINE = "FILE_QUARANTINE",
  MALWARE_DETECTED = "MALWARE_DETECTED",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  SYSTEM_EVENT = "SYSTEM_EVENT",
  ACCESS_ATTEMPT = "ACCESS_ATTEMPT",
}

export interface SecurityLogEntry {
  timestamp: string;
  level: SecurityLogLevel;
  eventType: SecurityEventType;
  message: string;
  details: {
    userId?: string;
    userAgent?: string;
    ip?: string;
    fileName?: string;
    fileHash?: string;
    fileSize?: number;
    mimeType?: string;
    reasons?: string[];
    action?: string;
    alertType?: string;
    eventType?: string;
    count?: number;
    threshold?: number;
    timeWindow?: string;
    malwareType?: string;
    resource?: string;
    success?: boolean;
    metadata?: Record<string, any>;
  };
  severity: number; // 1-10 scale
}

export class SecurityLogger {
  private logDir: string;
  private maxLogSize: number;
  private maxLogFiles: number;
  private alertThresholds: Map<SecurityEventType, number>;

  constructor() {
    this.logDir = path.join(process.cwd(), "logs", "security");
    this.maxLogSize = 10 * 1024 * 1024; // 10MB per log file
    this.maxLogFiles = 30; // Keep 30 log files

    // Alert thresholds (events per hour)
    this.alertThresholds = new Map([
      [SecurityEventType.MALWARE_DETECTED, 1],
      [SecurityEventType.FILE_QUARANTINE, 5],
      [SecurityEventType.SUSPICIOUS_ACTIVITY, 10],
    ]);

    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(
    level: SecurityLogLevel,
    eventType: SecurityEventType,
    message: string,
    details: SecurityLogEntry["details"] = {},
    severity: number = 5,
  ): void {
    const logEntry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      eventType,
      message,
      details,
      severity,
    };

    // Write to file
    this.writeToFile(logEntry);

    // Console output for development
    if (process.env.NODE_ENV !== "production") {
      this.consoleLog(logEntry);
    }

    // Check for alert conditions
    this.checkAlertConditions(logEntry);

    // Rotate logs if needed
    this.rotateLogsIfNeeded();
  }

  private writeToFile(entry: SecurityLogEntry): void {
    try {
      const today = new Date().toISOString().split("T")[0];
      const logFile = path.join(this.logDir, `security-${today}.log`);

      const logLine = JSON.stringify(entry) + "\n";
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error("[SECURITY LOGGER] Failed to write log:", error);
    }
  }

  private consoleLog(entry: SecurityLogEntry): void {
    const colors = {
      [SecurityLogLevel.INFO]: "\x1b[36m", // Cyan
      [SecurityLogLevel.WARNING]: "\x1b[33m", // Yellow
      [SecurityLogLevel.ERROR]: "\x1b[31m", // Red
      [SecurityLogLevel.CRITICAL]: "\x1b[35m", // Magenta
    };

    const reset = "\x1b[0m";
    const color = colors[entry.level] || "";

    console.log(
      `${color}[SECURITY ${entry.level}]${reset} ${entry.timestamp} - ${entry.eventType}: ${entry.message}`,
    );

    if (Object.keys(entry.details).length > 0) {
      console.log(`${color}  Details:${reset}`, entry.details);
    }
  }

  private checkAlertConditions(entry: SecurityLogEntry): void {
    const threshold = this.alertThresholds.get(entry.eventType);
    if (!threshold) return;

    // Count recent events of this type
    const recentCount = this.getRecentEventCount(entry.eventType, 60); // Last hour

    if (recentCount >= threshold) {
      this.triggerAlert(entry.eventType, recentCount, threshold);
    }
  }

  private getRecentEventCount(
    eventType: SecurityEventType,
    minutes: number,
  ): number {
    try {
      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
      const today = new Date().toISOString().split("T")[0];
      const logFile = path.join(this.logDir, `security-${today}.log`);

      if (!fs.existsSync(logFile)) return 0;

      const logContent = fs.readFileSync(logFile, "utf-8");
      const lines = logContent.split("\n").filter((line) => line.trim());

      let count = 0;
      for (const line of lines) {
        try {
          const entry: SecurityLogEntry = JSON.parse(line);
          if (
            entry.eventType === eventType &&
            new Date(entry.timestamp) > cutoffTime
          ) {
            count++;
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      return count;
    } catch {
      return 0;
    }
  }

  private triggerAlert(
    eventType: SecurityEventType,
    count: number,
    threshold: number,
  ): void {
    const alertEntry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      level: SecurityLogLevel.CRITICAL,
      eventType: SecurityEventType.SYSTEM_EVENT,
      message: `SECURITY ALERT: High frequency of ${eventType} events detected`,
      details: {
        alertType: "FREQUENCY_THRESHOLD_EXCEEDED",
        eventType,
        count,
        threshold,
        timeWindow: "1 hour",
      },
      severity: 9,
    };

    this.writeToFile(alertEntry);

    // In production, you might want to send notifications here
    console.error(
      `🚨 SECURITY ALERT: ${count} ${eventType} events in the last hour (threshold: ${threshold})`,
    );
  }

  private rotateLogsIfNeeded(): void {
    try {
      const files = fs
        .readdirSync(this.logDir)
        .filter((f) => f.startsWith("security-") && f.endsWith(".log"))
        .map((f) => ({
          name: f,
          path: path.join(this.logDir, f),
          stats: fs.statSync(path.join(this.logDir, f)),
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Check current file size
      if (files.length > 0 && files[0].stats.size > this.maxLogSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const archiveName = files[0].name.replace(".log", `-${timestamp}.log`);
        const archivePath = path.join(this.logDir, "archive", archiveName);

        // Ensure archive directory exists
        const archiveDir = path.dirname(archivePath);
        if (!fs.existsSync(archiveDir)) {
          fs.mkdirSync(archiveDir, { recursive: true });
        }

        fs.renameSync(files[0].path, archivePath);
      }

      // Remove old log files
      if (files.length > this.maxLogFiles) {
        const filesToDelete = files.slice(this.maxLogFiles);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
        }
      }
    } catch (error) {
      console.error("[SECURITY LOGGER] Log rotation failed:", error);
    }
  }

  // Public methods for common security events
  logFileUpload(
    userId: string,
    fileName: string,
    fileSize: number,
    ip?: string,
    userAgent?: string,
  ): void {
    this.log(
      SecurityLogLevel.INFO,
      SecurityEventType.FILE_UPLOAD,
      `File upload initiated: ${fileName}`,
      { userId, fileName, fileSize, ip, userAgent },
      3,
    );
  }

  logFileValidation(
    fileName: string,
    fileHash: string,
    isValid: boolean,
    reasons?: string[],
  ): void {
    this.log(
      isValid ? SecurityLogLevel.INFO : SecurityLogLevel.WARNING,
      SecurityEventType.FILE_VALIDATION,
      `File validation ${isValid ? "passed" : "failed"}: ${fileName}`,
      { fileName, fileHash, reasons },
      isValid ? 2 : 6,
    );
  }

  logFileQuarantine(
    fileName: string,
    fileHash: string,
    reasons: string[],
    userId?: string,
  ): void {
    this.log(
      SecurityLogLevel.ERROR,
      SecurityEventType.FILE_QUARANTINE,
      `File quarantined: ${fileName}`,
      { fileName, fileHash, reasons, userId, action: "QUARANTINE" },
      7,
    );
  }

  logMalwareDetected(
    fileName: string,
    fileHash: string,
    malwareType: string,
    userId?: string,
  ): void {
    this.log(
      SecurityLogLevel.CRITICAL,
      SecurityEventType.MALWARE_DETECTED,
      `MALWARE DETECTED in file: ${fileName}`,
      { fileName, fileHash, malwareType, userId, action: "BLOCK" },
      10,
    );
  }

  logSuspiciousActivity(
    activity: string,
    details: Record<string, any>,
    userId?: string,
    ip?: string,
  ): void {
    this.log(
      SecurityLogLevel.WARNING,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      `Suspicious activity: ${activity}`,
      { ...details, userId, ip },
      6,
    );
  }

  logAccessAttempt(
    resource: string,
    success: boolean,
    userId?: string,
    ip?: string,
    userAgent?: string,
  ): void {
    this.log(
      success ? SecurityLogLevel.INFO : SecurityLogLevel.WARNING,
      SecurityEventType.ACCESS_ATTEMPT,
      `Access ${success ? "granted" : "denied"} to ${resource}`,
      { resource, success, userId, ip, userAgent },
      success ? 2 : 5,
    );
  }

  // Get log statistics
  getLogStats(days: number = 7): {
    totalEvents: number;
    eventsByType: Map<SecurityEventType, number>;
    eventsByLevel: Map<SecurityLogLevel, number>;
    topThreats: Array<{ fileName: string; count: number; reasons: string[] }>;
  } {
    const stats = {
      totalEvents: 0,
      eventsByType: new Map<SecurityEventType, number>(),
      eventsByLevel: new Map<SecurityLogLevel, number>(),
      topThreats: [] as Array<{
        fileName: string;
        count: number;
        reasons: string[];
      }>,
    };

    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Read log files from the last `days` days
      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split("T")[0];
        const logFile = path.join(this.logDir, `security-${dateStr}.log`);

        if (fs.existsSync(logFile)) {
          const logContent = fs.readFileSync(logFile, "utf-8");
          const lines = logContent.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const entry: SecurityLogEntry = JSON.parse(line);
              if (new Date(entry.timestamp) > cutoffDate) {
                stats.totalEvents++;

                // Count by type
                const typeCount = stats.eventsByType.get(entry.eventType) || 0;
                stats.eventsByType.set(entry.eventType, typeCount + 1);

                // Count by level
                const levelCount = stats.eventsByLevel.get(entry.level) || 0;
                stats.eventsByLevel.set(entry.level, levelCount + 1);
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error("[SECURITY LOGGER] Failed to get stats:", error);
    }

    return stats;
  }

  // Export logs for analysis
  exportLogs(days: number = 1): SecurityLogEntry[] {
    const logs: SecurityLogEntry[] = [];

    try {
      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split("T")[0];
        const logFile = path.join(this.logDir, `security-${dateStr}.log`);

        if (fs.existsSync(logFile)) {
          const logContent = fs.readFileSync(logFile, "utf-8");
          const lines = logContent.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const entry: SecurityLogEntry = JSON.parse(line);
              logs.push(entry);
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error("[SECURITY LOGGER] Failed to export logs:", error);
    }

    return logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }
}

// Global logger instance
export const securityLogger = new SecurityLogger();
