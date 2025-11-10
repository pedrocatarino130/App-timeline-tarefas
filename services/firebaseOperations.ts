/**
 * 🔥 Firebase Operations - Backend Simples e Funcional
 * 
 * Operações CRUD diretas no Firebase Firestore.
 * Sem merge manual, sem localStorage complexo, sem flags anti-loop.
 * 
 * Princípio: Firebase é a ÚNICA fonte de verdade.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  QuerySnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { Task, Reminder, Goal, GoalCompletion } from '../types';

// ==================== HELPER FUNCTIONS ====================

/**
 * Remove campos undefined de um objeto antes de salvar no Firestore
 * Firestore não aceita campos com valor undefined
 */
const removeUndefinedFields = (obj: any): any => {
  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

// ==================== TASKS ====================

/**
 * Adiciona uma nova tarefa ao Firebase
 */
export const addTask = async (task: Omit<Task, 'id'>): Promise<string | null> => {
  if (!db) {
    console.error('[FIREBASE] Database não inicializado');
    return null;
  }

  try {
    // Log detalhado do que será salvo
    console.log('[FIREBASE] Preparando para salvar tarefa:', {
      hasDescription: !!task.description,
      hasMediaUrl: !!task.mediaUrl,
      mediaType: task.mediaType,
      mediaUrlLength: task.mediaUrl?.length,
      mediaSizeKB: task.mediaUrl ? ((task.mediaUrl.length * 3) / 4 / 1024).toFixed(0) : 0
    });

    const taskData = removeUndefinedFields({
      ...task,
      timestamp: task.timestamp instanceof Date ? Timestamp.fromDate(task.timestamp) : Timestamp.now(),
    });
    
    console.log('[FIREBASE] Dados após removeUndefinedFields:', {
      hasMediaUrl: !!taskData.mediaUrl,
      mediaType: taskData.mediaType,
      keys: Object.keys(taskData)
    });
    
    const docRef = await addDoc(collection(db, 'tasks'), taskData);
    console.log('[FIREBASE] ✅ Tarefa adicionada com sucesso! ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao adicionar tarefa:', error);
    if (error instanceof Error) {
      console.error('[FIREBASE] Mensagem de erro:', error.message);
    }
    return null;
  }
};

/**
 * Atualiza uma tarefa existente
 */
export const updateTask = async (id: string, updates: Partial<Task>): Promise<boolean> => {
  if (!db) {
    console.error('[FIREBASE] Database não inicializado');
    return false;
  }

  try {
    const taskRef = doc(db, 'tasks', id);
    let updateData: any = { ...updates };
    
    // Converte Date para Timestamp se necessário
    if (updates.timestamp instanceof Date) {
      updateData.timestamp = Timestamp.fromDate(updates.timestamp);
    }
    
    // Remove campos undefined
    updateData = removeUndefinedFields(updateData);
    
    await updateDoc(taskRef, updateData);
    console.log('[FIREBASE] ✅ Tarefa atualizada:', id);
    return true;
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao atualizar tarefa:', error);
    return false;
  }
};

/**
 * Deleta uma tarefa
 */
export const deleteTask = async (id: string): Promise<boolean> => {
  if (!db) {
    console.error('[FIREBASE] Database não inicializado');
    return false;
  }

  try {
    await deleteDoc(doc(db, 'tasks', id));
    console.log('[FIREBASE] ✅ Tarefa deletada:', id);
    return true;
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao deletar tarefa:', error);
    return false;
  }
};

/**
 * Listener em tempo real para tarefas
 */
export const subscribeToTasks = (callback: (tasks: Task[]) => void): Unsubscribe | null => {
  if (!db) {
    console.warn('[FIREBASE] Database não inicializado - listener não criado');
    return null;
  }

  try {
    const q = query(collection(db, 'tasks'), orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const tasks: Task[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const task = {
          id: doc.id,
          description: data.description || '',
          timestamp: data.timestamp?.toDate() || new Date(),
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
          author: data.author,
        };
        
        // Log detalhado de cada tarefa com mídia
        if (task.mediaUrl) {
          console.log('[FIREBASE] 📸 Tarefa com mídia recuperada:', {
            id: task.id,
            hasMediaUrl: !!task.mediaUrl,
            mediaType: task.mediaType,
            mediaUrlLength: task.mediaUrl?.length,
            mediaSizeKB: task.mediaUrl ? ((task.mediaUrl.length * 3) / 4 / 1024).toFixed(0) : 0
          });
        }
        
        return task;
      });
      
      const tasksWithMedia = tasks.filter(t => t.mediaUrl).length;
      console.log('[FIREBASE] 📥 Tarefas atualizadas:', tasks.length, `(${tasksWithMedia} com mídia)`);
      callback(tasks);
    }, (error) => {
      console.error('[FIREBASE] ❌ Erro no listener de tarefas:', error);
    });
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao criar listener de tarefas:', error);
    return null;
  }
};

