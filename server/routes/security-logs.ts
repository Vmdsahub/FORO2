import { RequestHandler } from "express";
import {
  securityLogger,
  SecurityLogLevel,
  SecurityEventType,
} from "../security/logger";

// Get security statistics
export const handleSecurityStats: RequestHandler = (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const stats = securityLogger.getLogStats(days);

    // Convert Maps to objects for JSON serialization
    const response = {
      success: true,
      timeframe: `${days} days`,
      stats: {
        totalEvents: stats.totalEvents,
        eventsByType: Object.fromEntries(stats.eventsByType),
        eventsByLevel: Object.fromEntries(stats.eventsByLevel),
        topThreats: stats.topThreats,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("[SECURITY STATS] Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get security statistics",
    });
  }
};

// Get recent security logs
export const handleSecurityLogs: RequestHandler = (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 1;
    const level = req.query.level as string;
    const eventType = req.query.eventType as string;
    const limit = parseInt(req.query.limit as string) || 100;

    let logs = securityLogger.exportLogs(days);

    // Filter by level if specified
    if (level) {
      logs = logs.filter((log) => log.level === level);
    }

    // Filter by event type if specified
    if (eventType) {
      logs = logs.filter((log) => log.eventType === eventType);
    }

    // Limit results
    logs = logs.slice(0, limit);

    res.json({
      success: true,
      logs,
      total: logs.length,
      filters: { days, level, eventType, limit },
    });
  } catch (error) {
    console.error("[SECURITY LOGS] Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get security logs",
    });
  }
};

// Get security alerts (high severity events)
export const handleSecurityAlerts: RequestHandler = (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 1;
    const minSeverity = parseInt(req.query.minSeverity as string) || 7;

    const logs = securityLogger.exportLogs(days);
    const alerts = logs.filter((log) => log.severity >= minSeverity);

    res.json({
      success: true,
      alerts,
      total: alerts.length,
      criteria: { days, minSeverity },
    });
  } catch (error) {
    console.error("[SECURITY ALERTS] Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get security alerts",
    });
  }
};

// Security health check
export const handleSecurityHealth: RequestHandler = (req, res) => {
  try {
    const stats = securityLogger.getLogStats(1); // Last 24 hours

    // Define health criteria
    const health = {
      status: "healthy" as "healthy" | "warning" | "critical",
      issues: [] as string[],
      metrics: {
        totalEvents: stats.totalEvents,
        criticalEvents: stats.eventsByLevel.get(SecurityLogLevel.CRITICAL) || 0,
        quarantinedFiles:
          stats.eventsByType.get(SecurityEventType.FILE_QUARANTINE) || 0,
        malwareDetected:
          stats.eventsByType.get(SecurityEventType.MALWARE_DETECTED) || 0,
      },
    };

    // Check for critical issues
    if (health.metrics.malwareDetected > 0) {
      health.status = "critical";
      health.issues.push(
        `${health.metrics.malwareDetected} malware detection(s) in last 24h`,
      );
    }

    if (health.metrics.quarantinedFiles > 10) {
      health.status = health.status === "critical" ? "critical" : "warning";
      health.issues.push(
        `High quarantine rate: ${health.metrics.quarantinedFiles} files`,
      );
    }

    if (health.metrics.criticalEvents > 5) {
      health.status = health.status === "critical" ? "critical" : "warning";
      health.issues.push(
        `${health.metrics.criticalEvents} critical security events`,
      );
    }

    res.json({
      success: true,
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SECURITY HEALTH] Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check security health",
      health: {
        status: "critical",
        issues: ["Health check system failure"],
        metrics: {},
      },
    });
  }
};

// Export security report
export const handleSecurityReport: RequestHandler = (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const format = (req.query.format as string) || "json";

    const stats = securityLogger.getLogStats(days);
    const logs = securityLogger.exportLogs(days);

    const report = {
      generatedAt: new Date().toISOString(),
      timeframe: `${days} days`,
      summary: {
        totalEvents: stats.totalEvents,
        eventsByType: Object.fromEntries(stats.eventsByType),
        eventsByLevel: Object.fromEntries(stats.eventsByLevel),
        topThreats: stats.topThreats,
      },
      criticalEvents: logs.filter((log) => log.severity >= 8),
      recentAlerts: logs
        .filter((log) => log.level === SecurityLogLevel.CRITICAL)
        .slice(0, 20),
    };

    if (format === "csv") {
      // Convert to CSV format
      const csvHeader =
        "Timestamp,Level,Event Type,Message,Severity,User ID,File Name,IP\n";
      const csvRows = logs
        .map(
          (log) =>
            `"${log.timestamp}","${log.level}","${log.eventType}","${log.message.replace(/"/g, '""')}",${log.severity},"${log.details.userId || ""}","${log.details.fileName || ""}","${log.details.ip || ""}"`,
        )
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="security-report-${new Date().toISOString().split("T")[0]}.csv"`,
      );
      res.send(csvHeader + csvRows);
    } else {
      res.json({
        success: true,
        report,
      });
    }
  } catch (error) {
    console.error("[SECURITY REPORT] Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate security report",
    });
  }
};
