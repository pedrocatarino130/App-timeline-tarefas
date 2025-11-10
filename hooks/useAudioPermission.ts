import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioPermissionState {
  hasPermission: boolean;
  isRequesting: boolean;
  error: string | null;
  stream: MediaStream | null;
}

const PERMISSION_STORAGE_KEY = 'audio_permission_granted';

/**
 * Hook para gerenciar permissões de áudio de forma persistente.
 * Solicita permissão apenas uma vez e mantém o stream ativo,
 * evitando que o navegador (especialmente iOS Safari) peça
 * permissão repetidamente.
 */
export const useAudioPermission = () => {
  const [state, setState] = useState<AudioPermissionState>({
    hasPermission: false,
    isRequesting: false,
    error: null,
    stream: null
  });

  const streamRef = useRef<MediaStream | null>(null);
  const permissionRequestedRef = useRef(false);
  const isRequestingRef = useRef(false);

  // Limpar stream ao desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const requestPermission = useCallback(async () => {
    // Se já está solicitando ou já tem permissão, não fazer nada
    if (isRequestingRef.current || (state.hasPermission && streamRef.current && streamRef.current.active)) {
      return streamRef.current;
    }

    isRequestingRef.current = true;
    setState(prev => ({ ...prev, isRequesting: true, error: null }));

    try {
      // Solicitar acesso ao microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      // Salvar que obtivemos permissão com sucesso
      localStorage.setItem(PERMISSION_STORAGE_KEY, 'true');

      setState({
        hasPermission: true,
        isRequesting: false,
        error: null,
        stream
      });

      isRequestingRef.current = false;
      return stream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';

      // Limpar permissão salva se houve erro
      localStorage.removeItem(PERMISSION_STORAGE_KEY);

      setState({
        hasPermission: false,
        isRequesting: false,
        error: `Não foi possível acessar o microfone: ${errorMessage}`,
        stream: null
      });

      isRequestingRef.current = false;
      console.error('Erro ao solicitar permissão de áudio:', err);
      throw err;
    }
  }, [state.hasPermission]);

  // Verificar se já temos permissão salva - executar apenas uma vez
  useEffect(() => {
    const savedPermission = localStorage.getItem(PERMISSION_STORAGE_KEY);

    // Se já temos permissão salva, tentar obter o stream automaticamente
    if (savedPermission === 'true' && !permissionRequestedRef.current) {
      permissionRequestedRef.current = true;
      requestPermission().catch(err => {
        console.error('Erro ao solicitar permissão automática:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez na montagem

  /**
   * Obtém um clone do stream de áudio.
   * Útil para criar múltiplas gravações sem solicitar permissão novamente.
   */
  const getAudioStream = useCallback(async (): Promise<MediaStream> => {
    // Se já temos um stream, retornar ele
    if (streamRef.current && streamRef.current.active) {
      return streamRef.current;
    }

    // Caso contrário, solicitar permissão
    const stream = await requestPermission();
    if (!stream) {
      throw new Error('Não foi possível obter stream de áudio');
    }
    return stream;
  }, [requestPermission]);

  /**
   * Limpa a permissão salva e para o stream.
   * Útil se o usuário quiser revogar a permissão manualmente.
   */
  const revokePermission = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    localStorage.removeItem(PERMISSION_STORAGE_KEY);

    setState({
      hasPermission: false,
      isRequesting: false,
      error: null,
      stream: null
    });
  }, []);

  return {
    hasPermission: state.hasPermission,
    isRequesting: state.isRequesting,
    error: state.error,
    stream: state.stream,
    requestPermission,
    getAudioStream,
    revokePermission
  };
};
