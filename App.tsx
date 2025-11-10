import React, { useState, useCallback, useEffect } from 'react';
import { UserRole, Task, Reminder, Goal, GoalType, GoalCompletion } from './types';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';
import {
  addTask,
  updateTask,
  deleteTask,
  subscribeToTasks,
  addReminder,
  updateReminder,
  deleteReminder,
  subscribeToReminders,
  addGoal,
  deleteGoal,
  subscribeToGoals,
  setGoalCompletion,
  subscribeToGoalCompletions,
  isFirebaseConfigured,
} from './services/firebaseOperations';

function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalCompletions, setGoalCompletions] = useState<GoalCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // ==================== NETWORK STATUS ====================
  
  useEffect(() => {
    const handleOnline = () => {
      console.log('[NETWORK] 🌐 Conexão restaurada');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[NETWORK] ⚠️ Você está offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ==================== FIREBASE LISTENERS ====================

  // Listener para Tasks
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setFirebaseError('Firebase não está configurado. Verifique as credenciais.');
      setIsLoading(false);
      return;
    }

    console.log('[APP] 🔄 Configurando listener de tarefas...');
    const unsubscribe = subscribeToTasks((tasks) => {
      setTasks(tasks);
      setIsLoading(false);
      setFirebaseError(null);
    });

    return () => {
      if (unsubscribe) {
        console.log('[APP] 🛑 Desconectando listener de tarefas');
        unsubscribe();
      }
    };
  }, []);

  // Listener para Reminders
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    console.log('[APP] 🔄 Configurando listener de lembretes...');
    const unsubscribe = subscribeToReminders((reminders) => {
      setReminders(reminders);
    });

    return () => {
      if (unsubscribe) {
        console.log('[APP] 🛑 Desconectando listener de lembretes');
        unsubscribe();
      }
    };
  }, []);

  // Listener para Goals
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    console.log('[APP] 🔄 Configurando listener de metas...');
    const unsubscribe = subscribeToGoals((goals) => {
      setGoals(goals);
    });

    return () => {
      if (unsubscribe) {
        console.log('[APP] 🛑 Desconectando listener de metas');
        unsubscribe();
      }
    };
  }, []);

  // Listener para Goal Completions
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    console.log('[APP] 🔄 Configurando listener de conclusões de metas...');
    const unsubscribe = subscribeToGoalCompletions((completions) => {
      setGoalCompletions(completions);
    });

    return () => {
      if (unsubscribe) {
        console.log('[APP] 🛑 Desconectando listener de conclusões de metas');
        unsubscribe();
      }
    };
  }, []);

  // ==================== HANDLERS ====================

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
  };

  // Tasks
  const handleAddTask = useCallback(async (
    description: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video'
  ) => {
    const newTask: Omit<Task, 'id'> = {
      description,
      timestamp: new Date(),
      mediaUrl,
      mediaType,
      author: userRole || undefined,
    };

    const taskId = await addTask(newTask);
    if (!taskId) {
      console.error('[APP] ❌ Falha ao adicionar tarefa');
      setFirebaseError('Erro ao adicionar tarefa. Tente novamente.');
    }
  }, [userRole]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    const success = await deleteTask(taskId);
    if (!success) {
      console.error('[APP] ❌ Falha ao deletar tarefa');
      setFirebaseError('Erro ao deletar tarefa. Tente novamente.');
    }
  }, []);

  // Reminders
  const handleSendReminder = useCallback(async (
    reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>
  ) => {
    const newReminder: Omit<Reminder, 'id'> = {
      ...reminder,
      timestamp: new Date(),
      status: 'pending',
      author: userRole || undefined,
    };

    const reminderId = await addReminder(newReminder);
    if (!reminderId) {
      console.error('[APP] ❌ Falha ao adicionar lembrete');
      setFirebaseError('Erro ao adicionar lembrete. Tente novamente.');
    }
  }, [userRole]);

  const handleDeleteReminder = useCallback(async (reminderId: string) => {
    const success = await deleteReminder(reminderId);
    if (!success) {
      console.error('[APP] ❌ Falha ao deletar lembrete');
      setFirebaseError('Erro ao deletar lembrete. Tente novamente.');
    }
  }, []);

  const handleToggleReminderStatus = useCallback(async (reminderId: string) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;

    const newStatus = reminder.status === 'pending' ? 'done' : 'pending';
    const success = await updateReminder(reminderId, { status: newStatus });
    
    if (!success) {
      console.error('[APP] ❌ Falha ao atualizar status do lembrete');
      setFirebaseError('Erro ao atualizar lembrete. Tente novamente.');
    }
  }, [reminders]);

  // Goals
  const handleAddGoal = useCallback(async (description: string, type: GoalType) => {
    const newGoal: Omit<Goal, 'id'> = {
      description,
      type,
      createdAt: new Date(),
      author: userRole || undefined,
    };

    const goalId = await addGoal(newGoal);
    if (!goalId) {
      console.error('[APP] ❌ Falha ao adicionar meta');
      setFirebaseError('Erro ao adicionar meta. Tente novamente.');
    }
  }, [userRole]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    const success = await deleteGoal(goalId);
    if (!success) {
      console.error('[APP] ❌ Falha ao deletar meta');
      setFirebaseError('Erro ao deletar meta. Tente novamente.');
    }
    
    // Também deleta todas as conclusões desta meta
    const completionsToDelete = goalCompletions.filter(gc => gc.goalId === goalId);
    for (const completion of completionsToDelete) {
      // As conclusões serão removidas automaticamente pelo listener
    }
  }, [goalCompletions]);

  const handleToggleGoalCompletion = useCallback(async (goalId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const existingCompletion = goalCompletions.find(
      c => c.goalId === goalId && c.date === today
    );

    const completion: GoalCompletion = {
      goalId,
      date: today,
      completed: existingCompletion ? !existingCompletion.completed : true,
    };

    const success = await setGoalCompletion(completion);
    if (!success) {
      console.error('[APP] ❌ Falha ao atualizar conclusão de meta');
      setFirebaseError('Erro ao atualizar meta. Tente novamente.');
    }
  }, [goalCompletions]);

  const handleReplyWithTask = useCallback(async (
    reminderId: string,
    taskDescription: string
  ) => {
    // Cria nova tarefa
    const newTask: Omit<Task, 'id'> = {
      description: taskDescription,
      timestamp: new Date(),
      author: userRole || undefined,
    };

    const taskId = await addTask(newTask);
    
    if (taskId) {
      // Atualiza o lembrete com linkedTaskId e marca como done
      const success = await updateReminder(reminderId, {
        linkedTaskId: taskId,
        status: 'done',
      });

      if (!success) {
        console.error('[APP] ❌ Falha ao vincular tarefa ao lembrete');
        setFirebaseError('Tarefa criada, mas erro ao vincular. Tente novamente.');
      }
    } else {
      console.error('[APP] ❌ Falha ao criar tarefa vinculada');
      setFirebaseError('Erro ao criar tarefa. Tente novamente.');
    }
  }, [userRole]);

  // ==================== RENDER ====================

  if (!userRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Banner de status offline */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-gray-900 px-4 py-2 text-center font-semibold shadow-lg">
          ⚠️ Você está offline - Mudanças serão sincronizadas ao reconectar
        </div>
      )}

      {/* Banner de erro do Firebase */}
      {firebaseError && (
        <div
          className="fixed left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 text-center font-semibold shadow-lg"
          style={{ top: !isOnline ? '48px' : '0' }}
        >
          <div className="text-sm mb-1">🚨 ERRO</div>
          <div className="text-xs">{firebaseError}</div>
          <button
            onClick={() => setFirebaseError(null)}
            className="mt-2 px-3 py-1 bg-white text-red-600 rounded text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Indicador de carregamento inicial */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 px-8 py-6 rounded-lg shadow-xl flex items-center gap-4">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-lg">Carregando dados...</span>
          </div>
        </div>
      )}

      <MainLayout
        userRole={userRole}
        tasks={tasks}
        reminders={reminders}
        goals={goals}
        goalCompletions={goalCompletions}
        onAddTask={handleAddTask}
        onDeleteTask={handleDeleteTask}
        onSendReminder={handleSendReminder}
        onDeleteReminder={handleDeleteReminder}
        onToggleReminderStatus={handleToggleReminderStatus}
        onLogout={handleLogout}
        onAddGoal={handleAddGoal}
        onToggleGoalCompletion={handleToggleGoalCompletion}
        onDeleteGoal={handleDeleteGoal}
        onReplyWithTask={handleReplyWithTask}
      />
    </div>
  );
}

export default App;
