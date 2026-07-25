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
import type { MabelData, LifeItem, Status, ApprovalStatus, UserPreferences } from "../types";
import type { Extraction } from "../schemas";
import { buildSeed } from "../demo/seed";
import { STORAGE_KEY } from "../config";
import { todayIso } from "../utils";
import * as ops from "./operations";

/**
 * MabelProvider holds the entire demo data set in React state, persists it to
 * localStorage, and exposes typed action methods that delegate to the pure
 * `operations` module. This is what makes every flow work end-to-end with no
 * backend — refreshes keep your data, and actions are undoable/simulated.
 */

interface MabelContextValue {
  data: MabelData;
  ready: boolean;
  metrics: ReturnType<typeof ops.computeMetrics>;
  // actions
  capture: (input: string, extraction: Extraction) => LifeItem;
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
  runNudges: () => void;
  resetDemo: () => void;
}

const MabelContext = createContext<MabelContextValue | null>(null);

export function MabelProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MabelData>(() => buildSeed(todayIso()));
  const [ready, setReady] = useState(false);
  const firstLoad = useRef(true);
  // Mirror of the latest data so imperative actions (like capture) can read
  // the current state synchronously and return derived values reliably.
  const dataRef = useRef(data);

  const commit = useCallback((next: MabelData) => {
    dataRef.current = next;
    setData(next);
    return next;
  }, []);

  // Load from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        commit(JSON.parse(raw) as MabelData);
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

  // Persist on change and keep the imperative ref in sync.
  useEffect(() => {
    dataRef.current = data;
    if (firstLoad.current) {
      firstLoad.current = false;
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

  const value: MabelContextValue = {
    data,
    ready,
    metrics,
    capture,
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
    runNudges,
    resetDemo,
  };

  return <MabelContext.Provider value={value}>{children}</MabelContext.Provider>;
}

export function useMabel() {
  const ctx = useContext(MabelContext);
  if (!ctx) throw new Error("useMabel must be used within a MabelProvider");
  return ctx;
}
