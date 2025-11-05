import React from 'react';
import { Reminder, UserRole } from '../types';
import ReminderInput from './ReminderInput';
import { CheckCircleIcon, CircleIcon, TrashIcon } from './Icons';

interface ChatProps {
  userRole: UserRole;
  reminders: Reminder[];
  onSendReminder: (reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>) => void;
  onToggleReminderStatus: (reminderId: string) => void;
  onDeleteReminder: (reminderId: string) => void;
}

const Chat: React.FC<ChatProps> = ({ userRole, reminders, onSendReminder, onToggleReminderStatus, onDeleteReminder }) => {
  const sortedReminders = [...reminders].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow space-y-4">
        {sortedReminders.map(reminder => (
          <ReminderItem
            key={reminder.id}
            reminder={reminder}
            userRole={userRole}
            onToggleStatus={onToggleReminderStatus}
            onDeleteReminder={onDeleteReminder}
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
  onToggleStatus: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

const ReminderItem: React.FC<ReminderItemProps> = ({ reminder, userRole, onToggleStatus, onDeleteReminder }) => {
  const isDone = reminder.status === 'done';
  const canToggle = userRole === 'Executor';

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja apagar este lembrete?')) {
        onDeleteReminder(reminder.id);
    }
  };

  const content = reminder.type === 'text'
    ? <p className={`${isDone ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{reminder.content}</p>
    : reminder.audioUrl && <audio controls src={reminder.audioUrl} className="w-full max-w-xs" />;

  return (
    <div className="flex items-start space-x-3 group">
      {canToggle ? (
        <button onClick={() => onToggleStatus(reminder.id)} className="flex-shrink-0 mt-1">
          {isDone ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <CircleIcon className="w-6 h-6 text-gray-400" />}
        </button>
      ) : (
         <div className="flex-shrink-0 mt-1">
            {isDone ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <CircleIcon className="w-6 h-6 text-gray-400" />}
        </div>
      )}
      <div className="flex-grow bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm relative">
        {content}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-right">
          {reminder.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        {userRole === 'Supervisor' && (
            <button
                onClick={handleDelete}
                className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Apagar Lembrete"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        )}
      </div>
    </div>
  );
};

export default Chat;