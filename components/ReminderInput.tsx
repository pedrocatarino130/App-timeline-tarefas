
import React, { useState } from 'react';
import { Reminder } from '../types';
import AudioRecorder from './AudioRecorder';
import { SendIcon } from './Icons';

interface ReminderInputProps {
  onSend: (reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>) => void;
}

const ReminderInput: React.FC<ReminderInputProps> = ({ onSend }) => {
  const [text, setText] = useState('');

  const handleSendText = () => {
    if (text.trim()) {
      onSend({ type: 'text', content: text.trim() });
      setText('');
    }
  };

  const handleSendAudio = (audioUrl: string, audioBlob: Blob) => {
     onSend({ type: 'audio', content: 'Mensagem de áudio', audioUrl });
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 max-w-4xl mx-auto bg-gray-100 dark:bg-gray-900 p-2 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
          placeholder="Enviar um lembrete..."
          className="flex-grow p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
        />
        {text ? (
             <button onClick={handleSendText} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                <SendIcon className="w-6 h-6" />
            </button>
        ) : (
            <AudioRecorder onSendAudio={handleSendAudio} />
        )}
      </div>
    </div>
  );
};

export default ReminderInput;
