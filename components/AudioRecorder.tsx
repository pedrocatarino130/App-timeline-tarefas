
import React, { useState, useRef } from 'react';
import { MicIcon, StopIcon, SendIcon } from './Icons';

interface AudioRecorderProps {
  onSendAudio: (audioUrl: string, audioBlob: Blob) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSendAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
        // Usar o mimeType do MediaRecorder ao invés de forçar webm
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleSend = () => {
    if (audioUrl && audioBlob) {
        onSendAudio(audioUrl, audioBlob);
        setAudioUrl(null);
        setAudioBlob(null);
    }
  }

  if (audioUrl) {
    return (
        <button onClick={handleSend} className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700">
            <SendIcon className="w-6 h-6" />
        </button>
    )
  }

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      className={`p-3 rounded-full text-white transition-colors ${
        isRecording ? 'bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      {isRecording ? <StopIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
    </button>
  );
};

export default AudioRecorder;
