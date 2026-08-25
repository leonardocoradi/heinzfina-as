import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { formatCents, formatDate, MONTHS, monthKey } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectedIconSmall } from "./IconPicker";
import type { Category, Entry, Scope } from "@/lib/types";

type Mode = "despesas" | "receitas";

interface Slice {
  categoryId: string;
  name: string;
  color: string;
  icon: string | null | undefined;
  value: number;
}

interface DetailMovement {
  entry: Entry;
  value: number;
  origin: string;
}

export function DonutChart({
  entries,
  categories,
  month,
  scopeFilter,
}: {
  entries: Entry[];
  categories: Category[];
  month: string;
  scopeFilter: Scope[];
}) {
  const [mode, setMode] = useState<Mode>("despesas");
  const [selected, setSelected] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const revenueMovements = useMemo<DetailMovement[]>(() => {
    const movements: DetailMovement[] = [];
    for (const entry of entries) {
      if (monthKey(entry.date) !== month) continue;
      if (scopeFilter.length && !scopeFilter.includes(entry.scope)) continue;

      if (entry.type === "income") {
        movements.push({ entry, value: entry.amount, origin: "Renda" });
      } else if (entry.paid > 0) {
        movements.push({
          entry,
          value: Math.min(entry.amount, entry.paid),
          origin: entry.paidUpfront ? "Pagamento à vista" : "Pagamento",
        });
      }
    }
    return movements;
  }, [entries, month, scopeFilter]);

  const expenseMovements = useMemo<DetailMovement[]>(() => {
    const movements: DetailMovement[] = [];
    for (const entry of entries) {
      if (entry.type !== "expense") continue;
      if (monthKey(entry.date) !== month) continue;
      if (scopeFilter.length && !scopeFilter.includes(entry.scope)) continue;

      const origin = entry.paidUpfront
        ? "Pago à vista"
        : entry.fixed
          ? "Despesa fixa"
          : entry.installmentCount
            ? `Parcela ${entry.installmentIndex}/${entry.installmentCount}`
            : entry.paid >= entry.amount
              ? "Pago"
              : entry.paid > 0
                ? "Pagamento parcial"
                : "Em aberto";
      movements.push({ entry, value: entry.amount, origin });
    }
    return movements;
  }, [entries, month, scopeFilter]);

  const data = useMemo<Slice[]>(() => {
    const wantExpense = mode === "despesas";
    const sums = new Map<string, number>();
    if (wantExpense) {
      for (const e of entries) {
        if (e.type !== "expense") continue;
        if (monthKey(e.date) !== month) continue;
        if (scopeFilter.length && !scopeFilter.includes(e.scope)) continue;
        sums.set(e.categoryId, (sums.get(e.categoryId) ?? 0) + e.amount);
      }
    } else {
      for (const movement of revenueMovements) {
        const categoryId = movement.entry.categoryId;
        sums.set(categoryId, (sums.get(categoryId) ?? 0) + movement.value);
      }
    }
    return [...sums.entries()]
      .map(([id, value]) => {
        const c = categories.find((cat) => cat.id === id);
        return {
          categoryId: id,
          name: c?.name ?? "Sem categoria",
          color: c?.color ?? "#34d399",
          icon: c?.icon,
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [entries, categories, month, scopeFilter, mode, revenueMovements]);

  const total = useMemo(() => data.reduce((acc, s) => acc + s.value, 0), [data]);
  const isExpense = mode === "despesas";
  const selectedSlice = selected ? (data.find((s) => s.categoryId === selected) ?? null) : null;
  const selectedMovements = useMemo(
    () =>
      selected
        ? (isExpense ? expenseMovements : revenueMovements)
            .filter((movement) => movement.entry.categoryId === selected)
            .sort(
              (a, b) =>
                b.entry.date.localeCompare(a.entry.date) ||
                b.entry.createdAt.localeCompare(a.entry.createdAt),
            )
        : [],
    [expenseMovements, isExpense, revenueMovements, selected],
  );

  const pct = (value: number) => {
    if (!total) return "0%";
    return (value / total).toLocaleString("pt-BR", {
      style: "percent",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
  };

  const toggleSlice = (id: string) => setSelected((prev) => (prev === id ? null : id));

  const switchMode = (next: Mode) => {
    setMode(next);
    setSelected(null);
    setDetailOpen(false);
  };

  const monthLabel = `${MONTHS[Number(month.slice(5, 7)) - 1] ?? ""} de ${month.slice(0, 4)}`;

  return (
    <section className="surface mt-5 rounded-3xl p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold">Distribuição por categoria</h2>
          <p className="text-xs text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-1 rounded-2xl border border-border bg-secondary/40 p-1">
          <button
            onClick={() => switchMode("despesas")}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-all duration-200",
              isExpense
                ? "bg-destructive/15 text-destructive"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowDownRight className="size-4" />
            Despesas
          </button>
          <button
            onClick={() => switchMode("receitas")}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-all duration-200",
              !isExpense
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowUpRight className="size-4" />
            Receitas
          </button>
        </div>
      </header>

      {data.length === 0 ? (
        <div className="mx-auto mt-4 flex h-56 max-w-72 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-secondary/30 px-6 text-center">
          <p className="text-sm font-medium text-foreground">
            {isExpense ? "Sem despesas" : "Sem receitas"} no período
          </p>
          <p className="text-xs text-muted-foreground">
            Cadastre lançamentos ou ajuste o mês e os filtros.
          </p>
        </div>
      ) : (
        <>
          <div className="relative mx-auto mt-4 h-56 w-full max-w-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={74}
                  outerRadius={104}
                  paddingAngle={2}
                  cornerRadius={8}
                  strokeWidth={0}
                  animationDuration={700}
                  animationEasing="ease-out"
                  onClick={(_entry, index) => {
                    const slice = data[index];
                    if (slice) toggleSlice(slice.categoryId);
                  }}
                >
                  {data.map((s) => (
                    <Cell
                      key={s.categoryId}
                      fill={s.color}
                      fillOpacity={!selected || selected === s.categoryId ? 1 : 0.22}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <p
                className={cn(
                  "font-display text-2xl font-bold tabular-nums",
                  isExpense ? "text-destructive" : "text-primary",
                )}
              >
                {formatCents(total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isExpense ? "Total de despesas" : "Total de receitas"}
              </p>
            </div>
          </div>

          {selectedSlice && (
            <div className="mt-4 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-xl"
                  style={{
                    backgroundColor: `${selectedSlice.color}22`,
                    color: selectedSlice.color,
                  }}
                >
                  <SelectedIconSmall name={selectedSlice.icon} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {selectedSlice.name}
                </span>
                <span
                  className={cn(
                    "font-display shrink-0 text-sm font-semibold tabular-nums",
                    isExpense ? "text-destructive" : "text-primary",
                  )}
                >
                  {formatCents(selectedSlice.value)}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-sm tabular-nums",
                    isExpense ? "text-destructive" : "text-primary",
                  )}
                >
                  {pct(selectedSlice.value)}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3 w-full rounded-xl"
                onClick={() => setDetailOpen(true)}
              >
                Detalhar
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}

          <div className="mt-4 space-y-1">
            {data.map((s) => (
              <button
                key={s.categoryId}
                onClick={() => toggleSlice(s.categoryId)}
                className={cn(
                  "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors duration-200",
                  selected === s.categoryId ? "bg-secondary" : "hover:bg-secondary/50",
                )}
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-xl"
                  style={{ backgroundColor: `${s.color}22`, color: s.color }}
                >
                  <SelectedIconSmall name={s.icon} />
                </span>
                <span className="truncate text-sm">{s.name}</span>
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-display text-sm font-semibold tabular-nums",
                      isExpense ? "text-destructive" : "text-primary",
                    )}
                  >
                    {formatCents(s.value)}
                  </span>
                  <span className="min-w-14 text-right text-xs text-muted-foreground tabular-nums">
                    {pct(s.value)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSlice?.name ??
                (isExpense ? "Detalhamento de despesas" : "Detalhamento de receitas")}
            </DialogTitle>
            <DialogDescription>
              {isExpense ? "Despesas" : "Entradas"} registradas em {monthLabel.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "flex items-center justify-between rounded-2xl px-4 py-3",
              isExpense ? "bg-destructive/10" : "bg-primary/10",
            )}
          >
            <span className="text-sm text-muted-foreground">Total da categoria</span>
            <strong
              className={cn(
                "font-display text-lg tabular-nums",
                isExpense ? "text-destructive" : "text-primary",
              )}
            >
              {formatCents(selectedSlice?.value ?? 0)}
            </strong>
          </div>

          <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {selectedMovements.map(({ entry, value, origin }) => (
              <div
                key={`${entry.id}-${origin}`}
                className="rounded-2xl border border-border bg-secondary/30 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {entry.description || selectedSlice?.name || "Lançamento"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(entry.date)} · {entry.scope === "empresa" ? "Empresa" : "Pessoal"}
                    </p>
                  </div>
                  <strong
                    className={cn(
                      "shrink-0 text-sm tabular-nums",
                      isExpense ? "text-destructive" : "text-primary",
                    )}
                  >
                    {formatCents(value)}
                  </strong>
                </div>
                <span
                  className={cn(
                    "mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium",
                    isExpense ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
                  )}
                >
                  {origin}
                </span>
              </div>
            ))}

            {selectedMovements.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma {isExpense ? "despesa" : "entrada"} encontrada nesta categoria.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
