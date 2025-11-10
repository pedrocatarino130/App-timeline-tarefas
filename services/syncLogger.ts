/**
 * 🔥 TASK-001: Sistema de Logging Estruturado
 *
 * Sistema de logging para debug e monitoramento de sincronização.
 * Implementa níveis de log, rotação automática e export.
 */

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  operation: string;
  deviceId: string;
  data?: any;
  hash?: string;
}

class SyncLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private deviceId: string;
  private enabledLevels: Set<LogLevel>;

  constructor(deviceId: string, enabledLevels: LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG']) {
    this.deviceId = deviceId;
    this.enabledLevels = new Set(enabledLevels);
  }

  /**
   * Registra uma entrada de log
   */
  log(level: LogLevel, operation: string, data?: any, hash?: string): void {
    if (!this.enabledLevels.has(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      operation,
      deviceId: this.deviceId,
      data,
      hash,
    };

    // Rotação automática: mantém apenas os últimos maxLogs
    if (this.logs.length >= this.maxLogs) {
      this.logs.shift(); // Remove o mais antigo
    }

    this.logs.push(entry);

    // Console colorido por nível
    this.logToConsole(entry);
  }

  /**
   * Log formatado no console com cores
   */
  private logToConsole(entry: LogEntry): void {
    const time = new Date(entry.timestamp).toISOString();
    const prefix = this.getColoredPrefix(entry.level);
    const deviceShort = entry.deviceId.substring(0, 12);
    const hashStr = entry.hash ? ` [hash:${entry.hash.substring(0, 8)}]` : '';

    console.log(
      `${prefix} [${time}] [${deviceShort}]${hashStr} ${entry.operation}`,
      entry.data || ''
    );
  }

  /**
   * Retorna prefixo colorido por nível
   */
  private getColoredPrefix(level: LogLevel): string {
    switch (level) {
      case 'ERROR':
        return '🔴 ERROR';
      case 'WARN':
        return '🟡 WARN';
      case 'INFO':
        return '🔵 INFO';
      case 'DEBUG':
        return '⚪ DEBUG';
    }
  }

  /**
   * Atalhos para cada nível
   */
  error(operation: string, data?: any): void {
    this.log('ERROR', operation, data);
  }

  warn(operation: string, data?: any): void {
    this.log('WARN', operation, data);
  }

  info(operation: string, data?: any, hash?: string): void {
    this.log('INFO', operation, data, hash);
  }

  debug(operation: string, data?: any): void {
    this.log('DEBUG', operation, data);
  }

  /**
   * Exporta logs para arquivo (JSON)
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Exporta logs para CSV
   */
  exportLogsCSV(): string {
    const header = 'timestamp,level,operation,deviceId,hash,data\n';
    const rows = this.logs.map(entry => {
      const dataStr = entry.data ? JSON.stringify(entry.data).replace(/"/g, '""') : '';
      return `${entry.timestamp},${entry.level},"${entry.operation}",${entry.deviceId},${entry.hash || ''},"${dataStr}"`;
    });
    return header + rows.join('\n');
  }

  /**
   * Baixa logs como arquivo
   */
  downloadLogs(format: 'json' | 'csv' = 'json'): void {
    const content = format === 'json' ? this.exportLogs() : this.exportLogsCSV();
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-logs-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Retorna últimos N logs
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Filtra logs por nível
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(entry => entry.level === level);
  }

  /**
   * Detecta padrões de loop infinito
   */
  detectLoopPattern(): { detected: boolean; details?: string } {
    const recentLogs = this.getRecentLogs(20);
    const operations = recentLogs.map(entry => entry.operation);

    // Detecta repetição de mesma operação
    const operationCounts = new Map<string, number>();
    operations.forEach(op => {
      operationCounts.set(op, (operationCounts.get(op) || 0) + 1);
    });

    for (const [operation, count] of operationCounts) {
      if (count > 10) {
        return {
          detected: true,
          details: `Operação "${operation}" executada ${count} vezes nos últimos 20 logs`,
        };
      }
    }

    return { detected: false };
  }

  /**
   * Limpa todos os logs
   */
  clear(): void {
    this.logs = [];
    console.log('🧹 Logs limpos');
  }

  /**
   * Performance profiling
   */
  private timers = new Map<string, number>();

  startTimer(operation: string): void {
    this.timers.set(operation, performance.now());
  }

  endTimer(operation: string): number {
    const start = this.timers.get(operation);
    if (!start) {
      console.warn(`⚠️ Timer não encontrado: ${operation}`);
      return 0;
    }

    const duration = performance.now() - start;
    this.timers.delete(operation);

    this.debug(`${operation} - duration`, { durationMs: duration.toFixed(2) });
    return duration;
  }
}

// Singleton global
let globalLogger: SyncLogger | null = null;

export const initLogger = (deviceId: string): SyncLogger => {
  globalLogger = new SyncLogger(deviceId);
  return globalLogger;
};

export const getLogger = (): SyncLogger => {
  if (!globalLogger) {
    throw new Error('Logger não inicializado. Chame initLogger() primeiro.');
  }
  return globalLogger;
};

// Export para usar diretamente se necessário
export { SyncLogger };
