import React, { useState, useMemo } from 'react';
import { Task, UserRole, Goal, GoalCompletion, GoalType } from '../types';
import TaskForm from './TaskForm';
import GoalForm from './GoalForm';
import { PlusIcon, CheckCircleIcon, CircleIcon, TargetIcon, TrashIcon, CloseIcon } from './Icons';

interface TimelineProps {
  userRole: UserRole;
  tasks: Task[];
  goals: Goal[];
  goalCompletions: GoalCompletion[];
  onAddTask: (description: string, mediaUrl?: string, mediaType?: 'image' | 'video') => void;
  onDeleteTask: (taskId: string) => void;
  onAddGoal: (description: string, type: GoalType) => void;
  onToggleGoalCompletion: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

const Timeline: React.FC<TimelineProps> = ({ userRole, tasks, goals, goalCompletions, onAddTask, onDeleteTask, onAddGoal, onToggleGoalCompletion, onDeleteGoal }) => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const sortedTasks = [...tasks].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const handleAddTask = (description: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    onAddTask(description, mediaUrl, mediaType);
    setShowTaskForm(false);
  };

  const handleDeleteTaskWithConfirmation = (taskId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
        onDeleteTask(taskId);
    }
  };

  const handleAddGoal = (description: string, type: GoalType) => {
    onAddGoal(description, type);
    setShowGoalForm(false);
  }

  const handleDeleteGoalWithConfirmation = (goal: Goal) => {
    if (window.confirm(`Tem certeza que deseja remover a meta "${goal.description}"?`)) {
        onDeleteGoal(goal.id);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
      
  const dailyGoals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return goals.filter(goal => {
        if (goal.type === 'fixed') return true;
        const goalDate = new Date(goal.createdAt);
        goalDate.setHours(0, 0, 0, 0);
        return goal.type === 'unique' && goalDate.getTime() === today.getTime();
    });
  }, [goals]);

  const goalCompletionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    goalCompletions
        .filter(c => c.date === todayStr)
        .forEach(c => {
            map.set(c.goalId, c.completed);
        });
    return map;
  }, [goalCompletions, todayStr]);

  return (
    <div className="relative">
        <div className="mb-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center">
                    <TargetIcon className="w-6 h-6 mr-2 text-indigo-500"/>
                    Metas do Dia
                </h3>
                <button onClick={() => setShowGoalForm(true)} className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                   + Adicionar
                </button>
            </div>
            <div className="space-y-2">
                {dailyGoals.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">Nenhuma meta definida para hoje.</p>
                ) : (
                    dailyGoals.map(goal => {
                        const isCompleted = goalCompletionMap.get(goal.id) || false;
                        return (
                            <div key={goal.id} className="flex items-center group">
                                <button onClick={() => onToggleGoalCompletion(goal.id)} disabled={userRole !== 'Executor'} className="mr-3 disabled:cursor-not-allowed flex-shrink-0">
                                    {isCompleted ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <CircleIcon className="w-6 h-6 text-gray-400" />}
                                </button>
                                <span className={`flex-grow ${isCompleted ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {goal.description}
                                </span>
                                {goal.type === 'fixed' && <span className="ml-2 text-xs font-semibold bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">Fixa</span>}
                                <button 
                                    onClick={() => handleDeleteGoalWithConfirmation(goal)} 
                                    className="ml-auto p-1 text-gray-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Remover meta"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Linha do Tempo de Tarefas</h2>
        <div className="border-l-2 border-gray-300 dark:border-gray-600 ml-4 pl-8 space-y-8">
            {sortedTasks.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Nenhuma tarefa registrada hoje.</p>
            ) : (
                sortedTasks.map(task => (
                    <div key={task.id} className="relative group">
                        <div className="absolute -left-[42px] top-1.5 w-4 h-4 bg-blue-500 rounded-full border-4 border-white dark:border-gray-800"></div>
                        <div className="pr-8">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{formatDate(task.timestamp)}</p>
                            {task.description && <p className="mt-1 text-lg text-gray-800 dark:text-gray-200">{task.description}</p>}
                            {task.mediaUrl && (
                              <div className="mt-2">
                                {task.mediaType === 'video' ? (
                                    <video
                                        src={task.mediaUrl}
                                        className="w-48 h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setViewingMedia({ url: task.mediaUrl!, type: 'video' })}
                                    />
                                ) : (
                                    <img
                                        src={task.mediaUrl}
                                        alt="Mídia da tarefa"
                                        className="w-48 h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setViewingMedia({ url: task.mediaUrl!, type: 'image' })}
                                    />
                                )}
                              </div>
                            )}
                        </div>
                        {userRole === 'Executor' && (
                            <button
                                onClick={() => handleDeleteTaskWithConfirmation(task.id)}
                                className="absolute top-0 right-0 p-1 text-gray-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Excluir Tarefa"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                ))
            )}
        </div>
        {userRole === 'Executor' && (
            <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="fixed bottom-20 right-6 flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-110"
                aria-label="Adicionar Nova Tarefa"
            >
                <PlusIcon className="w-8 h-8"/>
            </button>
        )}
        {showTaskForm && <TaskForm onSubmit={handleAddTask} onCancel={() => setShowTaskForm(false)} />}
        {showGoalForm && <GoalForm onSubmit={handleAddGoal} onCancel={() => setShowGoalForm(false)} />}

        {viewingMedia && (
            <div
                className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
                onClick={() => setViewingMedia(null)}
            >
                <button
                    className="absolute top-4 right-4 text-white text-2xl"
                    onClick={() => setViewingMedia(null)}
                    aria-label="Close media viewer"
                >
                   <CloseIcon className="w-8 h-8"/>
                </button>
                {viewingMedia.type === 'video' ? (
                    <video
                        src={viewingMedia.url}
                        controls
                        autoPlay
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <img
                        src={viewingMedia.url}
                        alt="Full view"
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
            </div>
        )}
    </div>
  );
};

export default Timeline;