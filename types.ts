export type UserRole = 'Executor' | 'Supervisor';

export interface Task {
  id: string;
  description: string;
  timestamp: Date;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  author?: UserRole; // Quem criou a tarefa (Pedro ou Sato)
  _updatedAt?: number; // 🔥 Timestamp da última modificação DESTE item (para merge LWW)
}

export type ReminderStatus = 'pending' | 'done';

export interface Reminder {
  id: string;
  type: 'text' | 'audio';
  content: string; // Used for text content
  audioUrl?: string; // Used for audio blob URL
  timestamp: Date;
  status: ReminderStatus;
  linkedTaskId?: string; // Optional link to a timeline task
  author?: UserRole; // Quem criou o lembrete/comentário (Pedro ou Sato)
  _updatedAt?: number; // 🔥 Timestamp da última modificação DESTE item (para merge LWW)
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
  audioUrl?: string; // URL do áudio em base64 (opcional)
  author?: UserRole; // Quem criou a meta (Pedro ou Sato)
  _updatedAt?: number; // 🔥 Timestamp da última modificação DESTE item (para merge LWW)
}

export interface GoalCompletion {
  goalId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  _updatedAt?: number; // 🔥 Timestamp da última modificação DESTE item (para merge LWW)
}

export interface Comment {
  id: string;
  taskId: string; // Task that this comment belongs to
  author: UserRole;
  type: 'text' | 'audio';
  content: string; // Text content or audio description
  audioUrl?: string; // URL for audio blob
  timestamp: Date;
}