import React, { useState, useRef, useEffect } from 'react';
import { MicIcon } from './Icons';

interface AudioRecorderProps {
  onSendAudio: (audioUrl: string, audioBlob: Blob) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSendAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);

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
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      setIsCancelled(false);

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

  // Handler para quando o usuário solta o botão (mouse)
  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();

    // Verificar se o usuário arrastou muito longe (cancelar)
    if (startPositionRef.current) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - startPositionRef.current.x, 2) +
        Math.pow(e.clientY - startPositionRef.current.y, 2)
      );

      // Se arrastou mais de 100px, cancelar
      if (distance > 100) {
        stopRecording(true);
        return;
      }
    }

    stopRecording(false);
  };

  // Handler para touch events (mobile/iOS)
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    startPositionRef.current = { x: touch.clientX, y: touch.clientY };
    startRecording();
  };

  // Handler para quando o usuário solta o touch
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();

    // Verificar se o usuário arrastou muito longe (cancelar)
    if (e.changedTouches.length > 0 && startPositionRef.current) {
      const touch = e.changedTouches[0];
      const distance = Math.sqrt(
        Math.pow(touch.clientX - startPositionRef.current.x, 2) +
        Math.pow(touch.clientY - startPositionRef.current.y, 2)
      );

      // Se arrastou mais de 100px, cancelar
      if (distance > 100) {
        stopRecording(true);
        return;
      }
    }

    stopRecording(false);
  };

  // Prevenir leave quando estiver gravando
  const handleMouseLeave = () => {
    if (isRecording) {
      stopRecording(true); // Cancelar se sair do botão
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isRecording && (
        <div className="flex items-center gap-2 animate-fade-in">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-600">
              {formatTime(recordingTime)}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Solte para enviar
          </span>
        </div>
      )}

      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`p-3 rounded-full text-white transition-all select-none ${
          isRecording
            ? 'bg-red-600 scale-110 shadow-lg'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
        }`}
        title="Segure para gravar áudio"
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
