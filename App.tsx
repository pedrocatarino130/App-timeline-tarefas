import React, { useState, useCallback, useEffect } from 'react';
import { UserRole, Task, Reminder, Goal, GoalType, GoalCompletion } from './types';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';

// Storage keys
const STORAGE_KEYS = {
  TASKS: 'pet_hotel_tasks',
  REMINDERS: 'pet_hotel_reminders',
  GOALS: 'pet_hotel_goals',
  GOAL_COMPLETIONS: 'pet_hotel_goal_completions',
};

// Helper functions for localStorage
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;

    const parsed = JSON.parse(stored);

    // Convert date strings back to Date objects
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

    return parsed;
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

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
  const [tasks, setTasks] = useState<Task[]>(() => loadFromStorage(STORAGE_KEYS.TASKS, defaultTasks));
  const [reminders, setReminders] = useState<Reminder[]>(() => loadFromStorage(STORAGE_KEYS.REMINDERS, defaultReminders));
  const [goals, setGoals] = useState<Goal[]>(() => loadFromStorage(STORAGE_KEYS.GOALS, defaultGoals));
  const [goalCompletions, setGoalCompletions] = useState<GoalCompletion[]>(() => loadFromStorage(STORAGE_KEYS.GOAL_COMPLETIONS, defaultGoalCompletions));

  // Save to localStorage whenever data changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TASKS, tasks);
  }, [tasks]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.REMINDERS, reminders);
  }, [reminders]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.GOALS, goals);
  }, [goals]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.GOAL_COMPLETIONS, goalCompletions);
  }, [goalCompletions]);

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