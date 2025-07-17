"use client";
import { useEffect, useCallback, useState } from 'react';
import { useVoiceCommandStore, VoiceCommandUtils } from '@/lib/voice-commands';

export function useVoiceCommands() {
  const store = useVoiceCommandStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize voice commands
  useEffect(() => {
    if (!isInitialized && store.isSupported) {
      VoiceCommandUtils.initializeDefaultCommands();
      setIsInitialized(true);
    }
  }, [isInitialized, store.isSupported]);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }, []);

  // Start listening with permission check
  const startListeningWithPermission = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (hasPermission) {
      store.startListening();
    } else {
      store.speak('Microphone permission is required for voice commands');
    }
  }, [store, requestPermission]);

  // Create custom command
  const createCommand = useCallback((
    phrase: string,
    action: () => void,
    category: any = 'general',
    description?: string
  ) => {
    const command = VoiceCommandUtils.createCustomCommand(phrase, action, category, description);
    store.addCommand(command);
    return command.id;
  }, [store]);

  // Remove custom command
  const removeCommand = useCallback((id: string) => {
    store.removeCommand(id);
  }, [store]);

  return {
    ...store,
    isInitialized,
    requestPermission,
    startListeningWithPermission,
    createCommand,
    removeCommand,
    getAvailableVoices: VoiceCommandUtils.getAvailableVoices,
    getDefaultVoice: VoiceCommandUtils.getDefaultVoice,
    parseFoodCommand: VoiceCommandUtils.parseFoodCommand,
    parseWaterCommand: VoiceCommandUtils.parseWaterCommand,
    getCommandSuggestions: VoiceCommandUtils.getCommandSuggestions,
  };
} 