// ==================== REMINDERS ====================

/**
 * Adiciona um novo lembrete ao Firebase
 */
export const addReminder = async (reminder: Omit<Reminder, 'id'>): Promise<string | null> => {
  if (!db) {
    console.error('[FIREBASE] Database não inicializado');
    return null;
  }

  try {
    // Verificar tamanho do audioUrl se for base64
    if (reminder.audioUrl && reminder.audioUrl.startsWith('data:')) {
      const sizeInBytes = reminder.audioUrl.length;
      const sizeInKB = sizeInBytes / 1024;
      console.log(`[FIREBASE] Tamanho do áudio: ${sizeInKB.toFixed(2)} KB`);
      
      // Firestore tem limite de ~1MB por documento, vamos avisar se estiver próximo
      if (sizeInBytes > 900000) { // 900KB
        console.warn('[FIREBASE] ⚠️ Áudio muito grande! Pode causar problemas.');
        // Não bloqueia, mas avisa
      }
    }

    const reminderData = removeUndefinedFields({
      ...reminder,
      timestamp: reminder.timestamp instanceof Date ? Timestamp.fromDate(reminder.timestamp) : Timestamp.now(),
    });
    
    const docRef = await addDoc(collection(db, 'reminders'), reminderData);
    console.log('[FIREBASE] ✅ Lembrete adicionado:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao adicionar lembrete:', error);
    return null;
  }
};

/**
 * Atualiza um lembrete existente
 */
export const updateReminder = async (id: string, updates: Partial<Reminder>): Promise<boolean> => {
  if (!db) {
    console.error('[FIREBASE] Database não inicializado');
    return false;
  }

  try {
    const reminderRef = doc(db, 'reminders', id);
    let updateData: any = { ...updates };
    
    // Converte Date para Timestamp se necessário
    if (updates.timestamp instanceof Date) {
      updateData.timestamp = Timestamp.fromDate(updates.timestamp);
    }
    
    // Remove campos undefined
    updateData = removeUndefinedFields(updateData);
    
    await updateDoc(reminderRef, updateData);
    console.log('[FIREBASE] ✅ Lembrete atualizado:', id);
    return true;
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao atualizar lembrete:', error);
    return false;
  }
};

/**
 * Deleta um lembrete
 */
export const deleteReminder = async (id: string): Promise<boolean> => {
  if (!db) {
    console.error('[FIREBASE] Database não inicializado');
    return false;
  }

  try {
    await deleteDoc(doc(db, 'reminders', id));
    console.log('[FIREBASE] ✅ Lembrete deletado:', id);
    return true;
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao deletar lembrete:', error);
    return false;
  }
};

/**
 * Listener em tempo real para lembretes
 */
export const subscribeToReminders = (callback: (reminders: Reminder[]) => void): Unsubscribe | null => {
  if (!db) {
    console.warn('[FIREBASE] Database não inicializado - listener não criado');
    return null;
  }

  try {
    const q = query(collection(db, 'reminders'), orderBy('timestamp', 'desc'));
    
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const reminders: Reminder[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || 'text',
          content: data.content || '',
          audioUrl: data.audioUrl,
          timestamp: data.timestamp?.toDate() || new Date(),
          status: data.status || 'pending',
          linkedTaskId: data.linkedTaskId,
          author: data.author,
        };
      });
      
      console.log('[FIREBASE] 📥 Lembretes atualizados:', reminders.length);
      callback(reminders);
    }, (error) => {
      console.error('[FIREBASE] ❌ Erro no listener de lembretes:', error);
    });
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao criar listener de lembretes:', error);
    return null;
  }
};

// ==================== GOALS ====================

/**
 * Adiciona uma nova meta ao Firebase
 */
export const addGoal = async (goal: Omit<Goal, 'id'>): Promise<string | null> => {
  if (!db) {
    console.error('[FIREBASE] Database não inicializado');
    return null;
  }

  try {
    const goalData = removeUndefinedFields({
      ...goal,
      createdAt: goal.createdAt instanceof Date ? Timestamp.fromDate(goal.createdAt) : Timestamp.now(),
    });
    
    const docRef = await addDoc(collection(db, 'goals'), goalData);
    console.log('[FIREBASE] ✅ Meta adicionada:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao adicionar meta:', error);
    return null;
  }
};

