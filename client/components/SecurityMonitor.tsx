import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Shield,
  AlertTriangle,
  Activity,
  Download,
  RefreshCw,
  TrendingUp,
  Clock,
  FileWarning,
} from "lucide-react";

interface SecurityHealth {
  status: "healthy" | "warning" | "critical";
  issues: string[];
  metrics: {
    totalEvents: number;
    criticalEvents: number;
    quarantinedFiles: number;
    malwareDetected: number;
  };
}

interface SecurityStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByLevel: Record<string, number>;
}

interface SecurityAlert {
  timestamp: string;
  level: string;
  eventType: string;
  message: string;
  severity: number;
  details: Record<string, any>;
}

export default function SecurityMonitor() {
  const [health, setHealth] = useState<SecurityHealth | null>(null);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadSecurityData = async () => {
    try {
      // Load health status
      const healthResponse = await fetch("/api/security/health");
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        if (healthData.success) {
          setHealth(healthData.health);
        }
      }

      // Load statistics
      const statsResponse = await fetch("/api/security/stats?days=1");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }
      }

      // Load recent alerts
      const alertsResponse = await fetch(
        "/api/security/alerts?days=1&minSeverity=6",
      );
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        if (alertsData.success) {
          setAlerts(alertsData.alerts);
        }
      }
    } catch (error) {
      console.error("Failed to load security data:", error);
      toast.error("Erro ao carregar dados de segurança");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadSecurityData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getHealthColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <Shield className="w-5 h-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("pt-BR");
  };

  const downloadReport = async (format: "json" | "csv" = "json") => {
    try {
      const response = await fetch(
        `/api/security/report?days=7&format=${format}`,
      );

      if (format === "csv") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `security-report-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Relatório CSV baixado com sucesso!");
      } else {
        const data = await response.json();
        if (data.success) {
          const blob = new Blob([JSON.stringify(data.report, null, 2)], {
            type: "application/json",
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `security-report-${new Date().toISOString().split("T")[0]}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          toast.success("Relatório JSON baixado com sucesso!");
        }
      }
    } catch (error) {
      console.error("Failed to download report:", error);
      toast.error("Erro ao baixar relatório");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">
          Carregando monitor de segurança...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            🔍 Monitor de Segurança
          </h2>
          <p className="text-gray-600">
            Monitoramento em tempo real do sistema de upload
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={
              autoRefresh ? "bg-green-50 border-green-200 text-green-700" : ""
            }
          >
            <Activity
              className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-pulse" : ""}`}
            />
            Auto-refresh
          </Button>

          <Button variant="outline" size="sm" onClick={loadSecurityData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadReport("csv")}
          >
            <Download className="w-4 h-4 mr-2" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Health Status */}
      {health && (
        <Card className={`border-2 ${getHealthColor(health.status)}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getHealthIcon(health.status)}
                <CardTitle className="text-lg">
                  Status do Sistema:{" "}
                  {health.status === "healthy"
                    ? "Saudável"
                    : health.status === "warning"
                      ? "Atenção"
                      : "Crítico"}
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                Últimas 24h
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {health.metrics.totalEvents}
                </div>
                <div className="text-xs text-gray-500">Eventos Totais</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {health.metrics.criticalEvents}
                </div>
                <div className="text-xs text-gray-500">Eventos Críticos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {health.metrics.quarantinedFiles}
                </div>
                <div className="text-xs text-gray-500">
                  Arquivos em Quarentena
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {health.metrics.malwareDetected}
                </div>
                <div className="text-xs text-gray-500">Malware Detectado</div>
              </div>
            </div>

            {health.issues.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">⚠️ Problemas detectados:</p>
                <ul className="space-y-1">
                  {health.issues.map((issue, index) => (
                    <li
                      key={index}
                      className="text-sm bg-white/50 px-2 py-1 rounded border"
                    >
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistics and Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Statistics */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Estatísticas (24h)
              </CardTitle>
              <CardDescription>
                Distribuição de eventos por tipo e nível
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Por Tipo de Evento:</h4>
                <div className="space-y-2">
                  {Object.entries(stats.eventsByType).map(([type, count]) => (
                    <div
                      key={type}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {type}
                      </span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Por Nível de Severidade:</h4>
                <div className="space-y-2">
                  {Object.entries(stats.eventsByLevel).map(([level, count]) => (
                    <div
                      key={level}
                      className="flex justify-between items-center text-sm"
                    >
                      <span
                        className={`font-mono text-xs px-2 py-1 rounded ${
                          level === "CRITICAL"
                            ? "bg-red-100 text-red-800"
                            : level === "ERROR"
                              ? "bg-orange-100 text-orange-800"
                              : level === "WARNING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {level}
                      </span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Alertas Recentes ({alerts.length})
            </CardTitle>
            <CardDescription>
              Eventos de alta severidade das últimas 24 horas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Shield className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">Nenhum alerta de segurança!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {alerts.slice(0, 10).map((alert, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 bg-red-50 border-red-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          Sev. {alert.severity}
                        </Badge>
                        <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                          {alert.eventType}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatTime(alert.timestamp)}
                      </div>
                    </div>

                    <p className="text-sm text-gray-800 mb-2">
                      {alert.message}
                    </p>

                    {alert.details.fileName && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <FileWarning className="w-3 h-3" />
                        <span className="font-mono bg-gray-100 px-1 rounded">
                          {alert.details.fileName}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Real-time status indicator */}
      <div className="text-center text-xs text-gray-500">
        <div className="flex items-center justify-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
          ></div>
          {autoRefresh
            ? "Monitoramento ativo - Atualização automática a cada 30s"
            : "Monitoramento pausado"}
        </div>
      </div>
    </div>
  );
}
