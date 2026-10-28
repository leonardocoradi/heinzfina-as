import { supabase } from "./supabase";
import { indexedDbRepository, type Repository } from "./db";
import type { Category, Entry, Meta, PaymentPayer } from "./types";

/**
 * Implementação do Repository usando Supabase.
 *
 * Estratégia:
 * - Leitura: sempre tenta o Supabase primeiro; se estiver vazio e ainda não
 *   migrado, puxa os dados locais (IndexedDB) e os envia para a nuvem.
 * - Escrita: upsert + remoção de registros que não existem mais.
 * - Se o Supabase estiver indisponível (offline), faz fallback para o IndexedDB
 *   para não perder dados.
 */

const MIGRATED_KEY = "fh:supabase:migrated";

const isMigrated = () =>
  typeof localStorage !== "undefined" && localStorage.getItem(MIGRATED_KEY) === "1";

const markMigrated = () => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(MIGRATED_KEY, "1");
  }
};

interface EntryRow {
  id: string;
  type: string;
  scope: string;
  category_id: string;
  description: string;
  amount: number;
  paid: number;
  date: string;
  fixed: boolean;
  installment_index: number | null;
  installment_count: number | null;
  total_amount: number | null;
  group_id: string | null;
  from_reserve: boolean;
  paid_upfront: boolean;
  paid_at: string | null;
  payment_payer: string | null;
  client_name: string | null;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface MetaRow {
  id: number;
  reserve: number;
}

const toEntry = (r: EntryRow): Entry => ({
  id: r.id,
  type: r.type === "income" ? "income" : "expense",
  scope: r.scope === "pessoal" ? "pessoal" : "empresa",
  categoryId: r.category_id,
  description: r.description,
  amount: r.amount,
  paid: r.paid,
  date: r.date,
  fixed: r.fixed,
  installmentIndex: r.installment_index,
  installmentCount: r.installment_count,
  totalAmount: r.total_amount,
  groupId: r.group_id,
  fromReserve: r.from_reserve,
  paidUpfront: r.paid_upfront ?? false,
  paidAt: r.paid_at ?? null,
  paymentPayer: r.payment_payer === "client" || r.payment_payer === "self"
    ? (r.payment_payer as PaymentPayer)
    : null,
  clientName: r.client_name?.trim() || null,
  createdAt: r.created_at,
});

const toEntryRow = (e: Entry): EntryRow => ({
  id: e.id,
  type: e.type,
  scope: e.scope,
  category_id: e.categoryId,
  description: e.description,
  amount: e.amount,
  paid: e.paid,
  date: e.date,
  fixed: e.fixed,
  installment_index: e.installmentIndex,
  installment_count: e.installmentCount,
  total_amount: e.totalAmount,
  group_id: e.groupId,
  from_reserve: e.fromReserve,
  paid_upfront: e.paidUpfront,
  paid_at: e.paidAt,
  payment_payer: e.paymentPayer,
  client_name: e.clientName,
  created_at: e.createdAt,
});

async function loadEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("date")
    .order("created_at");
  if (error) {
    console.warn("Supabase indisponível na leitura, usando dados locais.", error);
    return indexedDbRepository.loadEntries();
  }
  if (data && data.length > 0) {
    markMigrated();
    return data.map(toEntry);
  }
  if (!isMigrated()) {
    const local = await indexedDbRepository.loadEntries();
    if (local.length > 0) {
      await saveEntries(local);
      markMigrated();
      return local;
    }
    markMigrated();
  }
  return [];
}

async function saveEntries(entries: Entry[]): Promise<void> {
  try {
    if (entries.length > 0) {
      const { error } = await supabase
        .from("entries")
        .upsert(entries.map(toEntryRow), { onConflict: "id" });
      if (error) throw error;
    }
    const { data, error } = await supabase.from("entries").select("id");
    if (error) throw error;
    const keep = new Set(entries.map((e) => e.id));
    const missing = (data ?? []).map((r) => r.id as string).filter((id) => !keep.has(id));
    if (missing.length > 0) {
      const { error: delError } = await supabase.from("entries").delete().in("id", missing);
      if (delError) throw delError;
    }
  } catch (err) {
    console.warn("Falha ao salvar no Supabase, mantendo cópia local.", err);
    await indexedDbRepository.saveEntries(entries);
  }
}

async function loadCategories(): Promise<Category[] | null> {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) {
    console.warn("Supabase indisponível na leitura, usando dados locais.", error);
    return indexedDbRepository.loadCategories();
  }
  if (data && data.length > 0) {
    markMigrated();
    return data.map((r: CategoryRow) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      icon: r.icon ?? "Tag",
    }));
  }
  if (!isMigrated()) {
    const local = await indexedDbRepository.loadCategories();
    if (local && local.length > 0) {
      await saveCategories(local);
      markMigrated();
      return local;
    }
    markMigrated();
  }
  return null;
}

async function saveCategories(categories: Category[]): Promise<void> {
  try {
    if (categories.length > 0) {
      const { error } = await supabase.from("categories").upsert(categories, { onConflict: "id" });
      if (error) throw error;
    }
    const { data, error } = await supabase.from("categories").select("id");
    if (error) throw error;
    const keep = new Set(categories.map((c) => c.id));
    const missing = (data ?? []).map((r) => r.id as string).filter((id) => !keep.has(id));
    if (missing.length > 0) {
      const { error: delError } = await supabase.from("categories").delete().in("id", missing);
      if (delError) throw delError;
    }
  } catch (err) {
    console.warn("Falha ao salvar no Supabase, mantendo cópia local.", err);
    await indexedDbRepository.saveCategories(categories);
  }
}

async function loadMeta(): Promise<Meta | null> {
  const { data, error } = await supabase.from("meta").select("*").limit(1);
  if (error) {
    console.warn("Supabase indisponível na leitura, usando dados locais.", error);
    return indexedDbRepository.loadMeta();
  }
  if (data && data.length > 0) {
    return { reserve: (data[0] as MetaRow).reserve ?? 0 };
  }
  return indexedDbRepository.loadMeta();
}

async function saveMeta(meta: Meta): Promise<void> {
  try {
    const { error } = await supabase
      .from("meta")
      .upsert({ id: 1, reserve: meta.reserve }, { onConflict: "id" });
    if (error) throw error;
  } catch (err) {
    console.warn("Falha ao salvar no Supabase, mantendo cópia local.", err);
    await indexedDbRepository.saveMeta(meta);
  }
}

export const supabaseRepository: Repository = {
  loadEntries,
  saveEntries,
  loadCategories,
  saveCategories,
  loadMeta,
  saveMeta,
};
