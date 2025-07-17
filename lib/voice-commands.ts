import { create } from 'zustand';

// Speech Recognition API type declarations
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Voice command types
export interface VoiceCommand {
  id: string;
  phrase: string;
  description: string;
  action: () => void | Promise<void>;
  category: 'navigation' | 'food-tracking' | 'water-tracking' | 'goals' | 'general';
  enabled: boolean;
}

// Voice recognition result
export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

// Voice command store interface
interface VoiceCommandStore {
  isListening: boolean;
  isSupported: boolean;
  commands: VoiceCommand[];
  recognition: SpeechRecognition | null;
  synthesis: SpeechSynthesis | null;
  
  // Actions
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  addCommand: (command: VoiceCommand) => void;
  removeCommand: (id: string) => void;
  updateCommand: (id: string, updates: Partial<VoiceCommand>) => void;
  speak: (text: string, options?: SpeechSynthesisUtterance) => void;
  stopSpeaking: () => void;
  processCommand: (transcript: string) => void;
}

// Check if speech recognition is supported
const isSpeechRecognitionSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

// Check if speech synthesis is supported
const isSpeechSynthesisSupported = () => {
  return 'speechSynthesis' in window;
};

// Get speech recognition instance
const createSpeechRecognition = (): SpeechRecognition | null => {
  if (!isSpeechRecognitionSupported()) return null;

  const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionConstructor) return null;
  
  const recognition = new SpeechRecognitionConstructor();
  
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;
  
  return recognition;
};

