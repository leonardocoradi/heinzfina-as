import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CATEGORY_COLORS, DEFAULT_CATEGORIES } from "./db";
import { supabaseRepository } from "./db-supabase";
import { addMonths, monthKey } from "./money";
import { uid, type Category, type Entry, type Scope } from "./types";

export interface NewExpenseInput {
  scope: Scope;
  categoryId: string;
  description: string;
  /** valor do lançamento ou de cada parcela, em centavos */
  amount: number;
  installments: number;
  fixed: boolean;
  paidUpfront: boolean;
  dueDate: string;
}

export interface NewIncomeInput {
  scope: Scope;
  categoryId: string;
  description: string;
  amount: number;
  date: string;
}

interface StoreValue {
  ready: boolean;
  entries: Entry[];
  categories: Category[];
  reserve: number;
  addExpense: (input: NewExpenseInput) => void;
  addIncome: (input: NewIncomeInput) => void;
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  deleteEntry: (id: string) => void;
  deleteGroup: (ids: string[]) => void;
  payPartial: (id: string, value: number) => void;
  payFull: (ids: string[]) => void;
  addCategory: (name: string, icon?: string) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  reserveDeposit: (value: number) => void;
  reserveWithdraw: (value: number, destination: string, scope: Scope) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [reserve, setReserve] = useState(0);
  const entriesSaveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let alive = true;
    (async () => {
      const [e, c, m] = await Promise.all([
        supabaseRepository.loadEntries(),
        supabaseRepository.loadCategories(),
        supabaseRepository.loadMeta(),
      ]);
      if (!alive) return;
      setEntries(e);
      setCategories(c ?? DEFAULT_CATEGORIES);
      setReserve(m?.reserve ?? 0);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const snapshot = entries;
    entriesSaveQueue.current = entriesSaveQueue.current
      .catch(() => undefined)
      .then(() => supabaseRepository.saveEntries(snapshot));
  }, [entries, ready]);
  useEffect(() => {
    if (ready) void supabaseRepository.saveCategories(categories);
  }, [categories, ready]);
  useEffect(() => {
    if (ready) void supabaseRepository.saveMeta({ reserve });
  }, [reserve, ready]);

  const addExpense = useCallback((input: NewExpenseInput) => {
    const now = new Date().toISOString();
    const groupId = uid();
    const created: Entry[] = [];

    const base = {
      type: "expense" as const,
      scope: input.scope,
      categoryId: input.categoryId,
      description: input.description,
      paid: input.paidUpfront ? input.amount : 0,
      fromReserve: false,
      paidUpfront: input.paidUpfront,
      createdAt: now,
    };

    if (input.fixed) {
      const startMonth = Number(input.dueDate.slice(5, 7));
      const remainingMonths = 12 - startMonth;
      for (let monthOffset = 0; monthOffset <= remainingMonths; monthOffset++) {
        created.push({
          ...base,
          id: uid(),
          amount: input.amount,
          date: addMonths(input.dueDate, monthOffset),
          fixed: true,
          installmentIndex: null,
          installmentCount: null,
          totalAmount: null,
          groupId,
        });
      }
    } else if (input.installments > 1) {
      const n = input.installments;
      for (let i = 0; i < n; i++) {
        created.push({
          ...base,
          id: uid(),
          amount: input.amount,
          date: addMonths(input.dueDate, i),
          fixed: false,
          installmentIndex: i + 1,
          installmentCount: n,
          totalAmount: input.amount * n,
          groupId,
        });
      }
    } else {
      created.push({
        ...base,
        id: uid(),
        amount: input.amount,
        date: input.dueDate,
        fixed: false,
        installmentIndex: null,
        installmentCount: null,
        totalAmount: null,
        groupId: null,
      });
    }

    setEntries((prev) => [...prev, ...created]);
  }, []);

