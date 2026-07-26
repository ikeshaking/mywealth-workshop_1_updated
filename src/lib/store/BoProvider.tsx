"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { BoData, LifeItem, Status, ApprovalStatus, UserPreferences } from "../types";
import type { Extraction, PlannedReminder, RecommendationBundle } from "../schemas";
import { buildSeed, buildEmptyState } from "../demo/seed";
import { STORAGE_KEY, isLive } from "../config";
import { loadLiveState, saveLiveState } from "../live/state";
import { todayIso } from "../utils";
import * as ops from "./operations";

/**
 * BoProvider holds the entire demo data set in React state, persists it to
 * localStorage, and exposes typed action methods that delegate to the pure
 * `operations` module. This is what makes every flow work end-to-end with no
 * backend — refreshes keep your data, and actions are undoable/simulated.
 */

interface BoContextValue {
  data: BoData;
  ready: boolean;
  metrics: ReturnType<typeof ops.computeMetrics>;
  // actions
  capture: (input: string, extraction: Extraction) => LifeItem;
  addReminders: (reminders: PlannedReminder[]) => number;
  attachRecommendations: (
    decisionRequestId: string,
    summary: string,
    bundles: RecommendationBundle[],
  ) => void;
  updateItem: (itemId: string, patch: Partial<LifeItem>) => void;
  transition: (itemId: string, to: Status, message?: string) => void;
  addNote: (itemId: string, body: string) => void;
  scheduleReminder: (itemId: string, fireAtIso: string, message: string) => void;
  requestApproval: (
    itemId: string,
    approval: Parameters<typeof ops.requestApproval>[2],
  ) => void;
  resolveApproval: (
    approvalId: string,
    status: ApprovalStatus,
    outcome?: Parameters<typeof ops.resolveApproval>[3],
  ) => void;
  completeItem: (itemId: string, outcome?: Parameters<typeof ops.completeItem>[2]) => void;
  setOptionFlag: (optionId: string, flag: "saved" | "rejected", value: boolean) => void;
  approvePurchaseOption: (optionId: string) => void;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  addMemory: (memory: Parameters<typeof ops.addMemory>[1]) => void;
  updateMemory: (memoryId: string, value: string) => void;
  forgetMemory: (memoryId: string) => void;
  runNudges: () => void;
  resetDemo: () => void;
}

const BoContext = createContext<BoContextValue | null>(null);

