import React, { useState, useRef } from 'react';
import { ImageIcon, CloseIcon } from './Icons';
import { Task } from '../types';

interface TaskFormProps {
  onSubmit: (description: string, mediaUrl?: string, mediaType?: Task['mediaType']) => void;
  onCancel: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, onCancel }) => {
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | undefined>();
  const [mediaType, setMediaType] = useState<Task['mediaType']>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileType = file.type.split('/')[0];
      if (fileType !== 'image' && fileType !== 'video') {
        alert('Por favor, selecione um arquivo de imagem ou vídeo.');
        e.target.value = ''; // Reset file input
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaUrl(reader.result as string);
        setMediaType(fileType as Task['mediaType']);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim() || mediaUrl) {
      onSubmit(description.trim(), mediaUrl, mediaType);
      setDescription('');
      setMediaUrl(undefined);
      setMediaType(undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Nova Tarefa</h3>
        <form onSubmit={handleSubmit}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Limpei a parte de cima (opcional se houver imagem)"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            rows={3}
            autoFocus
          />
          <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          
          {mediaUrl && (
            <div className="mt-4 relative w-32 h-32">
              {mediaType === 'video'
                ? <video src={mediaUrl} className="w-full h-full object-cover rounded-md" />
                : <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover rounded-md" />
              }
              <button
                type="button"
                onClick={() => { setMediaUrl(undefined); setMediaType(undefined); }}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700"
                aria-label="Remover Mídia"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="mt-6 flex justify-between items-center">
             <button
              type="button"
              onClick={triggerFileInput}
              className="px-4 py-2 flex items-center bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
            >
              <ImageIcon className="w-5 h-5 mr-2"/>
              {mediaUrl ? 'Trocar Mídia' : 'Adicionar Mídia'}
            </button>
            <div className="flex space-x-2">
                <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                >
                Cancelar
                </button>
                <button
                type="submit"
                disabled={!description.trim() && !mediaUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                >
                Salvar Tarefa
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;