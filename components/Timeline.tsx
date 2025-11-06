import React, { useState, useMemo } from 'react';
import { Task, UserRole, Goal, GoalCompletion, GoalType, Reminder } from '../types';
import TaskForm from './TaskForm';
import GoalForm from './GoalForm';
import { PlusIcon, CheckCircleIcon, CircleIcon, TargetIcon, TrashIcon, CloseIcon, CommentIcon } from './Icons';

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
  onSendReminder: (reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>) => void;
}

const Timeline: React.FC<TimelineProps> = ({ userRole, tasks, goals, goalCompletions, onAddTask, onDeleteTask, onAddGoal, onToggleGoalCompletion, onDeleteGoal, onSendReminder }) => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [commentingTask, setCommentingTask] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const sendAudioComment = (taskId: string) => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      onSendReminder({
        type: 'audio',
        content: 'Comentário em áudio',
        audioUrl: audioUrl,
        linkedTaskId: taskId,
      });
      setAudioBlob(null);
      setCommentingTask(null);
    }
  };

  const cancelComment = () => {
    setCommentingTask(null);
    setCommentText('');
    setAudioBlob(null);
    if (isRecording) {
      stopRecording();
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

                            {commentingTask === task.id && userRole === 'Supervisor' && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                  <button
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                      isRecording
                                        ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                                        : 'bg-purple-600 text-white hover:bg-purple-700'
                                    }`}
                                  >
                                    {isRecording ? '⏹️ Parar Gravação' : '🎤 Gravar Áudio'}
                                  </button>
                                </div>

                                {audioBlob && !isRecording && (
                                  <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">Áudio gravado:</p>
                                    <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={() => sendAudioComment(task.id)}
                                        className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                      >
                                        Enviar Áudio para Chat
                                      </button>
                                      <button
                                        onClick={() => setAudioBlob(null)}
                                        className="px-3 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                                      >
                                        Descartar
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {!audioBlob && !isRecording && (
                                  <>
                                    <textarea
                                      value={commentText}
                                      onChange={(e) => setCommentText(e.target.value)}
                                      placeholder="Ou escreva um comentário..."
                                      className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      rows={3}
                                    />
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={() => handleAddComment(task.id)}
                                        disabled={!commentText.trim()}
                                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Enviar Texto para Chat
                                      </button>
                                      <button
                                        onClick={cancelComment}
                                        className="px-3 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {userRole === 'Supervisor' && commentingTask !== task.id && (
                              <button
                                onClick={() => setCommentingTask(task.id)}
                                className="mt-2 flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              >
                                <CommentIcon className="w-4 h-4" />
                                Comentar no Chat
                              </button>
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