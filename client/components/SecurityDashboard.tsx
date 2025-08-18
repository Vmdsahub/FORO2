import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertTriangle,
  Shield,
  FileWarning,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface QuarantinedFile {
  originalPath: string;
  quarantineTime: string;
  hash: string;
  reasons: string[];
  status: string;
}

interface UploadStats {
  safeFiles: number;
  quarantined: {
    total: number;
    recent: number;
  };
  configuration: {
    maxFileSize: number;
    allowedExtensions: string[];
    allowedMimeTypes: string[];
  };
}

export default function SecurityDashboard() {
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [quarantinedFiles, setQuarantinedFiles] = useState<QuarantinedFile[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setIsRefreshing(true);

      // Load upload statistics
      const statsResponse = await fetch("/api/upload-stats");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }
      }

      // Load quarantined files
      const quarantineResponse = await fetch("/api/quarantine-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ action: "list" }),
      });

      if (quarantineResponse.ok) {
        const quarantineData = await quarantineResponse.json();
        if (quarantineData.success) {
          setQuarantinedFiles(quarantineData.quarantined || []);
        }
      }
    } catch (error) {
      console.error("Failed to load security dashboard data:", error);
      toast.error("Erro ao carregar dados de segurança");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getSeverityColor = (reasons: string[]): string => {
    if (
      reasons.some(
        (r) =>
          r.toLowerCase().includes("executable") ||
          r.toLowerCase().includes("script"),
      )
    ) {
      return "bg-red-100 text-red-800 border-red-200";
    }
    if (
      reasons.some(
        (r) =>
          r.toLowerCase().includes("macro") ||
          r.toLowerCase().includes("suspicious"),
      )
    ) {
      return "bg-orange-100 text-orange-800 border-orange-200";
    }
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">
          Carregando painel de segurança...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🔒 Painel de Segurança
          </h1>
          <p className="text-gray-600">
            Sistema de upload seguro com validação avançada
          </p>
        </div>
        <Button
          onClick={loadData}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Atualizar
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Arquivos Seguros
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.safeFiles}
              </div>
              <p className="text-xs text-gray-500">Verificados e aprovados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Em Quarentena
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.quarantined.total}
              </div>
              <p className="text-xs text-gray-500">
                {stats.quarantined.recent} nas últimas 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tamanho Máximo
              </CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatFileSize(stats.configuration.maxFileSize)}
              </div>
              <p className="text-xs text-gray-500">Limite por arquivo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tipos Permitidos
              </CardTitle>
              <FileWarning className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.configuration.allowedExtensions.length}
              </div>
              <p className="text-xs text-gray-500">Extensões suportadas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configuration Details */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Configuração de Segurança
            </CardTitle>
            <CardDescription>
              Configurações atuais do sistema de validação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Extensões Permitidas:</h4>
              <div className="flex flex-wrap gap-1">
                {stats.configuration.allowedExtensions.map((ext) => (
                  <Badge key={ext} variant="secondary" className="text-xs">
                    {ext}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Tipos MIME Permitidos:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                {stats.configuration.allowedMimeTypes.map((mime) => (
                  <div
                    key={mime}
                    className="bg-gray-50 px-2 py-1 rounded text-xs"
                  >
                    {mime}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quarantined Files */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Arquivos em Quarentena ({quarantinedFiles.length})
          </CardTitle>
          <CardDescription>
            Arquivos bloqueados devido a problemas de segurança
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quarantinedFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">Nenhum arquivo em quarentena!</p>
              <p className="text-sm">
                Todos os uploads foram aprovados pela validação de segurança.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quarantinedFiles.map((file, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 bg-red-50 border-red-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="font-medium text-gray-900">
                          {file.originalPath.split("/").pop() ||
                            "Arquivo desconhecido"}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {file.status}
                        </Badge>
                      </div>

                      <div className="text-sm text-gray-600 mb-3">
                        <p>
                          <strong>Quarentena:</strong>{" "}
                          {formatDate(file.quarantineTime)}
                        </p>
                        <p>
                          <strong>Hash:</strong>{" "}
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {file.hash.substring(0, 16)}...
                          </code>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-red-800">
                          Problemas detectados:
                        </p>
                        <div className="space-y-1">
                          {file.reasons.map((reason, reasonIndex) => (
                            <div
                              key={reasonIndex}
                              className={`text-xs px-2 py-1 rounded border ${getSeverityColor(file.reasons)}`}
                            >
                              {reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Recomendações de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">
                Sistema de Validação Ativo
              </p>
              <p className="text-sm text-blue-700">
                Todos os arquivos passam por verificação automática de segurança
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">Detecção de Malware</p>
              <p className="text-sm text-green-700">
                Padrões maliciosos são identificados e bloqueados
                automaticamente
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">
                Quarentena Automática
              </p>
              <p className="text-sm text-yellow-700">
                Arquivos suspeitos são isolados e não ficam acessíveis ao
                público
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