  const addIncome = useCallback((input: NewIncomeInput) => {
    setEntries((prev) => [
      ...prev,
      {
        id: uid(),
        type: "income",
        scope: input.scope,
        categoryId: input.categoryId,
        description: input.description,
        amount: input.amount,
        paid: input.amount,
        date: input.date,
        fixed: false,
        installmentIndex: null,
        installmentCount: null,
        totalAmount: null,
        groupId: null,
        fromReserve: false,
        paidUpfront: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<Entry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e)),
    );
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const deleteGroup = useCallback((ids: string[]) => {
    const set_ = new Set(ids);
    setEntries((prev) => prev.filter((e) => !set_.has(e.id)));
  }, []);

  const payPartial = useCallback((id: string, value: number) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, paid: Math.min(e.amount, e.paid + value) } : e,
      ),
    );
  }, []);

  const payFull = useCallback((ids: string[]) => {
    const set_ = new Set(ids);
    setEntries((prev) =>
      prev.map((e) => (set_.has(e.id) ? { ...e, paid: e.amount } : e)),
    );
  }, []);

  const addCategory = useCallback((name: string, icon?: string) => {
    setCategories((prev) => [
      ...prev,
      {
        id: uid(),
        name,
        color: CATEGORY_COLORS[prev.length % CATEGORY_COLORS.length] ?? "#34d399",
        icon: icon || "Tag",
      },
    ]);
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch, id: c.id } : c)),
    );
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setEntries((prev) => prev.filter((e) => e.categoryId !== id));
  }, []);

  const reserveDeposit = useCallback((value: number) => {
    setReserve((prev) => prev + value);
  }, []);

  const reserveWithdraw = useCallback(
    (value: number, destination: string, scope: Scope) => {
      setReserve((prev) => Math.max(0, prev - value));
      const catId = "cat-reserva";
      setCategories((prev) =>
        prev.some((c) => c.id === catId)
          ? prev
          : [...prev, { id: catId, name: "Reserva", color: "#22d3ee", icon: "PiggyBank" }],
      );
      setEntries((prev) => [
        ...prev,
        {
          id: uid(),
          type: "expense",
          scope,
          categoryId: catId,
          description: destination,
          amount: value,
          paid: value,
          date: new Date().toISOString().slice(0, 10),
          fixed: false,
          installmentIndex: null,
          installmentCount: null,
          totalAmount: null,
          groupId: null,
          fromReserve: true,
          paidUpfront: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      entries,
      categories,
      reserve,
      addExpense,
      addIncome,
      updateEntry,
      deleteEntry,
      deleteGroup,
      payPartial,
      payFull,
      addCategory,
      updateCategory,
      deleteCategory,
      reserveDeposit,
      reserveWithdraw,
    }),
    [
      ready,
      entries,
      categories,
      reserve,
      addExpense,
      addIncome,
      updateEntry,
      deleteEntry,
      deleteGroup,
      payPartial,
      payFull,
      addCategory,
      updateCategory,
      deleteCategory,
      reserveDeposit,
      reserveWithdraw,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de StoreProvider");
  return ctx;
}

/* ----------------------------- seletores ----------------------------- */

export function globalTotals(entries: Entry[], month: string) {
  let income = 0;
  let outcome = 0;
  for (const e of entries) {
    if (e.fromReserve) continue;
    if (monthKey(e.date) !== month) continue;
    if (e.type === "income") income += e.paid;
    else {
      outcome += e.amount;
      if (!e.paidUpfront) income += e.paid;
    }
  }
  return { income, outcome, balance: income - outcome };
}

export function scopeTotals(entries: Entry[], scope: Scope, month: string) {
  let total = 0;
  let paid = 0;
  for (const e of entries) {
    if (e.type !== "expense" || e.scope !== scope) continue;
    if (monthKey(e.date) !== month) continue;
    total += e.amount;
    paid += e.paid;
  }
  return { total, paid, due: total - paid };
}
