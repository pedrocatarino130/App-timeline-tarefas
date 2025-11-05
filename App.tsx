import React, { useState, useCallback } from 'react';
import { UserRole, Task, Reminder, Goal, GoalType, GoalCompletion } from './types';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';
import GeminiChatBot from './components/GeminiChatBot';

// Mock initial data
const initialTasks: Task[] = [
  { id: 't1', description: 'Limpei a parte de cima', timestamp: new Date(new Date().setHours(8, 0, 0)) },
  { id: 't2', description: 'Alimentei os cães grandes', timestamp: new Date(new Date().setHours(9, 15, 0)) },
];

const initialReminders: Reminder[] = [
  { id: 'r1', type: 'text', content: 'Não esquece de colocar ração para o Bidu.', timestamp: new Date(new Date().setHours(10, 0, 0)), status: 'pending' },
  { id: 'r2', type: 'text', content: 'Verificar a água de todos os potes.', timestamp: new Date(new Date().setHours(11, 30, 0)), status: 'done' },
];

const initialGoals: Goal[] = [
  { id: 'g1', description: 'Limpar a área dos filhotes', type: 'fixed', createdAt: new Date(new Date().setDate(new Date().getDate() - 1)) },
  { id: 'g2', description: 'Comprar mais sacos de lixo', type: 'unique', createdAt: new Date() },
  { id: 'g3', description: 'Organizar estoque de ração', type: 'fixed', createdAt: new Date(new Date().setDate(new Date().getDate() - 2)) },
];

const initialGoalCompletions: GoalCompletion[] = [
  { goalId: 'g1', date: new Date().toISOString().split('T')[0], completed: true },
];


function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [goalCompletions, setGoalCompletions] = useState<GoalCompletion[]>(initialGoalCompletions);

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
      />
      <GeminiChatBot />
    </div>
  );
}

export default App;