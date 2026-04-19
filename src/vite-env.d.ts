/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    getHWID: () => Promise<string>;
  };
}
