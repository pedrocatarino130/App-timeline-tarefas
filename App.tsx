import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UserRole, Task, Reminder, Goal, GoalType, GoalCompletion } from './types';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';
import {
  STORAGE_KEYS,
  loadFromLocalStorage,
  saveToLocalStorage,
  getUserId,
  saveToFirebase,
  loadFromFirebase,
  syncWithFirebase,
  UserData,
} from './services/syncService';

// Default initial data (used only if localStorage is empty)
const defaultTasks: Task[] = [
  { id: 't1', description: 'Limpei a parte de cima', timestamp: new Date(new Date().setHours(8, 0, 0)) },
  { id: 't2', description: 'Alimentei os cães grandes', timestamp: new Date(new Date().setHours(9, 15, 0)) },
];

const defaultReminders: Reminder[] = [
  { id: 'r1', type: 'text', content: 'Não esquece de colocar ração para o Bidu.', timestamp: new Date(new Date().setHours(10, 0, 0)), status: 'pending' },
  { id: 'r2', type: 'text', content: 'Verificar a água de todos os potes.', timestamp: new Date(new Date().setHours(11, 30, 0)), status: 'done' },
];

const defaultGoals: Goal[] = [
  { id: 'g1', description: 'Limpar a área dos filhotes', type: 'fixed', createdAt: new Date(new Date().setDate(new Date().getDate() - 1)) },
  { id: 'g2', description: 'Comprar mais sacos de lixo', type: 'unique', createdAt: new Date() },
  { id: 'g3', description: 'Organizar estoque de ração', type: 'fixed', createdAt: new Date(new Date().setDate(new Date().getDate() - 2)) },
];

const defaultGoalCompletions: GoalCompletion[] = [
  { goalId: 'g1', date: new Date().toISOString().split('T')[0], completed: true },
];


function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [tasks, setTasks] = useState<Task[]>(() => loadFromLocalStorage(STORAGE_KEYS.TASKS, defaultTasks));
  const [reminders, setReminders] = useState<Reminder[]>(() => loadFromLocalStorage(STORAGE_KEYS.REMINDERS, defaultReminders));
  const [goals, setGoals] = useState<Goal[]>(() => loadFromLocalStorage(STORAGE_KEYS.GOALS, defaultGoals));
  const [goalCompletions, setGoalCompletions] = useState<GoalCompletion[]>(() => loadFromLocalStorage(STORAGE_KEYS.GOAL_COMPLETIONS, defaultGoalCompletions));

  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const userId = useRef(getUserId());
  const lastSyncTime = useRef(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega dados do Firebase ao iniciar
  useEffect(() => {
    const loadData = async () => {
      console.log('🔄 Carregando dados do Firebase...');
      const firebaseData = await loadFromFirebase(userId.current);

      if (firebaseData) {
        console.log('✅ Dados carregados do Firebase!');
        setTasks(firebaseData.tasks);
        setReminders(firebaseData.reminders);
        setGoals(firebaseData.goals);
        setGoalCompletions(firebaseData.goalCompletions);
      } else {
        console.log('📦 Usando dados do localStorage');
      }

      setIsLoaded(true);
    };

    loadData();
  }, []);

  // Sincronização em tempo real
  useEffect(() => {
    if (!isLoaded) return;

    console.log('🔄 Configurando sincronização em tempo real...');
    const unsubscribe = syncWithFirebase(userId.current, (data) => {
      // Apenas atualiza se os dados vieram de outro dispositivo
      if (data.lastUpdated && data.lastUpdated > lastSyncTime.current) {
        console.log('📥 Dados atualizados de outro dispositivo!');
        setTasks(data.tasks);
        setReminders(data.reminders);
        setGoals(data.goals);
        setGoalCompletions(data.goalCompletions);
        lastSyncTime.current = Date.now();
      }
    });

    return () => {
      if (unsubscribe) {
        console.log('🛑 Desconectando sincronização...');
        unsubscribe();
      }
    };
  }, [isLoaded]);

  // Salva no localStorage e Firebase com debounce
  useEffect(() => {
    if (!isLoaded) return;

    // Salva no localStorage imediatamente
    saveToLocalStorage(STORAGE_KEYS.TASKS, tasks);
    saveToLocalStorage(STORAGE_KEYS.REMINDERS, reminders);
    saveToLocalStorage(STORAGE_KEYS.GOALS, goals);
    saveToLocalStorage(STORAGE_KEYS.GOAL_COMPLETIONS, goalCompletions);

    // Salva no Firebase com debounce de 500ms
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      setIsSyncing(true);
      const userData: UserData = {
        tasks,
        reminders,
        goals,
        goalCompletions,
        lastUpdated: Date.now(),
      };

      const success = await saveToFirebase(userId.current, userData);
      if (success) {
        lastSyncTime.current = Date.now();
      }

      setIsSyncing(false);
    }, 500);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [tasks, reminders, goals, goalCompletions, isLoaded]);

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
  };

  const handleAddTask = useCallback((description: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    const newTask: Task = {
      id: `t${Date.now()}`,
      description,
      timestamp: new Date(),
      mediaUrl,
      mediaType,
    };
    setTasks(prevTasks => [...prevTasks, newTask].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  }, []);

  const handleSendReminder = useCallback((reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>) => {
    const newReminder: Reminder = {
      ...reminder,
      id: `r${Date.now()}`,
      timestamp: new Date(),
      status: 'pending',
    };
    setReminders(prevReminders => [...prevReminders, newReminder]);
  }, []);

  const handleDeleteReminder = useCallback((reminderId: string) => {
    setReminders(prevReminders => prevReminders.filter(r => r.id !== reminderId));
  }, []);

  const handleToggleReminderStatus = useCallback((reminderId: string) => {
    setReminders(prevReminders =>
      prevReminders.map(r =>
        r.id === reminderId ? { ...r, status: r.status === 'pending' ? 'done' : 'pending' } : r
      )
    );
  }, []);

  const handleAddGoal = useCallback((description: string, type: GoalType) => {
    const newGoal: Goal = {
      id: `g${Date.now()}`,
      description,
      type,
      createdAt: new Date(),
    };
    setGoals(prev => [...prev, newGoal]);
  }, []);

  const handleDeleteGoal = useCallback((goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    setGoalCompletions(prev => prev.filter(gc => gc.goalId !== goalId));
  }, []);

  const handleToggleGoalCompletion = useCallback((goalId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const completionIndex = goalCompletions.findIndex(c => c.goalId === goalId && c.date === today);

    if (completionIndex > -1) {
      setGoalCompletions(prev =>
        prev.map((c, i) =>
          i === completionIndex ? { ...c, completed: !c.completed } : c
        )
      );
    } else {
      const newCompletion: GoalCompletion = { goalId, date: today, completed: true };
      setGoalCompletions(prev => [...prev, newCompletion]);
    }
  }, [goalCompletions]);

  const handleReplyWithTask = useCallback((reminderId: string, taskDescription: string) => {
    // Create new task
    const newTask: Task = {
      id: `t${Date.now()}`,
      description: taskDescription,
      timestamp: new Date(),
    };
    setTasks(prevTasks => [...prevTasks, newTask].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));

    // Update reminder with linkedTaskId
    setReminders(prevReminders =>
      prevReminders.map(r =>
        r.id === reminderId ? { ...r, linkedTaskId: newTask.id, status: 'done' as const } : r
      )
    );
  }, []);

  if (!userRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Indicador de sincronização */}
      {isSyncing && (
        <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          <span>Sincronizando...</span>
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