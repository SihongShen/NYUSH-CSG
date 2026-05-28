'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';
import type { CampusCode } from '@/types';

const STORAGE_KEY = 'campus';
const DEFAULT: CampusCode = 'SH';

const ALL_CAMPUSES: CampusCode[] = ['SH', 'NY', 'AD'];

function isCampus(v: string | null): v is CampusCode {
  return v !== null && (ALL_CAMPUSES as string[]).includes(v);
}

interface CampusContextValue {
  campus: CampusCode;
  setCampus: (next: CampusCode) => void;
}

const CampusContext = createContext<CampusContextValue | null>(null);

/**
 * 包在 (main) layout 外面，让整个登录后区域共享"当前校区"状态。
 * 状态持久化到 localStorage，刷新 / 重开浏览器都保持上次选择。
 */
export function CampusProvider({ children }: { children: ReactNode }) {
  const [campus, setCampusState] = useState<CampusCode>(DEFAULT);

  // 挂载后从 localStorage 读偏好（SSR 时 localStorage 不存在所以放 useEffect）
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isCampus(saved)) setCampusState(saved);
  }, []);

  const setCampus = useCallback((next: CampusCode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setCampusState(next);
  }, []);

  return (
    <CampusContext.Provider value={{ campus, setCampus }}>
      {children}
    </CampusContext.Provider>
  );
}

export function useCampus(): CampusContextValue {
  const ctx = useContext(CampusContext);
  if (!ctx) {
    throw new Error('useCampus 必须在 <CampusProvider> 里使用');
  }
  return ctx;
}
