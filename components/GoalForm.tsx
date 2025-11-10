
import React, { useState } from 'react';
import { GoalType } from '../types';
import AudioRecorder from './AudioRecorder';
import { MicIcon, KeyboardIcon } from './Icons';

interface GoalFormProps {
  onSubmit: (description: string, type: GoalType, audioUrl?: string) => void;
  onCancel: () => void;
}

const GoalForm: React.FC<GoalFormProps> = ({ onSubmit, onCancel }) => {
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GoalType>('unique');
  const [inputMode, setInputMode] = useState<'text' | 'audio'>('text');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim() || audioUrl) {
      onSubmit(description.trim() || 'Meta de áudio', type, audioUrl || undefined);
      setDescription('');
      setAudioUrl('');
    }
  };

  const handleSendAudio = async (audioUrlBlob: string, audioBlob: Blob) => {
    try {
      setIsProcessingAudio(true);
      // Converter blob para base64 para poder salvar no Firestore
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        setAudioUrl(base64Audio);
        setIsProcessingAudio(false);
      };
      reader.onerror = () => {
        console.error('Erro ao converter áudio para base64');
        alert('Erro ao processar áudio. Tente novamente.');
        setIsProcessingAudio(false);
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      alert('Erro ao processar áudio. Tente novamente.');
      setIsProcessingAudio(false);
    }
  };

  const toggleInputMode = () => {
    setInputMode(prev => prev === 'text' ? 'audio' : 'text');
    // Limpar dados ao trocar de modo
    setDescription('');
    setAudioUrl('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-20 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md m-2 sm:m-4 my-4 sm:my-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Nova Meta</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle entre texto e áudio */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md font-medium transition-all ${
                inputMode === 'text'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <KeyboardIcon className="w-4 h-4" />
              <span className="text-sm">Texto</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('audio')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md font-medium transition-all ${
                inputMode === 'audio'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <MicIcon className="w-4 h-4" />
              <span className="text-sm">Áudio</span>
            </button>
          </div>

          {/* Campo de texto */}
          {inputMode === 'text' && (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Comprar mais ração"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white resize-none"
              rows={3}
              autoFocus
            />
          )}

          {/* Interface de áudio */}
          {inputMode === 'audio' && (
            <div className="space-y-3">
              {!audioUrl ? (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">
                    Grave um áudio para sua meta
                  </p>
                  <AudioRecorder onSendAudio={handleSendAudio} />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <p className="text-sm text-green-700 dark:text-green-400 mb-2">✓ Áudio gravado com sucesso!</p>
                    <audio controls src={audioUrl} className="w-full" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setAudioUrl('')}
                    className="w-full px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    Gravar novamente
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Meta:</p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <label className="flex items-center cursor-pointer">
                    <input type="radio" name="goalType" value="unique" checked={type === 'unique'} onChange={() => setType('unique')} className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                    <span className="ml-2 text-gray-800 dark:text-gray-200">Única (só hoje)</span>
                </label>
                 <label className="flex items-center cursor-pointer">
                    <input type="radio" name="goalType" value="fixed" checked={type === 'fixed'} onChange={() => setType('fixed')} className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                    <span className="ml-2 text-gray-800 dark:text-gray-200">Fixa (todos os dias)</span>
                </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={inputMode === 'text' ? !description.trim() : !audioUrl}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium"
            >
              Salvar Meta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalForm;
