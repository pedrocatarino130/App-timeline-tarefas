/**
 * 🔧 Utilitários para Sincronização
 *
 * Este arquivo contém funções críticas para prevenir loops infinitos
 * e conflitos de sincronização entre dispositivos.
 */

import { Task, Reminder, Goal, GoalCompletion } from '../types';

/**
 * 🔥 FIX #1: Hash de dados para detectar mudanças REAIS
 *
 * Calcula um hash rápido dos dados para comparação.
 * Evita loops infinitos onde o Firebase listener dispara um save desnecessário.
 *
 * @param data - Dados a serem hashados
 * @returns String hash única
 */
export const hashData = (data: {
  tasks: Task[];
  reminders: Reminder[];
  goals: Goal[];
  goalCompletions: GoalCompletion[];
}): string => {
  // Cria uma string estável dos dados (sem depender de ordem de propriedades)
  const normalize = (obj: any): string => {
    // Remove _updatedAt para não causar loops (é metadado interno)
    const { _updatedAt, ...rest } = obj;

    // Converte Date para timestamp para comparação estável
    const normalized = { ...rest };
    if (normalized.timestamp instanceof Date) {
      normalized.timestamp = normalized.timestamp.getTime();
    }
    if (normalized.createdAt instanceof Date) {
      normalized.createdAt = normalized.createdAt.getTime();
    }

    return JSON.stringify(normalized);
  };

  const tasksStr = data.tasks.map(normalize).sort().join('|');
  const remindersStr = data.reminders.map(normalize).sort().join('|');
  const goalsStr = data.goals.map(normalize).sort().join('|');
  const completionsStr = data.goalCompletions.map(normalize).sort().join('|');

  // Hash simples mas eficaz (FNV-1a)
  const str = `${tasksStr}::${remindersStr}::${goalsStr}::${completionsStr}`;
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(36);
};

/**
 * 🔥 FIX #3: Merge LWW (Last-Write-Wins) por item
 *
 * Faz merge inteligente de arrays baseado em timestamps por item.
 * Evita perda de dados quando múltiplos dispositivos salvam simultaneamente.
 *
 * Algoritmo: LWW-Element-Set (Last-Write-Wins Element Set)
 * - Cada item tem seu próprio timestamp (_updatedAt)
 * - No merge, o item com timestamp mais recente prevalece
 * - Itens sem timestamp são considerados antigos
 *
 * @param existingArray - Array existente no Firebase
 * @param newArray - Array novo do dispositivo local
 * @returns Array com merge inteligente
 */
export const mergeLWW = <T extends { id: string; _updatedAt?: number }>(
  existingArray: T[],
  newArray: T[]
): T[] => {
  const merged = new Map<string, T>();

  // Adiciona itens existentes ao mapa
  existingArray.forEach(item => {
    merged.set(item.id, item);
  });

  // Para cada item novo, verifica se é mais recente
  newArray.forEach(newItem => {
    const existing = merged.get(newItem.id);

    // Se não existe, adiciona
    if (!existing) {
      merged.set(newItem.id, newItem);
      return;
    }

    // Compara timestamps (itens sem timestamp são considerados antigos)
    const existingTimestamp = existing._updatedAt || 0;
    const newTimestamp = newItem._updatedAt || 0;

    // SÓ sobrescreve se o novo for mais recente (ou igual, para priorizar local)
    if (newTimestamp >= existingTimestamp) {
      merged.set(newItem.id, newItem);
    }
    // Caso contrário, mantém o existente (mais recente)
  });

  return Array.from(merged.values());
};

/**
 * 🔥 FIX #4: Normalização de timestamps
 *
 * Adiciona/atualiza o campo _updatedAt em todos os itens de um array.
 * Garante que todos os itens tenham metadados de versionamento.
 *
 * @param items - Array de itens
 * @param timestamp - Timestamp a ser usado (ou Date.now() se não fornecido)
 * @returns Array com _updatedAt atualizado
 */
export const addTimestamps = <T extends { id: string; _updatedAt?: number }>(
  items: T[],
  timestamp?: number
): T[] => {
  const ts = timestamp || Date.now();
  return items.map(item => ({
    ...item,
    _updatedAt: ts,
  }));
};

/**
 * 🔥 FIX #2: Debounce adaptativo
 *
 * Determina o tempo de debounce baseado na frequência de mudanças.
 * - Poucas mudanças: debounce curto (resposta rápida)
 * - Muitas mudanças: debounce longo (agrupa em batch)
 *
 * @param changeCount - Número de mudanças recentes
 * @returns Tempo de debounce em ms
 */
export const getAdaptiveDebounce = (changeCount: number): number => {
  const DEBOUNCE_SHORT = 300; // Para mudanças individuais
  const DEBOUNCE_MEDIUM = 600; // Para poucas mudanças
  const DEBOUNCE_LONG = 1000; // Para muitas mudanças (batch)

  if (changeCount <= 1) return DEBOUNCE_SHORT;
  if (changeCount <= 3) return DEBOUNCE_MEDIUM;
  return DEBOUNCE_LONG;
};

/**
 * 🔥 Função helper para validar se um Date é válido
 */
export const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * 🔥 Função helper para sanitizar objetos com datas inválidas
 * Converte Date objects para ISO strings (formato aceito pelo Firebase)
 */
export const dateToString = (date: Date): string => {
  if (!isValidDate(date)) {
    console.warn('[SYNC] Data inválida detectada, usando data atual');
    return new Date().toISOString();
  }
  return date.toISOString();
};

/**
 * 🔥 Função helper para converter ISO strings para Date objects
 */
export const stringToDate = (str: string | Date): Date => {
  if (str instanceof Date) return str;

  const date = new Date(str);
  if (!isValidDate(date)) {
    console.warn('[SYNC] String de data inválida, usando data atual:', str);
    return new Date();
  }

  return date;
};

/**
 * 🔥 Detecta se dois arrays são diferentes
 * (compara por IDs e conteúdo, útil para otimizações)
 */
export const arraysAreDifferent = <T extends { id: string }>(
  arr1: T[],
  arr2: T[]
): boolean => {
  if (arr1.length !== arr2.length) return true;

  const map1 = new Map(arr1.map(item => [item.id, JSON.stringify(item)]));
  const map2 = new Map(arr2.map(item => [item.id, JSON.stringify(item)]));

  if (map1.size !== map2.size) return true;

  for (const [id, str1] of map1) {
    if (map2.get(id) !== str1) return true;
  }

  return false;
};
