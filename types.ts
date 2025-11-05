export type UserRole = 'Executor' | 'Supervisor';

export interface Task {
  id: string;
  description: string;
  timestamp: Date;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

export type ReminderStatus = 'pending' | 'done';

export interface Reminder {
  id: string;
  type: 'text' | 'audio';
  content: string; // Used for text content
  audioUrl?: string; // Used for audio blob URL
  timestamp: Date;
  status: ReminderStatus;
}

export interface GeminiMessage {
  role: 'user' | 'model';
  text: string;
}

export type GoalType = 'unique' | 'fixed';

export interface Goal {
  id: string;
  description: string;
  type: GoalType;
  createdAt: Date;
}

export interface GoalCompletion {
  goalId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}