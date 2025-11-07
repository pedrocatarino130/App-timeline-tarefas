import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  runTransaction,
  Unsubscribe,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { Task, Reminder, Goal, GoalCompletion } from '../types';

// Chaves para localStorage
export const STORAGE_KEYS = {
  TASKS: 'pet_hotel_tasks',
  REMINDERS: 'pet_hotel_reminders',
  GOALS: 'pet_hotel_goals',
  GOAL_COMPLETIONS: 'pet_hotel_goal_completions',
} as const;

// ID do workspace compartilhado - TODOS os usuários usam o mesmo workspace
// Isso permite que Pedro e Sato vejam e compartilhem os mesmos dados
export const WORKSPACE_ID = 'casa_satos';

// Interface para os dados do usuário
export interface UserData {
  tasks: Task[];
  reminders: Reminder[];
  goals: Goal[];
  goalCompletions: GoalCompletion[];
  lastUpdated: number;
}

// Carrega dados do localStorage
export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    const parsed = JSON.parse(item);

    // Reconverte strings de data para objetos Date
    if (key === STORAGE_KEYS.TASKS) {
      return (parsed as Task[]).map((task: Task) => ({
        ...task,
        timestamp: new Date(task.timestamp),
      })) as T;
    }

    if (key === STORAGE_KEYS.REMINDERS) {
      return (parsed as Reminder[]).map((reminder: Reminder) => ({
        ...reminder,
        timestamp: new Date(reminder.timestamp),
      })) as T;
    }

    if (key === STORAGE_KEYS.GOALS) {
      return (parsed as Goal[]).map((goal: Goal) => ({
        ...goal,
        createdAt: new Date(goal.createdAt),
      })) as T;
    }

    return parsed as T;
  } catch (error) {
    console.error(`Erro ao carregar ${key} do localStorage:`, error);
    return defaultValue;
  }
};

