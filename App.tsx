import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UserRole, Task, Reminder, Goal, GoalType, GoalCompletion } from './types';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';
import {
  STORAGE_KEYS,
  loadFromLocalStorage,
  saveToLocalStorage,
  saveToFirebase,
  loadFromFirebase,
  syncWithFirebase,
  UserData,
  getDeviceId,
} from './services/syncService';
import { db } from './firebase.config';

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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoaded, setIsLoaded] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null); // Erro visível na tela
  const lastSyncTime = useRef(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingFromFirebase = useRef(false); // Flag anti-loop
  const lastSavedTimestamp = useRef(0); // Timestamp do último save local

  // Detector de online/offline
  useEffect(() => {
    const handleOnline = () => {
      console.log(`[NETWORK ${new Date().toISOString()}] 🌐 Conexão restaurada`);
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log(`[NETWORK ${new Date().toISOString()}] ⚠️ Você está offline`);
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Carrega dados do Firebase ao iniciar (workspace compartilhado)
  useEffect(() => {
    const loadData = async () => {
      console.log(`[INIT ${new Date().toISOString()}] 🔄 Carregando dados do workspace compartilhado...`);
      console.log(`[INIT] Firebase DB disponível: ${!!db}`);
      const firebaseData = await loadFromFirebase();

      if (firebaseData) {
        console.log(`[INIT ${new Date().toISOString()}] ✅ Dados carregados do Firebase (workspace compartilhado)!`);
        console.log(`[INIT] ${firebaseData.tasks?.length || 0} tarefas, ${firebaseData.reminders?.length || 0} lembretes, ${firebaseData.goals?.length || 0} metas`);
        isSyncingFromFirebase.current = true; // Ativa flag para prevenir loop
        setTasks(firebaseData.tasks);
        setReminders(firebaseData.reminders);
        setGoals(firebaseData.goals);
        setGoalCompletions(firebaseData.goalCompletions);
        lastSavedTimestamp.current = firebaseData.lastUpdated || 0;
        // Flag será resetada após timeout
        setTimeout(() => {
          isSyncingFromFirebase.current = false;
        }, 100);
      } else {
        console.log(`[INIT ${new Date().toISOString()}] 📦 Usando dados do localStorage`);
      }

      setIsLoaded(true);
    };

    loadData();
  }, []);

  // Sincronização em tempo real (workspace compartilhado)
  useEffect(() => {
    if (!isLoaded) return;

    const currentDeviceId = getDeviceId();
    console.log(`[SYNC ${new Date().toISOString()}] 🔄 Configurando sincronização em tempo real do workspace...`);
    const unsubscribe = syncWithFirebase((data) => {
      // Detecta se é nossa própria atualização comparando deviceIds
      const isOwnUpdate = data.lastDeviceId && data.lastDeviceId === currentDeviceId;

      if (isOwnUpdate) {
        console.log(`[SYNC ${new Date().toISOString()}] ⏭️ Pulando (dados do próprio dispositivo)`);
        return;
      }

      console.log(`[SYNC ${new Date().toISOString()}] 📥 Dados recebidos de outro dispositivo!`);
      console.log(`[SYNC] Device remoto: ${data.lastDeviceId}, Device local: ${currentDeviceId}`);

      // Ativa flag para prevenir loop infinito
      isSyncingFromFirebase.current = true;

      setTasks(data.tasks);
      setReminders(data.reminders);
      setGoals(data.goals);
      setGoalCompletions(data.goalCompletions);
      lastSyncTime.current = data.lastUpdated || Date.now();

      // Reseta flag após atualização
      setTimeout(() => {
        isSyncingFromFirebase.current = false;
      }, 100);
    });

    return () => {
      if (unsubscribe) {
        console.log(`[SYNC ${new Date().toISOString()}] 🛑 Desconectando sincronização...`);
        unsubscribe();
      }
    };
  }, [isLoaded]);

  // Salva no localStorage e Firebase com debounce
  useEffect(() => {
    // Não salva se ainda não terminou de carregar
    if (!isLoaded) return;

    // IMPORTANTE: Previne loop infinito - não salva se estamos recebendo do Firebase
    if (isSyncingFromFirebase.current) {
      console.log(`[SAVE ${new Date().toISOString()}] ⏭️ Pulando save (dados vieram do Firebase)`);
      return;
    }

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
      const timestamp = Date.now();
      console.log(`[SAVE ${new Date().toISOString()}] 💾 Salvando no Firebase (timestamp: ${timestamp})...`);
      setIsSyncing(true);
      setFirebaseError(null); // Limpa erro anterior

      const userData: UserData = {
        tasks,
        reminders,
        goals,
        goalCompletions,
        lastUpdated: timestamp,
      };

      // Marca o timestamp ANTES de salvar para comparação posterior
      lastSavedTimestamp.current = timestamp;

      try {
        const success = await saveToFirebase(userData);
        if (success) {
          lastSyncTime.current = timestamp;
          console.log(`[SAVE ${new Date().toISOString()}] ✅ Salvo com sucesso!`);
          setFirebaseError(null); // Limpa qualquer erro anterior
        } else {
          // Se retornou false, houve algum problema
          setFirebaseError('Erro ao sincronizar com Firebase. Dados salvos localmente.');
        }
      } catch (error: any) {
        console.error('[SAVE] Exceção capturada:', error);

        // Mostra erro específico na tela
        if (error.code === 'permission-denied') {
          setFirebaseError('🚨 ERRO: Regras do Firestore não configuradas! Vá no Firebase Console → Firestore → Regras → Publicar');
        } else if (error.code === 'unavailable') {
          setFirebaseError('⚠️ Firebase indisponível. Tentando novamente...');
        } else {
          setFirebaseError(`Erro Firebase: ${error.code || error.message}`);
        }
      }

      setIsSyncing(false);
    }, 500);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [tasks, reminders, goals, goalCompletions]); // Removido isLoaded das dependências!

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
      author: userRole || undefined, // Adiciona quem criou a tarefa
    };
    setTasks(prevTasks => [...prevTasks, newTask].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
  }, [userRole]);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  }, []);

  const handleSendReminder = useCallback((reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>) => {
    const newReminder: Reminder = {
      ...reminder,
      id: `r${Date.now()}`,
      timestamp: new Date(),
      status: 'pending',
      author: userRole || undefined, // Adiciona quem criou o lembrete
    };
    setReminders(prevReminders => [...prevReminders, newReminder]);
  }, [userRole]);

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
      author: userRole || undefined, // Adiciona quem criou a meta
    };
    setGoals(prev => [...prev, newGoal]);
  }, [userRole]);

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
      author: userRole || undefined, // Adiciona quem criou a tarefa
    };
    setTasks(prevTasks => [...prevTasks, newTask].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));

    // Update reminder with linkedTaskId
    setReminders(prevReminders =>
      prevReminders.map(r =>
        r.id === reminderId ? { ...r, linkedTaskId: newTask.id, status: 'done' as const } : r
      )
    );
  }, [userRole]);

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

      {/* Banner de erro do Firebase - VISÍVEL NA TELA */}
      {firebaseError && (
        <div
          className="fixed left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 text-center font-semibold shadow-lg"
          style={{ top: !isOnline ? '48px' : '0' }}
        >
          <div className="text-sm mb-1">🚨 ERRO DE SINCRONIZAÇÃO</div>
          <div className="text-xs">{firebaseError}</div>
          <button
            onClick={() => setFirebaseError(null)}
            className="mt-2 px-3 py-1 bg-white text-red-600 rounded text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      )}

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