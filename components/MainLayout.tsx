import React, { useState } from 'react';
import { UserRole, Task, Reminder, Goal, GoalType, GoalCompletion } from '../types';
import Header from './Header';
import Timeline from './Timeline';
import Chat from './Chat';
import { TimelineIcon, ChatIcon } from './Icons';

interface MainLayoutProps {
  userRole: UserRole;
  tasks: Task[];
  reminders: Reminder[];
  goals: Goal[];
  goalCompletions: GoalCompletion[];
  onAddTask: (description: string, mediaUrl?: string, mediaType?: 'image' | 'video') => void;
  onDeleteTask: (taskId: string) => void;
  onSendReminder: (reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>) => void;
  onDeleteReminder: (reminderId: string) => void;
  onToggleReminderStatus: (reminderId: string) => void;
  onAddGoal: (description: string, type: GoalType) => void;
  onToggleGoalCompletion: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
  onReplyWithTask: (reminderId: string, taskDescription: string) => void;
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'Timeline' | 'Chat'>('Timeline');

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-screen">
      <Header userRole={props.userRole} onLogout={props.onLogout} />
      <main className="flex-grow overflow-y-auto p-4 md:p-6 pb-32 sm:pb-28">
        {activeTab === 'Timeline' ? (
          <Timeline
            userRole={props.userRole}
            tasks={props.tasks}
            onAddTask={props.onAddTask}
            onDeleteTask={props.onDeleteTask}
            goals={props.goals}
            goalCompletions={props.goalCompletions}
            onAddGoal={props.onAddGoal}
            onToggleGoalCompletion={props.onToggleGoalCompletion}
            onDeleteGoal={props.onDeleteGoal}
            onSendReminder={props.onSendReminder}
          />
        ) : (
          <Chat
            userRole={props.userRole}
            reminders={props.reminders}
            tasks={props.tasks}
            onSendReminder={props.onSendReminder}
            onToggleReminderStatus={props.onToggleReminderStatus}
            onDeleteReminder={props.onDeleteReminder}
            onAddTask={props.onAddTask}
            onReplyWithTask={props.onReplyWithTask}
          />
        )}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 max-w-4xl mx-auto bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg safe-area-bottom">
        <div className="flex justify-around">
          <TabButton
            label="Timeline"
            icon={<TimelineIcon />}
            isActive={activeTab === 'Timeline'}
            onClick={() => setActiveTab('Timeline')}
          />
          <TabButton
            label="Chat"
            icon={<ChatIcon />}
            isActive={activeTab === 'Chat'}
            onClick={() => setActiveTab('Chat')}
          />
        </div>
      </nav>
    </div>
  );
};

interface TabButtonProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon, isActive, onClick }) => {
  const activeClasses = 'text-blue-600 dark:text-blue-400 border-t-2 border-blue-600 dark:border-blue-400';
  const inactiveClasses = 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700';

  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-3 px-2 sm:p-4 transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
    >
      <div className="w-6 h-6 sm:w-7 sm:h-7">{icon}</div>
      <span className="text-xs sm:text-sm font-medium mt-1">{label}</span>
    </button>
  );
};

export default MainLayout;