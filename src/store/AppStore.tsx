import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData } from '../types';
import { clearActive } from './activeSession';
import { clearData, defaultData, loadData, saveData, storageAvailable } from './storage';

interface Store {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  replace: (d: AppData) => void;
  wipe: () => void;
  persistent: boolean;
  saveFailed: boolean;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children, initial }: { children: ReactNode; initial?: AppData }) {
  const [persistent] = useState(() => storageAvailable());
  const [data, setData] = useState<AppData>(() => initial ?? loadData());
  const [saveFailed, setSaveFailed] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (persistent) setSaveFailed(!saveData(data));
  }, [data, persistent]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);
  const replace = useCallback((d: AppData) => setData(d), []);
  const wipe = useCallback(() => {
    clearData();
    clearActive();
    first.current = true; // don't immediately re-save defaults
    setData(defaultData());
  }, []);

  const value = useMemo(() => ({ data, update, replace, wipe, persistent, saveFailed }), [data, update, replace, wipe, persistent, saveFailed]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}