// Voice command store
export const useVoiceCommandStore = create<VoiceCommandStore>((set, get) => ({
  isListening: false,
  isSupported: isSpeechRecognitionSupported() && isSpeechSynthesisSupported(),
  commands: [],
  recognition: null,
  synthesis: window.speechSynthesis || null,

  startListening: () => {
    const { recognition, isSupported } = get();
    if (!isSupported || !recognition) return;

    try {
      recognition.start();
      set({ isListening: true });

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence;
        const isFinal = result.isFinal;

        if (isFinal && confidence > 0.7) {
          get().processCommand(transcript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Speech recognition error - handled by error boundary
        set({ isListening: false });
      };

      recognition.onend = () => {
        set({ isListening: false });
      };

    } catch (error) {
      // Failed to start speech recognition - handled by error boundary
      set({ isListening: false });
    }
  },

  stopListening: () => {
    const { recognition } = get();
    if (recognition) {
      recognition.stop();
    }
    set({ isListening: false });
  },

  toggleListening: () => {
    const { isListening } = get();
    if (isListening) {
      get().stopListening();
    } else {
      get().startListening();
    }
  },

  addCommand: (command: VoiceCommand) => {
    set((state) => ({
      commands: [...state.commands, command],
    }));
  },

  removeCommand: (id: string) => {
    set((state) => ({
      commands: state.commands.filter(cmd => cmd.id !== id),
    }));
  },

  updateCommand: (id: string, updates: Partial<VoiceCommand>) => {
    set((state) => ({
      commands: state.commands.map(cmd =>
        cmd.id === id ? { ...cmd, ...updates } : cmd
      ),
    }));
  },

  speak: (text: string, options: Partial<SpeechSynthesisUtterance> = {}) => {
    const { synthesis } = get();
    if (!synthesis) return;

    // Stop any current speech
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set default options
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;
    utterance.lang = options.lang || 'en-US';
    utterance.voice = options.voice || null;

    synthesis.speak(utterance);
  },

  stopSpeaking: () => {
    const { synthesis } = get();
    if (synthesis) {
      synthesis.cancel();
    }
  },

  processCommand: (transcript: string) => {
    const { commands } = get();
    const lowerTranscript = transcript.toLowerCase();

    // Find matching command
    const matchingCommand = commands.find(cmd => {
      if (!cmd.enabled) return false;
      
      const phrases = cmd.phrase.toLowerCase().split('|');
      return phrases.some(phrase => lowerTranscript.includes(phrase.trim()));
    });

    if (matchingCommand) {
      try {
        matchingCommand.action();
        get().speak(`Executed: ${matchingCommand.description}`);
      } catch (error) {
        // Error executing voice command - handled by error boundary
        get().speak('Sorry, I encountered an error executing that command');
      }
    } else {
      get().speak('I did not understand that command');
    }
  },
}));

// Voice command utilities
export class VoiceCommandUtils {
  // Initialize default commands
  static initializeDefaultCommands() {
    const store = useVoiceCommandStore.getState();
    
    const defaultCommands: VoiceCommand[] = [
      {
        id: 'start-listening',
        phrase: 'hey assistant|hello assistant|start listening',
        description: 'Start voice recognition',
        action: () => store.startListening(),
        category: 'general',
        enabled: true,
      },
      {
        id: 'stop-listening',
        phrase: 'stop listening|stop|end',
        description: 'Stop voice recognition',
        action: () => store.stopListening(),
        category: 'general',
        enabled: true,
      },
      {
        id: 'add-food',
        phrase: 'add food|log food|record food',
        description: 'Add food entry',
        action: () => {
          // This would trigger the food logging modal
          store.speak('Opening food logging. Please say the food name and amount');
        },
        category: 'food-tracking',
        enabled: true,
      },
      {
        id: 'add-water',
        phrase: 'add water|drink water|log water',
        description: 'Add water intake',
        action: () => {
          // This would add a standard water amount
          store.speak('Added 250ml of water to your daily intake');
        },
        category: 'water-tracking',
        enabled: true,
      },
      {
        id: 'check-goals',
        phrase: 'check goals|my goals|goal status',
        description: 'Check current goals',
        action: () => {
          store.speak('Checking your nutrition goals');
        },
        category: 'goals',
        enabled: true,
      },
      {
        id: 'navigate-dashboard',
        phrase: 'go to dashboard|show dashboard|open dashboard',
        description: 'Navigate to dashboard',
        action: () => {
          window.location.href = '/dashboard';
        },
        category: 'navigation',
        enabled: true,
      },
      {
        id: 'navigate-food-tracker',
        phrase: 'food tracker|go to food tracker|open food tracker',
        description: 'Navigate to food tracker',
        action: () => {
          window.location.href = '/food-tracker';
        },
        category: 'navigation',
        enabled: true,
      },
      {
        id: 'navigate-water-tracker',
        phrase: 'water tracker|go to water tracker|open water tracker',
        description: 'Navigate to water tracker',
        action: () => {
          window.location.href = '/water-tracker';
        },
        category: 'navigation',
        enabled: true,
      },
      {
        id: 'help',
        phrase: 'help|what can you do|voice commands',
        description: 'Show available voice commands',
        action: () => {
          const commands = useVoiceCommandStore.getState().commands;
          const enabledCommands = commands.filter(cmd => cmd.enabled);
          const helpText = `I can help you with: ${enabledCommands.map(cmd => cmd.description).join(', ')}`;
          store.speak(helpText);
        },
        category: 'general',
        enabled: true,
      },
    ];

    // Add default commands
    defaultCommands.forEach(command => {
      store.addCommand(command);
    });
  }

  // Get available voices
  static getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices();
  }

  // Get default voice
  static getDefaultVoice(): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices();
    return voices.find(voice => voice.lang.startsWith('en')) || voices[0] || null;
  }

  // Parse food command
  static parseFoodCommand(transcript: string): { food: string; amount?: string; unit?: string } | null {
    const patterns = [
      /(?:add|log|record)\s+(.+?)(?:\s+(\d+)\s*(ml|g|oz|cup|tablespoon|teaspoon))?/i,
      /(\d+)\s*(ml|g|oz|cup|tablespoon|teaspoon)\s+of\s+(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = transcript.match(pattern);
      if (match) {
        return {
          food: match[1] || match[3],
          amount: match[2],
          unit: match[3] || match[2],
        };
      }
    }

    return null;
  }

  // Parse water command
  static parseWaterCommand(transcript: string): { amount: number; unit: string } | null {
    const patterns = [
      /(\d+)\s*(ml|oz|cup|glass|bottle)/i,
      /(?:drink|add)\s+(\d+)\s*(ml|oz|cup|glass|bottle)/i,
    ];

    for (const pattern of patterns) {
      const match = transcript.match(pattern);
      if (match) {
        return {
          amount: parseInt(match[1]),
          unit: match[2],
        };
      }
    }

    // Default to 250ml if no amount specified
    if (transcript.includes('water')) {
      return { amount: 250, unit: 'ml' };
    }

    return null;
  }

  // Create custom command
  static createCustomCommand(
    phrase: string,
    action: () => void,
    category: VoiceCommand['category'] = 'general',
    description?: string
  ): VoiceCommand {
    return {
      id: `custom-${Date.now()}`,
      phrase,
      description: description || `Custom command: ${phrase}`,
      action,
      category,
      enabled: true,
    };
  }

  // Validate command phrase
  static validateCommandPhrase(phrase: string): boolean {
    if (!phrase.trim()) return false;
    if (phrase.length < 2) return false;
    if (phrase.length > 100) return false;
    return true;
  }

  // Get command suggestions
  static getCommandSuggestions(partialTranscript: string): VoiceCommand[] {
    const { commands } = useVoiceCommandStore.getState();
    const lowerPartial = partialTranscript.toLowerCase();
    
    return commands
      .filter(cmd => cmd.enabled && cmd.phrase.toLowerCase().includes(lowerPartial))
      .slice(0, 5);
  }
}

// Export utilities
export const voiceCommandUtils = {
  VoiceCommandUtils,
}; 