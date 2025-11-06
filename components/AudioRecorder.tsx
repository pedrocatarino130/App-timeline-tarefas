import React, { useState, useRef, useEffect } from 'react';
import { MicIcon } from './Icons';

interface AudioRecorderProps {
  onSendAudio: (audioUrl: string, audioBlob: Blob) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSendAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isLocked, setIsLocked] = useState(false); // Para travar gravação
  const [slideOffset, setSlideOffset] = useState(0); // Para feedback visual do deslize
  const [verticalOffset, setVerticalOffset] = useState(0); // Para feedback visual do arrasto vertical

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Limpar timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determinar o melhor tipo MIME suportado
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac';
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        mimeType = 'audio/mpeg';
      }

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        if (!isCancelled && audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || mimeType
          });
          const url = URL.createObjectURL(blob);
          onSendAudio(url, blob);
        }

        // Limpar stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Resetar estados
        setIsLocked(false);
        setSlideOffset(0);
        setVerticalOffset(0);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      setIsCancelled(false);
      setIsLocked(false);
      setSlideOffset(0);
      setVerticalOffset(0);

      // Iniciar timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecording = (cancelled: boolean = false) => {
    if (mediaRecorderRef.current && isRecording) {
      setIsCancelled(cancelled);
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Handler para quando o usuário pressiona o botão (mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startPositionRef.current = { x: e.clientX, y: e.clientY };
    startRecording();
  };

  // Handler para movimento do mouse durante gravação
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isRecording || isLocked || !startPositionRef.current) return;

    const deltaX = e.clientX - startPositionRef.current.x;
    const deltaY = e.clientY - startPositionRef.current.y;

    // Atualizar offsets para feedback visual
    setSlideOffset(Math.min(0, deltaX)); // Apenas movimento para esquerda (negativo)
    setVerticalOffset(Math.min(0, deltaY)); // Apenas movimento para cima (negativo)

    // Travar gravação se arrastar para cima mais de 80px
    if (deltaY < -80) {
      setIsLocked(true);
      setSlideOffset(0);
      setVerticalOffset(0);
    }

    // Cancelar se deslizar para esquerda mais de 120px
    if (deltaX < -120) {
      stopRecording(true);
      setSlideOffset(0);
      setVerticalOffset(0);
    }
  };

  // Handler para quando o usuário solta o botão (mouse)
  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();

    // Se está travado, não fazer nada (usuário precisa clicar no botão de enviar)
    if (isLocked) {
      return;
    }

    // Resetar offsets
    setSlideOffset(0);
    setVerticalOffset(0);

    stopRecording(false);
  };

  // Handler para touch events (mobile/iOS)
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    startPositionRef.current = { x: touch.clientX, y: touch.clientY };
    startRecording();
  };

  // Handler para movimento do touch durante gravação
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isRecording || isLocked || !startPositionRef.current || e.touches.length === 0) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startPositionRef.current.x;
    const deltaY = touch.clientY - startPositionRef.current.y;

    // Atualizar offsets para feedback visual
    setSlideOffset(Math.min(0, deltaX)); // Apenas movimento para esquerda (negativo)
    setVerticalOffset(Math.min(0, deltaY)); // Apenas movimento para cima (negativo)

    // Travar gravação se arrastar para cima mais de 80px
    if (deltaY < -80) {
      setIsLocked(true);
      setSlideOffset(0);
      setVerticalOffset(0);
    }

    // Cancelar se deslizar para esquerda mais de 120px
    if (deltaX < -120) {
      stopRecording(true);
      setSlideOffset(0);
      setVerticalOffset(0);
    }
  };

  // Handler para quando o usuário solta o touch
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();

    // Se está travado, não fazer nada
    if (isLocked) {
      return;
    }

    // Resetar offsets
    setSlideOffset(0);
    setVerticalOffset(0);

    stopRecording(false);
  };

  // Prevenir leave quando estiver gravando (apenas se não estiver travado)
  const handleMouseLeave = () => {
    if (isRecording && !isLocked) {
      stopRecording(true); // Cancelar se sair do botão e não estiver travado
      setSlideOffset(0);
      setVerticalOffset(0);
    }
  };

  // Função para enviar quando está no modo travado
  const handleSendLocked = () => {
    if (isLocked) {
      stopRecording(false);
    }
  };

  // Função para cancelar quando está no modo travado
  const handleCancelLocked = () => {
    if (isLocked) {
      stopRecording(true);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isRecording && !isLocked && (
        <div
          className="flex items-center gap-2 animate-fade-in transition-all"
          style={{
            transform: `translateX(${slideOffset}px) translateY(${verticalOffset}px)`,
            opacity: slideOffset < -60 ? 0.5 : 1
          }}
        >
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-600">
              {formatTime(recordingTime)}
            </span>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs text-gray-500">
              {slideOffset < -60 ? '↩ Solte para cancelar' : '⬆ Deslize para travar'}
            </span>
            <span className="text-xs text-gray-400">
              {slideOffset < -60 ? '' : 'Solte para enviar'}
            </span>
          </div>
        </div>
      )}

      {isRecording && isLocked && (
        <div className="flex items-center gap-2 animate-fade-in">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-600">
              {formatTime(recordingTime)}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            🔒 Gravação travada
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleCancelLocked}
              className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-400 active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSendLocked}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded-full hover:bg-green-700 active:scale-95 transition-all"
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        className={`p-3 rounded-full text-white transition-all select-none ${
          isRecording
            ? 'bg-red-600 scale-110 shadow-lg'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
        }`}
        title="Segure para gravar áudio"
        style={{
          transform: isRecording && !isLocked ? `translateX(${slideOffset}px) translateY(${verticalOffset}px)` : undefined
        }}
      >
        <MicIcon className="w-6 h-6" />
      </button>

      {!isRecording && (
        <span className="text-xs text-gray-500 hidden sm:inline">
          Segure para gravar
        </span>
      )}
    </div>
  );
};

export default AudioRecorder;
