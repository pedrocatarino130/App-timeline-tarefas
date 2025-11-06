import React, { useState, useRef, useEffect } from 'react';
import { MicIcon, SendIcon, TrashIcon } from './Icons';
import { useAudioPermission } from '../hooks/useAudioPermission';

interface AudioRecorderProps {
  onSendAudio: (audioUrl: string, audioBlob: Blob) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSendAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [slideOffset, setSlideOffset] = useState(0);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [cancelProgress, setCancelProgress] = useState(0); // Progresso do cancelamento (0-1)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);

  const { getAudioStream, hasPermission, error: permissionError } = useAudioPermission();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const startRecording = async () => {
    try {
      vibrate(50); // Feedback háptico ao iniciar
      const stream = await getAudioStream();

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

        setIsLocked(false);
        setSlideOffset(0);
        setVerticalOffset(0);
        setCancelProgress(0);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      setIsCancelled(false);
      setIsLocked(false);
      setSlideOffset(0);
      setVerticalOffset(0);
      setCancelProgress(0);

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
      if (!cancelled) {
        vibrate(50); // Feedback ao enviar
      }
      setIsCancelled(cancelled);
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startPositionRef.current = { x: e.clientX, y: e.clientY };
    startRecording();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isRecording || isLocked || !startPositionRef.current) return;

    const deltaX = e.clientX - startPositionRef.current.x;
    const deltaY = e.clientY - startPositionRef.current.y;

    setSlideOffset(Math.min(0, deltaX));
    setVerticalOffset(Math.min(0, deltaY));

    // Calcular progresso do cancelamento (0-1)
    const progress = Math.min(1, Math.abs(deltaX) / 120);
    setCancelProgress(progress);

    if (deltaY < -80) {
      vibrate([30, 20, 30]); // Feedback ao travar
      setIsLocked(true);
      setSlideOffset(0);
      setVerticalOffset(0);
      setCancelProgress(0);
    }

    if (deltaX < -120) {
      vibrate(100); // Feedback ao cancelar
      stopRecording(true);
      setSlideOffset(0);
      setVerticalOffset(0);
      setCancelProgress(0);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setSlideOffset(0);
    setVerticalOffset(0);
    setCancelProgress(0);
    stopRecording(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    startPositionRef.current = { x: touch.clientX, y: touch.clientY };
    startRecording();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isRecording || isLocked || !startPositionRef.current || e.touches.length === 0) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startPositionRef.current.x;
    const deltaY = touch.clientY - startPositionRef.current.y;

    setSlideOffset(Math.min(0, deltaX));
    setVerticalOffset(Math.min(0, deltaY));

    const progress = Math.min(1, Math.abs(deltaX) / 120);
    setCancelProgress(progress);

    if (deltaY < -80) {
      vibrate([30, 20, 30]);
      setIsLocked(true);
      setSlideOffset(0);
      setVerticalOffset(0);
      setCancelProgress(0);
    }

    if (deltaX < -120) {
      vibrate(100);
      stopRecording(true);
      setSlideOffset(0);
      setVerticalOffset(0);
      setCancelProgress(0);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setSlideOffset(0);
    setVerticalOffset(0);
    setCancelProgress(0);
    stopRecording(false);
  };

  const handleMouseLeave = () => {
    if (isRecording && !isLocked) {
      stopRecording(true);
      setSlideOffset(0);
      setVerticalOffset(0);
      setCancelProgress(0);
    }
  };

  const handleSendLocked = () => {
    if (isLocked) {
      stopRecording(false);
    }
  };

  const handleCancelLocked = () => {
    if (isLocked) {
      vibrate(50);
      stopRecording(true);
    }
  };

  // Componente de onda sonora animada
  const SoundWave = () => (
    <div className="flex items-center gap-1 h-8">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-red-500 rounded-full animate-sound-wave"
          style={{
            animationDelay: `${i * 0.05}s`,
            height: '100%',
            opacity: 0.7
          }}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* Overlay fullscreen durante gravação */}
      {isRecording && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-between py-8 px-4 animate-fade-in">

          {/* Cabeçalho com timer e ícone de gravação */}
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
              <span className="text-3xl font-light text-white tabular-nums">
                {formatTime(recordingTime)}
              </span>
            </div>

            {!isLocked ? (
              <div className="text-center space-y-1">
                <p className="text-gray-300 text-sm">
                  {cancelProgress > 0.5 ? '← Deslize para cancelar' : '↑ Arraste para cima para travar'}
                </p>
                <p className="text-gray-400 text-xs">
                  Solte para enviar
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-400 animate-fade-in">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Gravação travada</span>
              </div>
            )}
          </div>

          {/* Onda sonora no centro */}
          <div className="flex-1 flex items-center justify-center w-full max-w-md">
            <SoundWave />
          </div>

          {/* Controles na parte inferior */}
          <div className="w-full max-w-md">
            {!isLocked ? (
              <div className="flex items-center justify-center relative">
                {/* Indicador visual de cancelamento */}
                <div
                  className="absolute left-0 flex items-center gap-2 transition-opacity"
                  style={{ opacity: cancelProgress }}
                >
                  <div className="p-3 bg-red-500/20 rounded-full">
                    <TrashIcon className="w-6 h-6 text-red-400" />
                  </div>
                  <span className="text-red-400 text-sm font-medium">Cancelar</span>
                </div>

                {/* Botão de microfone (arrasto) */}
                <div
                  className="relative"
                  style={{
                    transform: `translateX(${slideOffset}px) translateY(${verticalOffset}px)`,
                  }}
                >
                  <button
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    className="p-6 bg-red-600 rounded-full shadow-2xl shadow-red-600/50 active:scale-95 transition-transform"
                    style={{
                      minWidth: '80px',
                      minHeight: '80px',
                      opacity: 1 - cancelProgress * 0.5
                    }}
                  >
                    <MicIcon className="w-8 h-8 text-white" />
                  </button>

                  {/* Seta indicando arrasto para cima */}
                  {Math.abs(verticalOffset) < 40 && cancelProgress < 0.3 && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-bounce">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-6 animate-fade-in">
                {/* Botão de cancelar (lixeira) */}
                <button
                  onClick={handleCancelLocked}
                  className="p-5 bg-red-500/20 hover:bg-red-500/30 rounded-full transition-all active:scale-90"
                  style={{ minWidth: '70px', minHeight: '70px' }}
                >
                  <TrashIcon className="w-7 h-7 text-red-400" />
                </button>

                {/* Botão de enviar */}
                <button
                  onClick={handleSendLocked}
                  className="p-6 bg-green-600 hover:bg-green-700 rounded-full shadow-2xl shadow-green-600/50 transition-all active:scale-90"
                  style={{ minWidth: '80px', minHeight: '80px' }}
                >
                  <SendIcon className="w-8 h-8 text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão de microfone normal (quando não está gravando) */}
      {!isRecording && (
        <div className="relative flex items-center gap-2">
          <button
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-all active:scale-90 shadow-lg"
            title={hasPermission ? "Segure para gravar áudio" : "Segure para gravar áudio"}
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <MicIcon className="w-6 h-6" />
          </button>

          {hasPermission && (
            <div
              className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 shadow-lg"
              title="Microfone pronto"
            />
          )}

          {hasPermission && (
            <span className="text-xs text-green-600 dark:text-green-400 hidden sm:inline font-medium">
              Pronto
            </span>
          )}

          {permissionError && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {permissionError}
            </span>
          )}
        </div>
      )}
    </>
  );
};

export default AudioRecorder;
