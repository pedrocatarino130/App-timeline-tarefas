
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

  const handleSendAudio = async (audioUrl: string, audioBlob: Blob) => {
    try {
      // Converter blob para base64 para poder salvar no Firestore e compartilhar entre dispositivos
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        onSend({ type: 'audio', content: 'Mensagem de áudio', audioUrl: base64Audio });
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

  return (
    <div className="fixed bottom-16 left-0 right-0 max-w-4xl mx-auto bg-gray-100 dark:bg-gray-900 p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 safe-area-padding-bottom">
      <div className="flex items-center gap-2 sm:gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
          placeholder="Enviar um lembrete..."
          className="flex-grow p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white text-base"
        />
        {/* Manter ambos os botões sempre renderizados para evitar mudança de posição */}
        <div className="relative flex-shrink-0">
          {/* Botão de enviar texto - sobrepõe o áudio quando há texto */}
          <button
            onClick={handleSendText}
            className={`p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-opacity touch-manipulation ${
              text ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none absolute inset-0'
            }`}
          >
            <SendIcon className="w-6 h-6" />
          </button>
          {/* AudioRecorder - visível quando não há texto */}
          <div className={text ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}>
            <AudioRecorder onSendAudio={handleSendAudio} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderInput;
