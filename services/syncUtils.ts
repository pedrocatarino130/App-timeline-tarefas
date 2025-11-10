/**
 * 🔧 Utilitários para Sincronização
 *
 * Este arquivo contém funções críticas para prevenir loops infinitos
 * e conflitos de sincronização entre dispositivos.
 */

import { Task, Reminder, Goal, GoalCompletion } from '../types';

/**
 * 🔥 TASK-002: Validação robusta de arrays
 *
 * Função standalone para validar e sanitizar arrays antes de processar.
 * Previne crashes com .map() em undefined/null.
 *
 * @param field - Campo a ser validado
 * @param defaultValue - Valor default se inválido (padrão: [])
 * @returns Array válido ou default
 */
export const validateArrayField = <T = any>(
  field: any,
  defaultValue: T[] = []
): T[] => {
  // Verifica se é null ou undefined
  if (field === null || field === undefined) {
    console.warn('[VALIDATE] Campo null/undefined, usando default:', defaultValue);
    return defaultValue;
  }

  // Verifica se é array
  if (!Array.isArray(field)) {
    console.warn('[VALIDATE] Campo não é array, usando default:', typeof field);
    return defaultValue;
  }

  // Filtra items null/undefined do array
  const filtered = field.filter((item: any) => item !== null && item !== undefined);

  // Avisa se houve filtragem
  if (filtered.length !== field.length) {
    console.warn(`[VALIDATE] ${field.length - filtered.length} items null/undefined removidos`);
  }

  return filtered;
};

/**
 * 🔥 TASK-002: Type guard para validar se objeto tem ID válido
 */
export const hasValidId = (obj: any): obj is { id: string } => {
  return obj && typeof obj === 'object' && typeof obj.id === 'string' && obj.id.length > 0;
};

/**
 * 🔥 TASK-002: Type guard para validar estrutura de Task
 */
export const isValidTask = (obj: any): obj is Task => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    obj.id.length > 0 &&
    typeof obj.description === 'string' &&
    (obj.timestamp instanceof Date || typeof obj.timestamp === 'string')
  );
};

/**
 * 🔥 TASK-002: Type guard para validar estrutura de Reminder
 */
export const isValidReminder = (obj: any): obj is Reminder => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    obj.id.length > 0 &&
    (obj.type === 'text' || obj.type === 'audio') &&
    typeof obj.content === 'string' &&
    (obj.timestamp instanceof Date || typeof obj.timestamp === 'string')
  );
};

/**
 * 🔥 TASK-002: Type guard para validar estrutura de Goal
 */
export const isValidGoal = (obj: any): obj is Goal => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    obj.id.length > 0 &&
    typeof obj.description === 'string' &&
    (obj.type === 'unique' || obj.type === 'fixed') &&
    (obj.createdAt instanceof Date || typeof obj.createdAt === 'string')
  );
};

/**
 * 🔥 TASK-002: Type guard para validar estrutura de GoalCompletion
 */
export const isValidGoalCompletion = (obj: any): obj is GoalCompletion => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.goalId === 'string' &&
    typeof obj.date === 'string' &&
    typeof obj.completed === 'boolean'
  );
};

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
  // 🔥 TASK-002: Usa validateArrayField para validação robusta
  const safeTasks = validateArrayField<Task>(data.tasks, []);
  const safeReminders = validateArrayField<Reminder>(data.reminders, []);
  const safeGoals = validateArrayField<Goal>(data.goals, []);
  const safeGoalCompletions = validateArrayField<GoalCompletion>(data.goalCompletions, []);

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

  const tasksStr = safeTasks.map(normalize).sort().join('|');
  const remindersStr = safeReminders.map(normalize).sort().join('|');
  const goalsStr = safeGoals.map(normalize).sort().join('|');
  const completionsStr = safeGoalCompletions.map(normalize).sort().join('|');

  // 🔥 FIX: Inclui comprimento dos arrays para garantir que deleções sejam detectadas
  // Isso previne o caso raro onde deletar 1 item e adicionar outro poderia gerar o mesmo hash
  const lengthStr = `[${safeTasks.length},${safeReminders.length},${safeGoals.length},${safeGoalCompletions.length}]`;

  // Hash simples mas eficaz (FNV-1a)
  const str = `${lengthStr}::${tasksStr}::${remindersStr}::${goalsStr}::${completionsStr}`;
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
  existingArray: T[] | undefined | null,
  newArray: T[] | undefined | null
): T[] => {
  // 🔥 TASK-002: Usa validateArrayField para validação robusta
  const safeExisting = validateArrayField<T>(existingArray, []);
  const safeNew = validateArrayField<T>(newArray, []);

  console.log(`[MERGE] Merging ${safeExisting.length} existing + ${safeNew.length} new items`);

  const merged = new Map<string, T>();

  // Adiciona itens existentes ao mapa
  safeExisting.forEach(item => {
    // 🔥 TASK-002: Usa type guard hasValidId
    if (hasValidId(item)) {
      merged.set(item.id, item);
    } else {
      console.warn('[MERGE] Item sem ID detectado no array existente:', item);
    }
  });

  // Para cada item novo, verifica se é mais recente
  safeNew.forEach(newItem => {
    // 🔥 TASK-002: Usa type guard hasValidId
    if (!hasValidId(newItem)) {
      console.warn('[MERGE] Item sem ID detectado no array novo:', newItem);
      return;
    }

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

  const result = Array.from(merged.values());
  console.log(`[MERGE] Result: ${result.length} items after merge`);
  return result;
};

/**
 * 🔥 TASK-002: Merge LWW específico para GoalCompletion
 *
 * GoalCompletion usa chave composta (goalId + date) em vez de um único id.
 *
 * @param existingArray - Array existente no Firebase
 * @param newArray - Array novo do dispositivo local
 * @returns Array com merge inteligente
 */
export const mergeLWWGoalCompletions = (
  existingArray: GoalCompletion[] | undefined | null,
  newArray: GoalCompletion[] | undefined | null
): GoalCompletion[] => {
  // 🔥 TASK-002: Usa validateArrayField para validação robusta
  const safeExisting = validateArrayField<GoalCompletion>(existingArray, []);
  const safeNew = validateArrayField<GoalCompletion>(newArray, []);

  console.log(`[MERGE COMPLETIONS] Merging ${safeExisting.length} existing + ${safeNew.length} new items`);

  const merged = new Map<string, GoalCompletion>();

  // Adiciona itens existentes ao mapa (chave: goalId + date)
  safeExisting.forEach(item => {
    if (isValidGoalCompletion(item)) {
      const key = `${item.goalId}::${item.date}`;
      merged.set(key, item);
    } else {
      console.warn('[MERGE COMPLETIONS] Item inválido no array existente:', item);
    }
  });

  // Para cada item novo, verifica se é mais recente
  safeNew.forEach(newItem => {
    if (!isValidGoalCompletion(newItem)) {
      console.warn('[MERGE COMPLETIONS] Item inválido no array novo:', newItem);
      return;
    }

    const key = `${newItem.goalId}::${newItem.date}`;
    const existing = merged.get(key);

    // Se não existe, adiciona
    if (!existing) {
      merged.set(key, newItem);
      return;
    }

    // Compara timestamps
    const existingTimestamp = existing._updatedAt || 0;
    const newTimestamp = newItem._updatedAt || 0;

    // Versão mais recente vence
    if (newTimestamp >= existingTimestamp) {
      merged.set(key, newItem);
    }
  });

  const result = Array.from(merged.values());
  console.log(`[MERGE COMPLETIONS] Result: ${result.length} items after merge`);
  return result;
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