// Salva dados no localStorage
export const saveToLocalStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Erro ao salvar ${key} no localStorage:`, error);
  }
};

// Função helper para fazer merge de arrays por ID (previne perda de dados)
const mergeArraysById = <T extends { id: string }>(
  existingArray: T[],
  newArray: T[]
): T[] => {
  const merged = new Map<string, T>();

  // Adiciona itens existentes
  existingArray.forEach(item => merged.set(item.id, item));

  // Sobrescreve/adiciona com novos itens (last-write-wins por item)
  newArray.forEach(item => merged.set(item.id, item));

  return Array.from(merged.values());
};

// Salva todos os dados no Firebase (workspace compartilhado) usando transação
export const saveToFirebase = async (
  data: UserData
): Promise<boolean> => {
  if (!db) {
    console.warn('⚠️ [SYNC] Firebase não está configurado. Usando apenas localStorage.');
    return false;
  }

  try {
    console.log(`🔧 [SYNC] Salvando dados no workspace: ${WORKSPACE_ID}`);
    const workspaceDocRef = doc(db, 'workspaces', WORKSPACE_ID);

    await runTransaction(db, async (transaction) => {
      const docSnapshot = await transaction.get(workspaceDocRef);

      if (!docSnapshot.exists()) {
        console.log('📝 [SYNC] Documento não existe, criando novo...');
        // Se documento não existe, cria um novo
        transaction.set(workspaceDocRef, {
          ...data,
          lastUpdated: Date.now(),
        });
      } else {
        console.log('🔄 [SYNC] Documento existe, fazendo merge...');
        // Se existe, faz merge inteligente dos arrays
        const existingData = docSnapshot.data() as UserData;

        const mergedData: UserData = {
          tasks: mergeArraysById(existingData.tasks || [], data.tasks),
          reminders: mergeArraysById(existingData.reminders || [], data.reminders),
          goals: mergeArraysById(existingData.goals || [], data.goals),
          goalCompletions: mergeArraysById(existingData.goalCompletions || [], data.goalCompletions),
          lastUpdated: Date.now(),
        };

        transaction.set(workspaceDocRef, mergedData);
      }
    });

    console.log('✅ [SYNC] Dados salvos no Firebase com sucesso!');
    return true;
  } catch (error: any) {
    console.error('❌ [SYNC] Erro ao salvar no Firebase:', error);

    // Diagnóstico de erros específicos
    if (error.code === 'permission-denied') {
      console.error('🚨 [SYNC] ERRO DE PERMISSÃO!');
      console.error('💡 [SYNC] Solução: Configure as regras do Firestore no Firebase Console');
      console.error('💡 [SYNC] Vá em: Firestore Database → Regras → Cole as regras → Publicar');
    } else if (error.code === 'unavailable') {
      console.error('🚨 [SYNC] Firebase está indisponível (sem internet ou serviço offline)');
    } else {
      console.error('🚨 [SYNC] Código do erro:', error.code);
      console.error('🚨 [SYNC] Mensagem:', error.message);
    }

    return false;
  }
};

// Carrega dados do Firebase (workspace compartilhado)
export const loadFromFirebase = async (): Promise<UserData | null> => {
  if (!db) {
    console.warn('⚠️ [SYNC] Firebase não está configurado. Usando apenas localStorage.');
    return null;
  }

  try {
    console.log(`🔧 [SYNC] Carregando dados do workspace: ${WORKSPACE_ID}`);
    const workspaceDocRef = doc(db, 'workspaces', WORKSPACE_ID);
    const docSnap = await getDoc(workspaceDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UserData;
      console.log(`✅ [SYNC] Dados carregados! (${data.tasks?.length || 0} tarefas, ${data.reminders?.length || 0} lembretes)`);

      // Reconverte timestamps para objetos Date
      return {
        tasks: data.tasks.map((task: Task) => ({
          ...task,
          timestamp: new Date(task.timestamp),
        })),
        reminders: data.reminders.map((reminder: Reminder) => ({
          ...reminder,
          timestamp: new Date(reminder.timestamp),
        })),
        goals: data.goals.map((goal: Goal) => ({
          ...goal,
          createdAt: new Date(goal.createdAt),
        })),
        goalCompletions: data.goalCompletions,
        lastUpdated: data.lastUpdated,
      };
    }

    console.log('ℹ️ [SYNC] Workspace não existe ainda no Firebase (será criado no primeiro save)');
    return null;
  } catch (error: any) {
    console.error('❌ [SYNC] Erro ao carregar do Firebase:', error);

    // Diagnóstico
    if (error.code === 'permission-denied') {
      console.error('🚨 [SYNC] ERRO DE PERMISSÃO ao ler dados!');
      console.error('💡 [SYNC] Configure as regras do Firestore no Firebase Console');
    } else {
      console.error('🚨 [SYNC] Código do erro:', error.code);
    }

    return null;
  }
};

// Sincroniza dados em tempo real (workspace compartilhado)
export const syncWithFirebase = (
  onDataChange: (data: UserData) => void
): Unsubscribe | null => {
  if (!db) {
    console.warn('Firebase não está configurado. Sincronização em tempo real desabilitada.');
    return null;
  }

  try {
    const workspaceDocRef = doc(db, 'workspaces', WORKSPACE_ID);

    console.log(`[SYNC ${new Date().toISOString()}] 🔄 Iniciando listener em tempo real...`);

    const unsubscribe = onSnapshot(workspaceDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserData;

        console.log(`[SYNC ${new Date().toISOString()}] 📥 Dados recebidos do Firebase (${data.tasks?.length || 0} tarefas, ${data.reminders?.length || 0} lembretes)`);

        // Reconverte timestamps para objetos Date
        const convertedData: UserData = {
          tasks: data.tasks.map((task: Task) => ({
            ...task,
            timestamp: new Date(task.timestamp),
          })),
          reminders: data.reminders.map((reminder: Reminder) => ({
            ...reminder,
            timestamp: new Date(reminder.timestamp),
          })),
          goals: data.goals.map((goal: Goal) => ({
            ...goal,
            createdAt: new Date(goal.createdAt),
          })),
          goalCompletions: data.goalCompletions,
          lastUpdated: data.lastUpdated,
        };

        onDataChange(convertedData);

        // Também salva no localStorage como cache
        saveToLocalStorage(STORAGE_KEYS.TASKS, convertedData.tasks);
        saveToLocalStorage(STORAGE_KEYS.REMINDERS, convertedData.reminders);
        saveToLocalStorage(STORAGE_KEYS.GOALS, convertedData.goals);
        saveToLocalStorage(STORAGE_KEYS.GOAL_COMPLETIONS, convertedData.goalCompletions);

        console.log(`[SYNC ${new Date().toISOString()}] 💾 Sincronização completa`);
      }
    }, (error) => {
      console.error(`[SYNC ${new Date().toISOString()}] ❌ Erro na sincronização:`, error);
    });

    return unsubscribe;
  } catch (error) {
    console.error(`[SYNC ${new Date().toISOString()}] ❌ Erro ao configurar sincronização:`, error);
    return null;
  }
};
