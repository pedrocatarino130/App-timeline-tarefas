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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { getAudioStream, hasPermission, error: permissionError } = useAudioPermission();
  
  // Limite máximo de gravação em segundos (60s = ~200-400KB em base64)
  const MAX_RECORDING_TIME = 60;

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

  const startRecording = async () => {
    try {
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
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      setIsCancelled(false);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-parar quando atingir o limite máximo
          if (newTime >= MAX_RECORDING_TIME) {
            console.log('[AUDIO] Tempo máximo de gravação atingido, parando automaticamente');
            stopRecording(false);
          }
          return newTime;
        });
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

  const handleStartRecording = () => {
    startRecording();
  };

  const handleSendAudio = () => {
    stopRecording(false);
  };

  const handleCancelAudio = () => {
    stopRecording(true);
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
      {/* Interface durante gravação */}
      {isRecording && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center gap-8 px-4">
          {/* Timer e indicador de gravação */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
              <span className={`text-4xl font-light tabular-nums ${recordingTime >= 50 ? 'text-yellow-400 animate-pulse' : 'text-white'}`}>
                {formatTime(recordingTime)}
              </span>
            </div>
            <p className="text-gray-300 text-sm">
              {recordingTime >= 50 
                ? `⚠️ Parando em ${MAX_RECORDING_TIME - recordingTime}s...` 
                : 'Gravando áudio...'}
            </p>
          </div>

          {/* Onda sonora */}
          <div className="w-full max-w-md">
            <SoundWave />
          </div>

          {/* Botões de controle */}
          <div className="flex items-center justify-center gap-6 sm:gap-8">
            {/* Botão de cancelar */}
            <button
              onClick={handleCancelAudio}
              className="p-4 sm:p-5 bg-red-500/20 hover:bg-red-500/30 rounded-full transition-all active:scale-90 touch-manipulation"
              title="Cancelar gravação"
            >
              <TrashIcon className="w-7 h-7 sm:w-8 sm:h-8 text-red-400" />
            </button>

            {/* Botão de enviar */}
            <button
              onClick={handleSendAudio}
              className="p-5 sm:p-6 bg-green-600 hover:bg-green-700 rounded-full shadow-2xl shadow-green-600/50 transition-all active:scale-90 touch-manipulation"
              title="Enviar áudio"
            >
              <SendIcon className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Botão de microfone (quando não está gravando) */}
      {!isRecording && (
        <div className="relative flex items-center gap-2">
          <button
            onClick={handleStartRecording}
            className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-all active:scale-90 shadow-lg"
            title="Clique para gravar áudio"
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
