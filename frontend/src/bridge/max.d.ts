export interface MaxUser {
  id: number;
  name: string;
  avatar?: string;
}

export interface MaxBridge {
  initData: string;
  user: MaxUser | null;
  sendMessageToBot(text: string): void;
  isReady: boolean;
}

declare global {
  interface Window {
    WebApp?: {
      initData?: string;
      user?: { id?: number; first_name?: string; last_name?: string; username?: string; photo_url?: string };
      ready?: () => void;
      expand?: () => void;
      sendData?: (data: string) => void;
      sendMessage?: (text: string) => void;
      HapticFeedback?: { impactOccurred?: (style: string) => void };
    };
    MAX?: Window["WebApp"];
  }
}