export function BoProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<BoData>(() => buildSeed(todayIso()));
  const [ready, setReady] = useState(false);
  const firstLoad = useRef(true);
  // Mirror of the latest data so imperative actions (like capture) can read
  // the current state synchronously and return derived values reliably.
  const dataRef = useRef(data);
  // Live mode: the signed-in user id and a debounce timer for saves.
  const userIdRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback((next: BoData) => {
    dataRef.current = next;
    setData(next);
    return next;
  }, []);

  // Load on mount — from Supabase (live) or localStorage (demo).
  useEffect(() => {
    if (isLive) {
      let cancelled = false;
      (async () => {
        try {
          const loaded = await loadLiveState();
          if (cancelled) return;
          if (loaded) {
            userIdRef.current = loaded.userId;
            if (loaded.data) {
              const d = loaded.data;
              if (!Array.isArray(d.memories)) d.memories = [];
              commit(d);
            } else {
              // First sign-in: create a fresh, empty account (no demo data).
              const fresh = buildEmptyState(loaded.name, loaded.email);
              commit(fresh);
              await saveLiveState(loaded.userId, fresh);
            }
          }
        } catch {
          // ignore — guard will redirect if not authenticated
        }
        if (!cancelled) setReady(true);
      })();
      return () => {
        cancelled = true;
      };
    }

    // Demo mode: localStorage.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BoData;
        if (!Array.isArray(parsed.memories)) parsed.memories = [];
        commit(parsed);
      } else {
        const seed = buildSeed(todayIso());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        commit(seed);
      }
    } catch {
      // ignore corrupted storage; fall back to in-memory seed
    }
    setReady(true);
  }, [commit]);

  // Persist on change — to Supabase (debounced) or localStorage — and keep the ref in sync.
  useEffect(() => {
    dataRef.current = data;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (isLive) {
      if (!userIdRef.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const uid = userIdRef.current;
      saveTimer.current = setTimeout(() => {
        void saveLiveState(uid, data);
      }, 600);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage might be full/unavailable — non-fatal
    }
  }, [data]);

  const capture = useCallback(
    (input: string, extraction: Extraction) => {
      const res = ops.createItemFromExtraction(dataRef.current, input, extraction);
      commit(res.data);
      return res.item;
    },
    [commit],
  );

  const addReminders = useCallback(
    (reminders: PlannedReminder[]) => {
      const res = ops.createReminders(
        dataRef.current,
        reminders,
        dataRef.current.preferences.currency,
      );
      commit(res.data);
      return res.count;
    },
    [commit],
  );

  const attachRecommendations = useCallback(
    (decisionRequestId: string, summary: string, bundles: RecommendationBundle[]) => {
      setData((d) => ops.attachRecommendations(d, decisionRequestId, summary, bundles));
    },
    [],
  );

  const updateItem = useCallback((itemId: string, patch: Partial<LifeItem>) => {
    setData((d) => ops.updateItem(d, itemId, patch));
  }, []);

  const transition = useCallback((itemId: string, to: Status, message?: string) => {
    setData((d) => ops.transitionStatus(d, itemId, to, message));
  }, []);

  const addNote = useCallback((itemId: string, body: string) => {
    setData((d) => ops.addNote(d, itemId, body));
  }, []);

  const scheduleReminder = useCallback((itemId: string, fireAtIso: string, message: string) => {
    setData((d) => ops.scheduleReminder(d, itemId, fireAtIso, message));
  }, []);

  const requestApproval = useCallback(
    (itemId: string, approval: Parameters<typeof ops.requestApproval>[2]) => {
      setData((d) => ops.requestApproval(d, itemId, approval));
    },
    [],
  );

  const resolveApproval = useCallback(
    (
      approvalId: string,
      status: ApprovalStatus,
      outcome?: Parameters<typeof ops.resolveApproval>[3],
    ) => {
      setData((d) => ops.resolveApproval(d, approvalId, status, outcome));
    },
    [],
  );

  const completeItem = useCallback(
    (itemId: string, outcome?: Parameters<typeof ops.completeItem>[2]) => {
      setData((d) => ops.completeItem(d, itemId, outcome));
    },
    [],
  );

  const setOptionFlag = useCallback(
    (optionId: string, flag: "saved" | "rejected", value: boolean) => {
      setData((d) => ops.setOptionFlag(d, optionId, flag, value));
    },
    [],
  );

  const approvePurchaseOption = useCallback((optionId: string) => {
    setData((d) => ops.approvePurchaseOption(d, optionId));
  }, []);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setData((d) => ({ ...d, preferences: { ...d.preferences, ...patch } }));
  }, []);

  const addMemory = useCallback((memory: Parameters<typeof ops.addMemory>[1]) => {
    setData((d) => ops.addMemory(d, memory));
  }, []);

  const updateMemory = useCallback((memoryId: string, value: string) => {
    setData((d) => ops.updateMemory(d, memoryId, value));
  }, []);

  const forgetMemory = useCallback((memoryId: string) => {
    setData((d) => ops.forgetMemory(d, memoryId));
  }, []);

  const runNudges = useCallback(() => {
    setData((d) => ops.fireDueReminders(d).data);
  }, []);

  const resetDemo = useCallback(() => {
    const seed = buildSeed(todayIso());
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    } catch {
      /* ignore */
    }
    setData(seed);
  }, []);

  const metrics = useMemo(() => ops.computeMetrics(data), [data]);

  const value: BoContextValue = {
    data,
    ready,
    metrics,
    capture,
    addReminders,
    attachRecommendations,
    updateItem,
    transition,
    addNote,
    scheduleReminder,
    requestApproval,
    resolveApproval,
    completeItem,
    setOptionFlag,
    approvePurchaseOption,
    updatePreferences,
    addMemory,
    updateMemory,
    forgetMemory,
    runNudges,
    resetDemo,
  };

  return <BoContext.Provider value={value}>{children}</BoContext.Provider>;
}

export function useBo() {
  const ctx = useContext(BoContext);
  if (!ctx) throw new Error("useBo must be used within a BoProvider");
  return ctx;
}
