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
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxSizeKB: number = 500): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Redimensionar se a imagem for muito grande
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = height * (MAX_WIDTH / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = width * (MAX_HEIGHT / height);
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Tentar diferentes qualidades até ficar abaixo do limite
          let quality = 0.9;
          let result = canvas.toDataURL('image/jpeg', quality);
          
          // Calcular tamanho em KB (base64 tem ~37% de overhead)
          const sizeKB = (result.length * 3) / 4 / 1024;
          
          if (sizeKB > maxSizeKB) {
            // Reduzir qualidade progressivamente
            for (let q = 0.8; q >= 0.3; q -= 0.1) {
              result = canvas.toDataURL('image/jpeg', q);
              const newSizeKB = (result.length * 3) / 4 / 1024;
              if (newSizeKB <= maxSizeKB) {
                console.log(`[COMPRESS] Imagem comprimida: ${sizeKB.toFixed(0)}KB → ${newSizeKB.toFixed(0)}KB (qualidade: ${q.toFixed(1)})`);
                break;
              }
            }
          } else {
            console.log(`[COMPRESS] Imagem OK: ${sizeKB.toFixed(0)}KB`);
          }
          
          resolve(result);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileType = file.type.split('/')[0];
      if (fileType !== 'image' && fileType !== 'video') {
        alert('Por favor, selecione um arquivo de imagem ou vídeo.');
        e.target.value = ''; // Reset file input
        return;
      }

      setIsProcessing(true);

      try {
        // Para vídeos, avisar sobre limitações
        if (fileType === 'video') {
          const fileSizeKB = file.size / 1024;
          if (fileSizeKB > 800) {
            alert('⚠️ Vídeo muito grande! Pode não ser salvo. Tente um vídeo menor (máx 800KB).');
            e.target.value = '';
            setIsProcessing(false);
            return;
          }
          
          const reader = new FileReader();
          reader.onloadend = () => {
            setMediaUrl(reader.result as string);
            setMediaType('video');
            setIsProcessing(false);
          };
          reader.readAsDataURL(file);
        } else {
          // Para imagens, comprimir automaticamente
          try {
            const compressedImage = await compressImage(file, 500);
            setMediaUrl(compressedImage);
            setMediaType('image');
            setIsProcessing(false);
          } catch (error) {
            console.error('Erro ao processar imagem:', error);
            alert('Erro ao processar imagem. Tente outra.');
            e.target.value = '';
            setIsProcessing(false);
          }
        }
      } catch (error) {
        console.error('Erro inesperado:', error);
        setIsProcessing(false);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim() || mediaUrl) {
      console.log('[TASKFORM] Enviando tarefa:', {
        description: description.trim(),
        hasMedia: !!mediaUrl,
        mediaType,
        mediaSizeKB: mediaUrl ? ((mediaUrl.length * 3) / 4 / 1024).toFixed(0) : 0
      });
      onSubmit(description.trim(), mediaUrl, mediaType);
      setDescription('');
      setMediaUrl(undefined);
      setMediaType(undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-20 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md m-2 sm:m-4 my-4 sm:my-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Nova Tarefa</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Limpei a parte de cima (opcional se houver imagem)"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white text-gray-900 bg-white resize-none"
            rows={3}
            autoFocus
          />
          <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          
          {mediaUrl && (
            <div className="relative w-32 h-32">
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

          {/* Indicador de processamento */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-sm font-medium">Processando imagem...</span>
            </div>
          )}

          {/* Botões reorganizados para melhor responsividade no mobile */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
             <button
              type="button"
              onClick={triggerFileInput}
              disabled={isProcessing}
              className="w-full sm:w-auto px-4 py-2.5 flex items-center justify-center bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImageIcon className="w-5 h-5 mr-2"/>
              {mediaUrl ? 'Trocar Mídia' : 'Adicionar Mídia'}
            </button>
            
            <div className="flex gap-2">
                <button
                type="button"
                onClick={onCancel}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 font-medium"
                >
                Cancelar
                </button>
                <button
                type="submit"
                disabled={!description.trim() && !mediaUrl}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium"
                >
                Salvar
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;