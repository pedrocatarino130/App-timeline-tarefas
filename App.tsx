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
import { hashData, getAdaptiveDebounce, mergeLWW, mergeLWWGoalCompletions } from './services/syncUtils';
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
  const lastLocalChangeTimestamp = useRef(0); // 🔥 FIX: Timestamp da última mudança LOCAL
  const pendingSaveTimestamp = useRef(0); // 🔥 FIX: Timestamp do save pendente
  const dataHashRef = useRef<string>(''); // 🔥 FIX #1: Hash dos dados para detectar mudanças REAIS
  const changeCountRef = useRef(0); // 🔥 FIX #5: Contador de mudanças para debounce adaptativo

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
        console.log(`[INIT] ${firebaseData.tasks?.length || 0} tarefas, ${firebaseData.reminders?.length || 0} lembretes, ${firebaseData.goals?.length || 0} metas, ${firebaseData.goalCompletions?.length || 0} conclusões`);

        // Log detalhado das metas
        if (firebaseData.goals && firebaseData.goals.length > 0) {
          console.log(`[INIT] 📋 Metas do Firebase:`, firebaseData.goals.map(g => ({ id: g.id, desc: g.description.substring(0, 30) })));
        }

        isSyncingFromFirebase.current = true; // Ativa flag para prevenir loop

        // 🔥 FIX: Faz merge LWW com dados do localStorage (podem ser mais recentes se último sync falhou)
        console.log(`[INIT] 🔀 Fazendo merge dos dados do Firebase com localStorage...`);
        setTasks(prev => mergeLWW(prev, firebaseData.tasks));
        setReminders(prev => mergeLWW(prev, firebaseData.reminders));
        setGoals(prev => mergeLWW(prev, firebaseData.goals));
        setGoalCompletions(prev => mergeLWWGoalCompletions(prev, firebaseData.goalCompletions));

        lastLocalChangeTimestamp.current = firebaseData.lastUpdated || 0; // 🔥 FIX: Marca quando foi a última atualização
        // Flag será resetada após timeout de 3 segundos para cobrir debounce completo (máximo é 1000ms + margem)
        setTimeout(() => {
          isSyncingFromFirebase.current = false;
        }, 3000); // 🔥 FIX: Aumentado de 1000ms para 3000ms (previne race condition com debounce)
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
      // 🔥 FIX: Envolve todo o listener em try-catch para prevenir crashes
      try {
        const isOwnUpdate = data.lastDeviceId && data.lastDeviceId === currentDeviceId;
        const source = isOwnUpdate ? 'próprio dispositivo (após merge)' : `outro dispositivo (${data.lastDeviceId})`;
        const firebaseTimestamp = data.lastUpdated || 0;

        console.log(`[SYNC ${new Date().toISOString()}] 📥 Dados recebidos de ${source}`);
        console.log(`[SYNC] Device: ${data.lastDeviceId} | Local: ${currentDeviceId}`);
        console.log(`[SYNC] 🕒 Timestamps - Firebase: ${firebaseTimestamp}, Local: ${lastLocalChangeTimestamp.current}, Pendente: ${pendingSaveTimestamp.current}`);

        // 🔥 FIX CRÍTICO: SÓ aplica dados do Firebase se forem mais recentes que a última mudança local
        // OU se não houver mudanças locais pendentes
        const hasLocalChanges = pendingSaveTimestamp.current > 0 && pendingSaveTimestamp.current > firebaseTimestamp;
        const isOlderThanLocal = firebaseTimestamp < lastLocalChangeTimestamp.current;

        if (hasLocalChanges) {
          console.log(`[SYNC ${new Date().toISOString()}] ⏭️  IGNORANDO dados do Firebase - há mudanças locais mais recentes pendentes de save`);
          console.log(`[SYNC] Pendente: ${pendingSaveTimestamp.current} > Firebase: ${firebaseTimestamp}`);
          return; // 🔥 NÃO sobrescreve mudanças locais!
        }

        if (isOlderThanLocal && !isOwnUpdate) {
          console.log(`[SYNC ${new Date().toISOString()}] ⏭️  IGNORANDO dados do Firebase - são mais antigos que mudanças locais`);
          console.log(`[SYNC] Local: ${lastLocalChangeTimestamp.current} > Firebase: ${firebaseTimestamp}`);
          return; // 🔥 NÃO sobrescreve com dados antigos!
        }

        console.log(`[SYNC] 📊 Aplicando ao estado: ${data.tasks.length} tarefas, ${data.reminders.length} lembretes, ${data.goals.length} metas, ${data.goalCompletions.length} conclusões`);

        // Log detalhado das metas
        if (data.goals && data.goals.length > 0) {
          console.log(`[SYNC] 📋 Metas recebidas:`, data.goals.map(g => ({ id: g.id, desc: g.description.substring(0, 30) })));
        }

        // Ativa flag para prevenir loop infinito
        isSyncingFromFirebase.current = true;

        // 🔥 FIX CRÍTICO: Usa merge LWW (Last-Write-Wins) no cliente para prevenir perda de dados
        // Em vez de sobrescrever completamente, faz merge item-por-item baseado em timestamps
        console.log(`[SYNC] 🔀 Fazendo merge LWW dos dados recebidos com estado local...`);

        // Captura os dados merged para calcular hash depois
        let mergedTasks: Task[];
        let mergedReminders: Reminder[];
        let mergedGoals: Goal[];
        let mergedGoalCompletions: GoalCompletion[];

        setTasks(prev => {
          mergedTasks = mergeLWW(prev, data.tasks);
          console.log(`[SYNC] 🔀 Tasks: ${prev.length} local + ${data.tasks.length} Firebase → ${mergedTasks.length} merged`);
          return mergedTasks;
        });
        setReminders(prev => {
          mergedReminders = mergeLWW(prev, data.reminders);
          console.log(`[SYNC] 🔀 Reminders: ${prev.length} local + ${data.reminders.length} Firebase → ${mergedReminders.length} merged`);
          return mergedReminders;
        });
        setGoals(prev => {
          mergedGoals = mergeLWW(prev, data.goals);
          console.log(`[SYNC] 🔀 Goals: ${prev.length} local + ${data.goals.length} Firebase → ${mergedGoals.length} merged`);
          return mergedGoals;
        });
        setGoalCompletions(prev => {
          mergedGoalCompletions = mergeLWWGoalCompletions(prev, data.goalCompletions);
          console.log(`[SYNC] 🔀 GoalCompletions: ${prev.length} local + ${data.goalCompletions.length} Firebase → ${mergedGoalCompletions.length} merged`);
          return mergedGoalCompletions;
        });

        lastSyncTime.current = firebaseTimestamp;
        lastLocalChangeTimestamp.current = firebaseTimestamp; // 🔥 FIX: Atualiza timestamp local

        // 🔥 FIX #1: Atualiza hash para refletir dados MERGED (não só os do Firebase)
        const newHash = hashData({
          tasks: mergedTasks!,
          reminders: mergedReminders!,
          goals: mergedGoals!,
          goalCompletions: mergedGoalCompletions!,
        });
        dataHashRef.current = newHash;
        console.log(`[SYNC] 🔑 Hash atualizado: ${newHash.substring(0, 8)}`);

        // 🔥 FIX: Limpa timestamp de save pendente (já foi sincronizado)
        if (isOwnUpdate) {
          pendingSaveTimestamp.current = 0;
          console.log(`[SYNC ${new Date().toISOString()}] ✅ Save confirmado - limpando pendência`);
        }

        // Reseta flag após atualização - AUMENTADO para 3 segundos
        setTimeout(() => {
          isSyncingFromFirebase.current = false;
        }, 3000); // 🔥 FIX: Aumentado de 1000ms para 3000ms (previne race condition com debounce)
      } catch (error) {
        // 🔥 FIX: Captura qualquer erro no listener e limpa estados
        console.error(`[SYNC ${new Date().toISOString()}] ❌ ERRO CRÍTICO no listener:`, error);
        console.error('[SYNC] Stack trace:', error instanceof Error ? error.stack : 'N/A');

        // Limpa flags para desbloquear sincronizações futuras
        isSyncingFromFirebase.current = false;
        pendingSaveTimestamp.current = 0;

        console.log('[SYNC] 🔓 Estados limpos após erro - sincronização pode continuar');
      }
    });

    return () => {
      if (unsubscribe) {
        console.log(`[SYNC ${new Date().toISOString()}] 🛑 Desconectando sincronização...`);
        unsubscribe();
      }
    };
  }, [isLoaded]);

  // 🔥 FIX #1 + #5: Salva no localStorage e Firebase com hash comparison e debounce adaptativo
  useEffect(() => {
    // Não salva se ainda não terminou de carregar
    if (!isLoaded) return;

    // IMPORTANTE: Previne loop infinito - não salva se estamos recebendo do Firebase
    if (isSyncingFromFirebase.current) {
      console.log(`[SAVE ${new Date().toISOString()}] ⏭️ Pulando save (dados vieram do Firebase)`);
      return;
    }

    // 🔥 FIX #1: Calcula hash dos dados atuais
    const currentHash = hashData({ tasks, reminders, goals, goalCompletions });

    // 🔥 FIX #1: SÓ salva se o hash mudou (mudança REAL)
    if (currentHash === dataHashRef.current) {
      console.log(`[SAVE ${new Date().toISOString()}] ⏭️ Hash não mudou, pulando save (previne loop)`);
      return;
    }

    console.log(`[SAVE ${new Date().toISOString()}] 🔄 Hash mudou: ${dataHashRef.current.substring(0, 8)} → ${currentHash.substring(0, 8)}`);
    dataHashRef.current = currentHash;

    // 🔥 FIX: Marca timestamp de mudança LOCAL imediatamente
    const changeTimestamp = Date.now();
    lastLocalChangeTimestamp.current = changeTimestamp;
    pendingSaveTimestamp.current = changeTimestamp; // 🔥 FIX CRÍTICO: Marca save pendente IMEDIATAMENTE (fecha janela crítica)
    changeCountRef.current++; // Incrementa contador de mudanças

    console.log(`[SAVE ${new Date().toISOString()}] 🔄 Mudança local detectada (timestamp: ${changeTimestamp}, count: ${changeCountRef.current})`);
    console.log(`[SAVE] 🔒 Save pendente marcado ANTES do debounce (previne sobrescrita do listener)`);

    // Salva no localStorage imediatamente
    saveToLocalStorage(STORAGE_KEYS.TASKS, tasks);
    saveToLocalStorage(STORAGE_KEYS.REMINDERS, reminders);
    saveToLocalStorage(STORAGE_KEYS.GOALS, goals);
    saveToLocalStorage(STORAGE_KEYS.GOAL_COMPLETIONS, goalCompletions);

    // 🔥 FIX #5: Debounce adaptativo baseado na frequência de mudanças
    const debounceTime = getAdaptiveDebounce(changeCountRef.current);
    console.log(`[SAVE] ⏱️ Debounce de ${debounceTime}ms (mudanças: ${changeCountRef.current})`);

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      // pendingSaveTimestamp já foi setado acima (antes do debounce)
      const timestamp = Date.now();
      console.log(`[SAVE ${new Date().toISOString()}] 💾 Salvando no Firebase (timestamp: ${timestamp})...`);
      console.log(`[SAVE] 📊 ${tasks.length} tarefas, ${reminders.length} lembretes, ${goals.length} metas, ${goalCompletions.length} conclusões`);
      setIsSyncing(true);
      setFirebaseError(null); // Limpa erro anterior

      const userData: UserData = {
        tasks,
        reminders,
        goals,
        goalCompletions,
        lastUpdated: timestamp,
      };

      const result = await saveToFirebase(userData);

      if (result.success) {
        lastSyncTime.current = timestamp;
        console.log(`[SAVE ${new Date().toISOString()}] ✅ Salvo com sucesso!`);
        setFirebaseError(null); // Limpa qualquer erro anterior
        changeCountRef.current = 0; // 🔥 FIX #5: Reseta contador após save bem-sucedido
        // 🔥 FIX: NÃO limpa pendingSaveTimestamp aqui - será limpo quando o listener confirmar
      } else {
        // Se falhou, mostra o erro específico retornado
        const errorMessage = result.error || 'Erro ao sincronizar com Firebase. Dados salvos localmente.';
        console.error(`[SAVE ${new Date().toISOString()}] ❌ Falha:`, errorMessage);
        setFirebaseError(errorMessage);
        pendingSaveTimestamp.current = 0; // 🔥 FIX: Limpa pendência se falhou
        changeCountRef.current = 0; // Reseta contador
      }

      setIsSyncing(false);
    }, debounceTime);

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
      author: userRole || undefined, // Adiciona quem criou a tarefa
      _updatedAt: Date.now(), // 🔥 FIX: Timestamp de criação para merge LWW
    };
    setTasks(prevTasks => [...prevTasks, newTask].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
  }, [userRole]);

  const handleDeleteTask = useCallback((taskId: string) => {
    // 🔥 FIX: Deletes também disparam mudança de hash, então serão sincronizados
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  }, []);

  const handleSendReminder = useCallback((reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>) => {
    const newReminder: Reminder = {
      ...reminder,
      id: `r${Date.now()}`,
      timestamp: new Date(),
      status: 'pending',
      author: userRole || undefined, // Adiciona quem criou o lembrete
      _updatedAt: Date.now(), // 🔥 FIX: Timestamp de criação para merge LWW
    };
    setReminders(prevReminders => [...prevReminders, newReminder]);
  }, [userRole]);

  const handleDeleteReminder = useCallback((reminderId: string) => {
    setReminders(prevReminders => prevReminders.filter(r => r.id !== reminderId));
  }, []);

  const handleToggleReminderStatus = useCallback((reminderId: string) => {
    setReminders(prevReminders =>
      prevReminders.map(r =>
        r.id === reminderId
          ? { ...r, status: r.status === 'pending' ? 'done' : 'pending', _updatedAt: Date.now() } // 🔥 FIX: Atualiza timestamp
          : r
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
      _updatedAt: Date.now(), // 🔥 FIX: Timestamp de criação para merge LWW
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
          i === completionIndex
            ? { ...c, completed: !c.completed, _updatedAt: Date.now() } // 🔥 FIX: Atualiza timestamp
            : c
        )
      );
    } else {
      const newCompletion: GoalCompletion = {
        goalId,
        date: today,
        completed: true,
        _updatedAt: Date.now(), // 🔥 FIX: Timestamp de criação
      };
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
      _updatedAt: Date.now(), // 🔥 FIX: Timestamp de criação
    };
    setTasks(prevTasks => [...prevTasks, newTask].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));

    // Update reminder with linkedTaskId
    setReminders(prevReminders =>
      prevReminders.map(r =>
        r.id === reminderId
          ? { ...r, linkedTaskId: newTask.id, status: 'done' as const, _updatedAt: Date.now() } // 🔥 FIX: Atualiza timestamp
          : r
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