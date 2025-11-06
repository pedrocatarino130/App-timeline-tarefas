import React, { useState, useRef, useEffect } from 'react';

interface WhatsAppAudioRecorderProps {
  onSendAudio: (audioBlob: Blob, audioUrl: string) => void;
  className?: string;
}

export default function WhatsAppAudioRecorder({ onSendAudio, className = '' }: WhatsAppAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCanceling, setIsCanceling] = useState(false);
  const [startY, setStartY] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Limpar recursos ao desmontar
  useEffect(() => {
    return () => {
      stopRecording(true);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Timer de gravação
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const getSupportedMimeType = (): string => {
    const types = [
      'audio/mp4',
      'audio/aac',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mpeg',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('Using MIME type:', type);
        return type;
      }
    }

    return '';
  };

  const startRecording = async () => {
    try {
      // Resetar estado
      audioChunksRef.current = [];
      setIsCanceling(false);
      setRecordingTime(0);

      // Solicitar acesso ao microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Parar todas as tracks do stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Se não foi cancelado, enviar o áudio
        if (!isCanceling && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType || 'audio/webm'
          });
          const audioUrl = URL.createObjectURL(audioBlob);
          onSendAudio(audioBlob, audioUrl);
        }

        // Resetar
        audioChunksRef.current = [];
        setIsRecording(false);
        setIsCanceling(false);
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (err) {
      console.error('Erro ao acessar o microfone:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
      setIsRecording(false);
    }
  };

  const stopRecording = (cancel: boolean = false) => {
    if (cancel) {
      setIsCanceling(true);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Handlers para touch events (iPhone)
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setStartY(touch.clientY);
    startRecording();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isRecording || startY === null) return;

    const touch = e.touches[0];
    const deltaY = startY - touch.clientY;

    // Se arrastar para cima mais de 100px, indica cancelamento
    if (deltaY > 100) {
      setIsCanceling(true);
    } else {
      setIsCanceling(false);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();

    if (isRecording) {
      stopRecording(isCanceling);
    }

    setStartY(null);
  };

  // Handlers para mouse events (fallback para desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startRecording();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording(false);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (isRecording) {
      stopRecording(true);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isRecording && (
        <div className="flex items-center gap-2 animate-fade-in">
          <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-600">
              {formatTime(recordingTime)}
            </span>
          </div>
          {isCanceling && (
            <span className="text-xs text-gray-500 animate-fade-in">
              ← Solte para cancelar
            </span>
          )}
          {!isCanceling && (
            <span className="text-xs text-gray-500 animate-fade-in">
              ↑ Arraste para cancelar
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`
          p-3 rounded-full transition-all duration-200 select-none
          ${isRecording
            ? isCanceling
              ? 'bg-gray-400 scale-110'
              : 'bg-red-500 scale-110 animate-pulse'
            : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
          }
          text-white shadow-lg
        `}
        aria-label={isRecording ? "Gravando áudio" : "Pressione e segure para gravar"}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </button>

      {!isRecording && (
        <span className="text-xs text-gray-400">
          Segure para gravar
        </span>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
