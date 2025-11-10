import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task, UserRole, Goal, GoalCompletion, GoalType, Reminder } from '../types';
import TaskForm from './TaskForm';
import GoalForm from './GoalForm';
import AudioRecorder from './AudioRecorder';
import { PlusIcon, CheckCircleIcon, CircleIcon, TargetIcon, TrashIcon, CloseIcon, CommentIcon } from './Icons';

interface TimelineProps {
  userRole: UserRole;
  tasks: Task[];
  goals: Goal[];
  goalCompletions: GoalCompletion[];
  onAddTask: (description: string, mediaUrl?: string, mediaType?: 'image' | 'video') => void;
  onDeleteTask: (taskId: string) => void;
  onAddGoal: (description: string, type: GoalType, audioUrl?: string) => void;
  onToggleGoalCompletion: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
  onSendReminder: (reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>) => void;
}

const Timeline: React.FC<TimelineProps> = ({ userRole, tasks, goals, goalCompletions, onAddTask, onDeleteTask, onAddGoal, onToggleGoalCompletion, onDeleteGoal, onSendReminder }) => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [expandedAudioGoals, setExpandedAudioGoals] = useState<Set<string>>(new Set());
  const [viewingMedia, setViewingMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [commentingTask, setCommentingTask] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const commentContainerRef = useRef<HTMLDivElement>(null);
  const sortedTasks = [...tasks].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  // Log para debug de mídias
  useEffect(() => {
    const tasksWithMedia = tasks.filter(t => t.mediaUrl);
    if (tasksWithMedia.length > 0) {
      console.log('[TIMELINE] Tarefas com mídia:', tasksWithMedia.length, tasksWithMedia.map(t => ({
        id: t.id,
        description: t.description.substring(0, 30),
        hasMediaUrl: !!t.mediaUrl,
        mediaType: t.mediaType
      })));
    }
  }, [tasks]);

  // Auto-scroll quando o formulário de comentário é aberto
  useEffect(() => {
    if (commentingTask && commentContainerRef.current) {
      // Aguardar renderização do DOM
      setTimeout(() => {
        commentContainerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        // Focar no textarea após o scroll (especialmente importante no iOS)
        setTimeout(() => {
          commentTextareaRef.current?.focus();
        }, 300);
      }, 100);
    }
  }, [commentingTask]);

  const handleAddTask = (description: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    onAddTask(description, mediaUrl, mediaType);
    setShowTaskForm(false);
  };

  const handleDeleteTaskWithConfirmation = (taskId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
        onDeleteTask(taskId);
    }
  };

  const handleAddGoal = (description: string, type: GoalType, audioUrl?: string) => {
    onAddGoal(description, type, audioUrl);
    setShowGoalForm(false);
  }

  const handleDeleteGoalWithConfirmation = (goal: Goal) => {
    if (window.confirm(`Tem certeza que deseja remover a meta "${goal.description}"?`)) {
        onDeleteGoal(goal.id);
    }
  };

  const handleAddComment = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && commentText.trim()) {
      onSendReminder({
        type: 'text',
        content: commentText.trim(),
        linkedTaskId: taskId,
      });
      setCommentText('');
      setCommentingTask(null);
    }
  };

  const handleSendAudioComment = (taskId: string) => async (audioUrl: string, audioBlob: Blob) => {
    try {
      // Converter blob para base64 para poder salvar no Firestore e compartilhar entre dispositivos
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        onSendReminder({
          type: 'audio',
          content: 'Comentário em áudio',
          audioUrl: base64Audio,
          linkedTaskId: taskId,
        });
        setCommentingTask(null);
      };
      reader.onerror = () => {
        console.error('Erro ao converter áudio para base64');
        alert('Erro ao processar áudio. Tente novamente.');
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      alert('Erro ao processar áudio. Tente novamente.');
    }
  };

  const cancelComment = () => {
    setCommentingTask(null);
    setCommentText('');
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
        <div className="mb-5 sm:mb-6 md:mb-8 p-3 sm:p-4 md:p-5 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center">
                    <TargetIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-500"/>
                    <span className="leading-tight">Metas do Dia</span>
                </h3>
                <button onClick={() => setShowGoalForm(true)} className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors active:scale-95">
                   + Adicionar
                </button>
            </div>
            <div className="space-y-2.5 sm:space-y-3">
                {dailyGoals.length === 0 ? (
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 py-2">Nenhuma meta definida para hoje.</p>
                ) : (
                    dailyGoals.map(goal => {
                        const isCompleted = goalCompletionMap.get(goal.id) || false;
                        const isAudioExpanded = expandedAudioGoals.has(goal.id);
                        
                        const toggleAudio = () => {
                            setExpandedAudioGoals(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(goal.id)) {
                                    newSet.delete(goal.id);
                                } else {
                                    newSet.add(goal.id);
                                }
                                return newSet;
                            });
                        };
                        
                        return (
                            <div key={goal.id} className="flex items-start gap-2 sm:gap-3 group p-2 sm:p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <button onClick={() => onToggleGoalCompletion(goal.id)} disabled={userRole !== 'Executor'} className="disabled:cursor-not-allowed flex-shrink-0 active:scale-90 transition-transform mt-0.5">
                                    {isCompleted ? <CheckCircleIcon className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" /> : <CircleIcon className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" />}
                                </button>
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-sm sm:text-base leading-snug ${isCompleted ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {goal.description}
                                        </span>
                                        {goal.audioUrl && (
                                            <button
                                                onClick={toggleAudio}
                                                className="text-[10px] sm:text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors active:scale-95"
                                            >
                                                {isAudioExpanded ? '🔊' : '🎵'} {isAudioExpanded ? 'Fechar' : 'Áudio'}
                                            </button>
                                        )}
                                    </div>
                                    {goal.audioUrl && isAudioExpanded && (
                                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <audio controls src={goal.audioUrl} className="w-full max-w-md h-8" autoPlay />
                                        </div>
                                    )}
                                </div>
                                {goal.type === 'fixed' && <span className="ml-1 text-[10px] sm:text-xs font-bold bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">Fixa</span>}
                                <button
                                    onClick={() => handleDeleteGoalWithConfirmation(goal)}
                                    className="flex-shrink-0 p-1.5 sm:p-2 text-gray-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                                    aria-label="Remover meta"
                                >
                                    <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-800 dark:text-gray-200 leading-tight">Linha do Tempo de Tarefas</h2>
        <div className="border-l-2 border-gray-300 dark:border-gray-600 ml-2 sm:ml-3 md:ml-4 pl-4 sm:pl-6 md:pl-8 space-y-6 sm:space-y-7 md:space-y-8">
            {sortedTasks.length === 0 ? (
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 py-2">Nenhuma tarefa registrada hoje.</p>
            ) : (
                sortedTasks.map(task => (
                    <div key={task.id} className="relative group">
                        <div className="absolute -left-[26px] sm:-left-[34px] md:-left-[42px] top-1.5 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 bg-blue-500 rounded-full border-[3px] sm:border-[3.5px] md:border-4 border-white dark:border-gray-900"></div>
                        <div className="pr-2 sm:pr-4 md:pr-8">
                            <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400">{formatDate(task.timestamp)}</p>
                            {task.description && <p className="mt-1 sm:mt-1.5 text-base sm:text-lg text-gray-800 dark:text-gray-200 leading-snug">{task.description}</p>}
                            {task.mediaUrl && (
                              <div className="mt-2 sm:mt-3">
                                {task.mediaType === 'video' ? (
                                    <video
                                        src={task.mediaUrl}
                                        className="w-full max-w-[280px] sm:max-w-xs md:max-w-sm h-auto aspect-square object-cover rounded-xl cursor-pointer hover:opacity-90 transition-all hover:scale-[1.02] shadow-md"
                                        onClick={() => setViewingMedia({ url: task.mediaUrl!, type: 'video' })}
                                    />
                                ) : (
                                    <img
                                        src={task.mediaUrl}
                                        alt="Mídia da tarefa"
                                        className="w-full max-w-[280px] sm:max-w-xs md:max-w-sm h-auto aspect-square object-cover rounded-xl cursor-pointer hover:opacity-90 transition-all hover:scale-[1.02] shadow-md"
                                        onClick={() => setViewingMedia({ url: task.mediaUrl!, type: 'image' })}
                                    />
                                )}
                              </div>
                            )}

                            {commentingTask === task.id && userRole === 'Supervisor' && (
                              <div ref={commentContainerRef} className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 mb-6">
                                <div className="mb-3">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Gravar áudio:</p>
                                  <AudioRecorder onSendAudio={handleSendAudioComment(task.id)} />
                                </div>

                                <div className="flex items-center gap-2 my-3">
                                  <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">ou</span>
                                  <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                                </div>

                                <textarea
                                  ref={commentTextareaRef}
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  placeholder="Escreva um comentário..."
                                  className="w-full p-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  rows={3}
                                  onFocus={(e) => {
                                    // Scroll adicional no iOS quando o teclado aparece
                                    setTimeout(() => {
                                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 300);
                                  }}
                                />
                                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                  <button
                                    onClick={() => handleAddComment(task.id)}
                                    disabled={!commentText.trim()}
                                    className="flex-1 px-3 py-2.5 text-xs sm:text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                                  >
                                    Enviar Texto para Chat
                                  </button>
                                  <button
                                    onClick={cancelComment}
                                    className="px-3 py-2.5 text-xs sm:text-sm font-semibold bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 active:scale-95 transition-all"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}

                            {userRole === 'Supervisor' && commentingTask !== task.id && (
                              <button
                                onClick={() => setCommentingTask(task.id)}
                                className="mt-2 sm:mt-3 flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all active:scale-95"
                              >
                                <CommentIcon className="w-4 h-4" />
                                Comentar no Chat
                              </button>
                            )}
                        </div>
                        {userRole === 'Executor' && (
                            <button
                                onClick={() => handleDeleteTaskWithConfirmation(task.id)}
                                className="absolute top-0 right-0 p-2 sm:p-1.5 text-gray-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                aria-label="Excluir Tarefa"
                            >
                                <TrashIcon className="w-5 h-5 sm:w-5 sm:h-5" />
                            </button>
                        )}
                    </div>
                ))
            )}
        </div>
        {userRole === 'Executor' && (
            <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="fixed bottom-[88px] sm:bottom-[92px] right-4 sm:right-6 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full shadow-xl hover:shadow-2xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all transform hover:scale-110 active:scale-95 z-40"
                aria-label="Adicionar Nova Tarefa"
            >
                <PlusIcon className="w-7 h-7 sm:w-8 sm:h-8"/>
            </button>
        )}
        {showTaskForm && <TaskForm onSubmit={handleAddTask} onCancel={() => setShowTaskForm(false)} />}
        {showGoalForm && <GoalForm onSubmit={handleAddGoal} onCancel={() => setShowGoalForm(false)} />}

        {viewingMedia && (
            <div
                className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={() => setViewingMedia(null)}
            >
                <button
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-2 sm:p-3 transition-all active:scale-90"
                    onClick={() => setViewingMedia(null)}
                    aria-label="Close media viewer"
                >
                   <CloseIcon className="w-6 h-6 sm:w-8 sm:h-8"/>
                </button>
                {viewingMedia.type === 'video' ? (
                    <video
                        src={viewingMedia.url}
                        controls
                        autoPlay
                        className="max-w-full max-h-[85vh] sm:max-w-[90vw] sm:max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <img
                        src={viewingMedia.url}
                        alt="Full view"
                        className="max-w-full max-h-[85vh] sm:max-w-[90vw] sm:max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
            </div>
        )}
    </div>
  );
};

export default Timeline;