/**
 * Atualiza uma meta existente
 */
export const updateGoal = async (id: string, updates: Partial<Goal>): Promise<boolean> => {
  if (!db) {
    console.error('[FIREBASE] Database não inicializado');
    return false;
  }

  try {
    const goalRef = doc(db, 'goals', id);
    const updateData: any = { ...updates };
    
    // Converte Date para Timestamp se necessário
    if (updates.createdAt instanceof Date) {
      updateData.createdAt = Timestamp.fromDate(updates.createdAt);
    }
    
    await updateDoc(goalRef, updateData);
    console.log('[FIREBASE] ✅ Meta atualizada:', id);
    return true;
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao atualizar meta:', error);
    return false;
  }
};

/**
 * Deleta uma meta
 */
export const deleteGoal = async (id: string): Promise<boolean> => {
  if (!db) {
    console.error('[FIREBASE] Database não inicializado');
    return false;
  }

  try {
    await deleteDoc(doc(db, 'goals', id));
    console.log('[FIREBASE] ✅ Meta deletada:', id);
    return true;
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao deletar meta:', error);
    return false;
  }
};

/**
 * Listener em tempo real para metas
 */
export const subscribeToGoals = (callback: (goals: Goal[]) => void): Unsubscribe | null => {
  if (!db) {
    console.warn('[FIREBASE] Database não inicializado - listener não criado');
    return null;
  }

  try {
    const q = query(collection(db, 'goals'), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const goals: Goal[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          description: data.description || '',
          type: data.type || 'unique',
          createdAt: data.createdAt?.toDate() || new Date(),
          author: data.author,
        };
      });
      
      console.log('[FIREBASE] 📥 Metas atualizadas:', goals.length);
      callback(goals);
    }, (error) => {
      console.error('[FIREBASE] ❌ Erro no listener de metas:', error);
    });
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao criar listener de metas:', error);
    return null;
  }
};

// ==================== GOAL COMPLETIONS ====================

/**
 * Adiciona ou atualiza uma conclusão de meta
 */
export const setGoalCompletion = async (completion: GoalCompletion): Promise<boolean> => {
  if (!db) {
    console.error('[FIREBASE] Database não inicializado');
    return false;
  }

  try {
    // Usa goalId_date como ID único para evitar duplicatas
    const completionId = `${completion.goalId}_${completion.date}`;
    const completionRef = doc(db, 'goalCompletions', completionId);
    
    await updateDoc(completionRef, completion).catch(async () => {
      // Se não existe, cria novo
      await addDoc(collection(db, 'goalCompletions'), completion);
    });
    
    console.log('[FIREBASE] ✅ Conclusão de meta salva:', completionId);
    return true;
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao salvar conclusão de meta:', error);
    return false;
  }
};

/**
 * Deleta uma conclusão de meta
 */
export const deleteGoalCompletion = async (goalId: string, date: string): Promise<boolean> => {
  if (!db) {
    console.error('[FIREBASE] Database não inicializado');
    return false;
  }

  try {
    const completionId = `${goalId}_${date}`;
    await deleteDoc(doc(db, 'goalCompletions', completionId));
    console.log('[FIREBASE] ✅ Conclusão de meta deletada:', completionId);
    return true;
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao deletar conclusão de meta:', error);
    return false;
  }
};

/**
 * Listener em tempo real para conclusões de metas
 */
export const subscribeToGoalCompletions = (callback: (completions: GoalCompletion[]) => void): Unsubscribe | null => {
  if (!db) {
    console.warn('[FIREBASE] Database não inicializado - listener não criado');
    return null;
  }

  try {
    const q = collection(db, 'goalCompletions');
    
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const completions: GoalCompletion[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          goalId: data.goalId || '',
          date: data.date || '',
          completed: data.completed || false,
        };
      });
      
      console.log('[FIREBASE] 📥 Conclusões de metas atualizadas:', completions.length);
      callback(completions);
    }, (error) => {
      console.error('[FIREBASE] ❌ Erro no listener de conclusões de metas:', error);
    });
  } catch (error) {
    console.error('[FIREBASE] ❌ Erro ao criar listener de conclusões de metas:', error);
    return null;
  }
};

// ==================== UTILITY ====================

/**
 * Verifica se o Firebase está configurado
 */
export const isFirebaseConfigured = (): boolean => {
  return db !== undefined && db !== null;
};

