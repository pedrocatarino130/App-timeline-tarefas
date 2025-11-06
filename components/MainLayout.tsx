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
      <main className="flex-grow overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 pb-24 sm:pb-24 md:pb-28 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
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
      <nav className="fixed bottom-0 left-0 right-0 max-w-4xl mx-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-lg safe-area-bottom z-50">
        <div className="flex justify-around items-stretch h-16 sm:h-18">
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
  const activeClasses = 'text-blue-600 dark:text-blue-400 border-t-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20';
  const inactiveClasses = 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-t-2 border-transparent';

  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-2 px-2 sm:py-3 sm:px-3 transition-all duration-200 active:scale-95 ${isActive ? activeClasses : inactiveClasses}`}
    >
      <div className="w-7 h-7 sm:w-8 sm:h-8 mb-0.5">{icon}</div>
      <span className="text-[10px] sm:text-xs font-semibold tracking-wide">{label}</span>
    </button>
  );
};

export default MainLayout;