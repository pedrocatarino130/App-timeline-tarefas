import { useState, useCallback } from 'react';

interface AudioPermissionState {
  hasPermission: boolean;
  isRequesting: boolean;
  error: string | null;
  stream: MediaStream | null;
}

/**
 * Hook para gerenciar permissões de áudio sob demanda.
 * Solicita permissão apenas quando necessário e não mantém stream ativo,
 * economizando bateria.
 */
export const useAudioPermission = () => {
  const [state, setState] = useState<AudioPermissionState>({
    hasPermission: false,
    isRequesting: false,
    error: null,
    stream: null
  });

  /**
   * Solicita permissão e cria um novo stream de áudio.
   * Este stream deve ser parado manualmente após o uso para economizar bateria.
   */
  const getAudioStream = useCallback(async (): Promise<MediaStream> => {
    setState(prev => ({ ...prev, isRequesting: true, error: null }));

    try {
      // Sempre criar um novo stream para garantir que não mantemos microfone ativo
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setState({
        hasPermission: true,
        isRequesting: false,
        error: null,
        stream
      });

      return stream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';

      setState({
        hasPermission: false,
        isRequesting: false,
        error: `Não foi possível acessar o microfone: ${errorMessage}`,
        stream: null
      });

      console.error('Erro ao solicitar permissão de áudio:', err);
      throw err;
    }
  }, []);

  /**
   * Para todas as tracks de um stream de áudio.
   * IMPORTANTE: Sempre chamar após terminar de usar o stream para economizar bateria.
   */
  const stopAudioStream = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('[AUDIO] Track parada:', track.label);
      });
    }

    setState(prev => ({
      ...prev,
      stream: null
    }));
  }, []);

  return {
    hasPermission: state.hasPermission,
    isRequesting: state.isRequesting,
    error: state.error,
    stream: state.stream,
    getAudioStream,
    stopAudioStream
  };
};
