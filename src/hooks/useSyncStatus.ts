import { useState, useEffect } from "react";

interface SyncManifest {
  version: string;
  timestamp: string;
}

export const useSyncStatus = () => {
  const [lastMigration, setLastMigration] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkStatus = async () => {
    try {
      // We fetch the manifest.json that is generated during build or on demand
      const response = await fetch("/manifest.json?t=" + Date.now());
      if (response.ok) {
        const data: SyncManifest = await response.json();
        if (data.version !== lastMigration) {
          setLastMigration(data.version);
        }
      }
      setLastCheck(new Date());
    } catch (error) {
      console.error("Erro ao verificar status de sincronização:", error);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [lastMigration]);

  return {
    lastMigration,
    isSyncing,
    lastCheck,
    refresh: checkStatus
  };
};