import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
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
  USER_ID: 'pet_hotel_user_id',
} as const;

// Gera um ID único para o usuário (compartilhado entre dispositivos)
export const getUserId = (): string => {
  let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);

  if (!userId) {
    // Gera um ID único baseado em timestamp e random
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  }

  return userId;
};

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

// Salva todos os dados no Firebase
export const saveToFirebase = async (
  userId: string,
  data: UserData
): Promise<boolean> => {
  if (!db) {
    console.warn('Firebase não está configurado. Usando apenas localStorage.');
    return false;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      ...data,
      lastUpdated: Date.now(),
    });

    console.log('Dados salvos no Firebase com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao salvar no Firebase:', error);
    return false;
  }
};

// Carrega dados do Firebase
export const loadFromFirebase = async (
  userId: string
): Promise<UserData | null> => {
  if (!db) {
    console.warn('Firebase não está configurado. Usando apenas localStorage.');
    return null;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UserData;

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

    return null;
  } catch (error) {
    console.error('Erro ao carregar do Firebase:', error);
    return null;
  }
};

// Sincroniza dados em tempo real
export const syncWithFirebase = (
  userId: string,
  onDataChange: (data: UserData) => void
): Unsubscribe | null => {
  if (!db) {
    console.warn('Firebase não está configurado. Sincronização em tempo real desabilitada.');
    return null;
  }

  try {
    const userDocRef = doc(db, 'users', userId);

    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserData;

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
      }
    }, (error) => {
      console.error('Erro na sincronização em tempo real:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Erro ao configurar sincronização:', error);
    return null;
  }
};
