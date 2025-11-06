import React, { useState } from 'react';
import { Reminder, UserRole, Task } from '../types';
import ReminderInput from './ReminderInput';
import { CheckCircleIcon, CircleIcon, TrashIcon, ReplyIcon } from './Icons';

interface ChatProps {
  userRole: UserRole;
  reminders: Reminder[];
  tasks: Task[];
  onSendReminder: (reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>) => void;
  onToggleReminderStatus: (reminderId: string) => void;
  onDeleteReminder: (reminderId: string) => void;
  onAddTask: (description: string, mediaUrl?: string, mediaType?: 'image' | 'video') => void;
  onReplyWithTask: (reminderId: string, taskDescription: string) => void;
}

const Chat: React.FC<ChatProps> = ({ userRole, reminders, tasks, onSendReminder, onToggleReminderStatus, onDeleteReminder, onAddTask, onReplyWithTask }) => {
  const sortedReminders = [...reminders].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow space-y-3 sm:space-y-4">
        {sortedReminders.map(reminder => (
          <ReminderItem
            key={reminder.id}
            reminder={reminder}
            userRole={userRole}
            tasks={tasks}
            onToggleStatus={onToggleReminderStatus}
            onDeleteReminder={onDeleteReminder}
            onAddTask={onAddTask}
            onReplyWithTask={onReplyWithTask}
          />
        ))}
      </div>
      {userRole === 'Supervisor' && <ReminderInput onSend={onSendReminder} />}
    </div>
  );
};

interface ReminderItemProps {
  reminder: Reminder;
  userRole: UserRole;
  tasks: Task[];
  onToggleStatus: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onAddTask: (description: string, mediaUrl?: string, mediaType?: 'image' | 'video') => void;
  onReplyWithTask: (reminderId: string, taskDescription: string) => void;
}

const ReminderItem: React.FC<ReminderItemProps> = ({ reminder, userRole, tasks, onToggleStatus, onDeleteReminder, onAddTask, onReplyWithTask }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const isDone = reminder.status === 'done';
  const canToggle = userRole === 'Executor';
  const linkedTask = reminder.linkedTaskId ? tasks.find(t => t.id === reminder.linkedTaskId) : null;

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja apagar este lembrete?')) {
        onDeleteReminder(reminder.id);
    }
  };

  const handleReply = () => {
    if (replyText.trim()) {
      // Create a new task with the reply and link it to this reminder
      onReplyWithTask(reminder.id, replyText.trim());
      setReplyText('');
      setShowReplyForm(false);
    }
  };

  const content = reminder.type === 'text'
    ? <p className={`text-sm sm:text-base leading-snug ${isDone ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{reminder.content}</p>
    : reminder.audioUrl && <audio controls src={reminder.audioUrl} className="w-full max-w-full sm:max-w-xs" />;

  return (
    <div className="flex items-start gap-2 sm:gap-3 group">
      {canToggle ? (
        <button onClick={() => onToggleStatus(reminder.id)} className="flex-shrink-0 mt-1 active:scale-90 transition-transform">
          {isDone ? <CheckCircleIcon className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" /> : <CircleIcon className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" />}
        </button>
      ) : (
         <div className="flex-shrink-0 mt-1">
            {isDone ? <CheckCircleIcon className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" /> : <CircleIcon className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" />}
        </div>
      )}
      <div className="flex-grow bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow-md relative">
        {content}

        {linkedTask && (
          <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg">
            <p className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Anexo da Timeline:</p>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-snug">{linkedTask.description}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
              {linkedTask.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        {showReplyForm && userRole === 'Executor' && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Descreva o que foi feito..."
              className="w-full p-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button
                onClick={handleReply}
                className="flex-1 px-3 py-2.5 text-xs sm:text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all"
              >
                Adicionar à Timeline
              </button>
              <button
                onClick={() => setShowReplyForm(false)}
                className="px-3 py-2.5 text-xs sm:text-sm font-semibold bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-2 sm:mt-3">
          <p className="text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500">
            {reminder.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {userRole === 'Executor' && !showReplyForm && (
            <button
              onClick={() => setShowReplyForm(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all active:scale-95"
            >
              <ReplyIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Responder</span>
              <span className="sm:hidden">↩</span>
            </button>
          )}
        </div>

        {userRole === 'Supervisor' && (
            <button
                onClick={handleDelete}
                className="absolute -top-1 -right-1 p-2 sm:p-2.5 text-white bg-red-500 hover:bg-red-600 rounded-full shadow-md opacity-80 group-hover:opacity-100 transition-all active:scale-90 z-10"
                aria-label="Apagar Lembrete"
                style={{ minWidth: '36px', minHeight: '36px' }} // Área mínima de toque para iOS
            >
                <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
        )}
      </div>
    </div>
  );
};

export default Chat;