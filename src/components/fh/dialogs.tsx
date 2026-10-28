import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "./CurrencyInput";
import { IconPicker, SelectedIcon, SelectedIconSmall } from "./IconPicker";
import { formatCents, formatDate, MONTHS, todayISO } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { Category, Entry, Scope } from "@/lib/types";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

interface BaseProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CategorySelect({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (v: string) => void;
  categories: Category[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-12 rounded-2xl bg-secondary/60">
        <SelectValue placeholder="Selecione a categoria" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              <SelectedIconSmall name={c.icon} />
              {c.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* --------------------------- Renda --------------------------- */

export function IncomeDialog({ open, onOpenChange, scope }: BaseProps & { scope: Scope }) {
  const { categories, addIncome } = useStore();
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());

  const save = () => {
    if (!amount || !categoryId) {
      toast.error("Informe valor e categoria");
      return;
    }
    addIncome({ scope, categoryId, description, amount, date });
    toast.success("Renda cadastrada");
    setAmount(0);
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <ArrowUpRight className="size-4" />
              </span>
              Nova renda
            </span>
          </DialogTitle>
          <DialogDescription>{scope === "empresa" ? "Empresa" : "Pessoal"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Valor">
            <CurrencyInput value={amount} onChange={setAmount} autoFocus />
          </Field>
          <Field label="Categoria">
            <CategorySelect value={categoryId} onChange={setCategoryId} categories={categories} />
          </Field>
          <Field label="Descrição (opcional)">
            <Input
              className="h-12 rounded-2xl bg-secondary/60"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Data">
            <Input
              type="date"
              className="h-12 rounded-2xl bg-secondary/60"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button className="h-12 w-full rounded-2xl text-base" onClick={save}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Despesa --------------------------- */

export function ExpenseDialog({ open, onOpenChange, scope }: BaseProps & { scope: Scope }) {
  const { categories, addExpense } = useStore();
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [installments, setInstallments] = useState<number | null>(null);
  const [fixed, setFixed] = useState(false);
  const [paidUpfront, setPaidUpfront] = useState(false);
  const [dueDate, setDueDate] = useState(todayISO());

  const save = () => {
    if (!amount || !categoryId) {
      toast.error("Informe valor e categoria");
      return;
    }
    addExpense({
      scope,
      categoryId,
      description,
      amount,
      installments: fixed || paidUpfront ? 1 : (installments ?? 1),
      fixed,
      paidUpfront,
      dueDate,
    });
    toast.success(
      paidUpfront
        ? "Despesa à vista registrada como paga"
        : fixed
          ? "Despesa fixa criada do mês selecionado até dezembro"
          : (installments ?? 1) > 1
            ? `${installments} parcelas criadas`
            : "Despesa cadastrada",
    );
    setAmount(0);
    setDescription("");
    setInstallments(null);
    setFixed(false);
    setPaidUpfront(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                <ArrowDownRight className="size-4" />
              </span>
              Nova despesa
            </span>
          </DialogTitle>
          <DialogDescription>{scope === "empresa" ? "Empresa" : "Pessoal"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field
            label={fixed ? "Valor mensal" : (installments ?? 1) > 1 ? "Valor da parcela" : "Valor"}
          >
            <CurrencyInput value={amount} onChange={setAmount} autoFocus />
          </Field>
          <Field label="Categoria">
            <CategorySelect value={categoryId} onChange={setCategoryId} categories={categories} />
          </Field>
          <Field label="Descrição (opcional)">
            <Input
              className="h-12 rounded-2xl bg-secondary/60"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Número de parcelas">
            <Input
              type="number"
              min={1}
              max={120}
              disabled={fixed || paidUpfront}
              placeholder="Ex.: 12"
              className="h-12 rounded-2xl bg-secondary/60"
              value={installments ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setInstallments(null);
                  return;
                }
                const n = Number(val);
                setInstallments(Number.isFinite(n) && n > 0 ? Math.round(n) : null);
              }}
            />
            {!fixed && !paidUpfront && (installments ?? 1) > 1 && amount > 0 && (
              <p className="text-xs text-destructive">
                {installments}x de {formatCents(amount)} · Total:{" "}
                {formatCents(amount * installments!)}
              </p>
            )}
          </Field>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
            <Checkbox
              checked={fixed}
              disabled={paidUpfront}
              onCheckedChange={(v) => {
                const checked = Boolean(v);
                setFixed(checked);
                if (checked) {
                  setPaidUpfront(false);
                  setInstallments(null);
                }
              }}
            />
            <span className="text-sm">
              Despesa fixa
              <span className="block text-xs text-muted-foreground">
                Repete em todos os meses do ano
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
            <Checkbox
              checked={paidUpfront}
              disabled={fixed}
              onCheckedChange={(v) => {
                const checked = Boolean(v);
                setPaidUpfront(checked);
                if (checked) {
                  setFixed(false);
                  setInstallments(null);
                }
              }}
            />
            <span className="text-sm">
              Pago à vista
              <span className="block text-xs text-muted-foreground">
                Registra como despesa já paga, sem adicionar renda
              </span>
            </span>
          </label>
          <Field label="Data de vencimento">
            <Input
              type="date"
              className="h-12 rounded-2xl bg-secondary/60"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            className="h-12 w-full rounded-2xl text-base"
            onClick={save}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Reserva --------------------------- */

export function ReserveDepositDialog({ open, onOpenChange }: BaseProps) {
  const { reserveDeposit } = useStore();
  const [amount, setAmount] = useState(0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Adicionar à reserva</DialogTitle>
        </DialogHeader>
        <Field label="Valor">
          <CurrencyInput value={amount} onChange={setAmount} autoFocus />
        </Field>
        <DialogFooter>
          <Button
            className="h-12 w-full rounded-2xl"
            onClick={() => {
              if (!amount) {
                toast.error("Informe o valor");
                return;
              }
              reserveDeposit(amount);
              toast.success("Reserva atualizada");
              setAmount(0);
              onOpenChange(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReserveWithdrawDialog({ open, onOpenChange }: BaseProps) {
  const { reserveWithdraw, reserve } = useStore();
  const [amount, setAmount] = useState(0);
  const [destination, setDestination] = useState("");
  const [scope, setScope] = useState<Scope>("pessoal");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                <Minus className="size-4" />
              </span>
              Retirar da reserva
            </span>
          </DialogTitle>
          <DialogDescription>
            Disponível: {formatCents(reserve)} — gera uma despesa com o destino informado, sem
            alterar o saldo principal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Valor">
            <CurrencyInput value={amount} onChange={setAmount} autoFocus />
          </Field>
          <Field label="Destino">
            <Input
              className="h-12 rounded-2xl bg-secondary/60"
              placeholder="Ex.: conserto do carro"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </Field>
          <Field label="Lançar em">
            <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <SelectTrigger className="h-12 rounded-2xl bg-secondary/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pessoal">Pessoal</SelectItem>
                <SelectItem value="empresa">Empresa</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            className="h-12 w-full rounded-2xl"
            onClick={() => {
              if (!amount || !destination.trim()) {
                toast.error("Informe valor e destino");
                return;
              }
              reserveWithdraw(amount, destination.trim(), scope);
              toast.success("Retirada registrada");
              setAmount(0);
              setDestination("");
              onOpenChange(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Categorias --------------------------- */

export function CategoriesDialog({ open, onOpenChange }: BaseProps) {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Tag");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("Tag");

  const submit = () => {
    if (!name.trim()) return;
    addCategory(name.trim(), icon);
    toast.success("Categoria criada");
    setName("");
    setIcon("Tag");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>Categorias</DialogTitle>
          <DialogDescription>Usadas em rendas, despesas, filtros e relatórios.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <SelectedIcon name={icon} />
              </span>
              <Input
                autoFocus
                className="h-12 rounded-2xl bg-secondary/60 pl-10 pr-4"
                placeholder="Nova categoria"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
            </div>
            <Button
              type="button"
              size="icon"
              aria-label="Adicionar categoria"
              className="size-12 shrink-0 rounded-2xl"
              onClick={submit}
            >
              <Plus />
            </Button>
          </div>
          <IconPicker value={icon} onChange={setIcon} />
          <p className="px-1 text-xs text-muted-foreground">
            Escolha o desenho que melhor representa a nova categoria.
          </p>
        </div>
        <div className="space-y-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="space-y-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-xl"
                  style={{ backgroundColor: `${c.color}22`, color: c.color }}
                >
                  <SelectedIcon name={c.icon} />
                </span>
                {editing === c.id ? (
                  <Input
                    className="h-9 flex-1 rounded-xl"
                    value={editName}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => {
                      if (editName.trim()) updateCategory(c.id, { name: editName.trim() });
                    }}
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                )}
                <button
                  className="text-muted-foreground transition-colors hover:text-primary"
                  onClick={() => {
                    if (editing === c.id) {
                      setEditing(null);
                      return;
                    }
                    setEditing(c.id);
                    setEditName(c.name);
                    setEditIcon(c.icon ?? "Tag");
                  }}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => {
                    deleteCategory(c.id);
                    toast.success("Categoria excluída");
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {editing === c.id && (
                <IconPicker
                  value={editIcon}
                  onChange={(i) => {
                    setEditIcon(i);
                    updateCategory(c.id, { icon: i });
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Relatórios --------------------------- */

export function ReportDialog({
  open,
  onOpenChange,
  kind,
  scope,
  onGenerate,
}: BaseProps & {
  kind: "monthly" | "annual";
  scope: Scope;
  onGenerate: (value: string) => void;
}) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(now.getFullYear()));
  const years = Array.from({ length: 7 }, (_, i) => String(now.getFullYear() - 3 + i));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>{kind === "monthly" ? "Relatório mensal" : "Relatório anual"}</DialogTitle>
          <DialogDescription>
            {scope === "empresa" ? "Empresa" : "Pessoal"} • exportação em PDF
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {kind === "monthly" && (
            <Field label="Mês">
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-12 rounded-2xl bg-secondary/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1).padStart(2, "0")}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Ano">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-12 rounded-2xl bg-secondary/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button
            className="h-12 w-full rounded-2xl"
            onClick={() => {
              onGenerate(kind === "monthly" ? `${year}-${month}` : year);
              onOpenChange(false);
            }}
          >
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Edição / Detalhe / Pagamentos --------------------------- */

export function EditEntryDialog({
  open,
  onOpenChange,
  entry,
}: BaseProps & { entry: Entry | null }) {
  const { categories, entries, updateEntry, deleteEntry, deleteGroup } = useStore();
  const [draft, setDraft] = useState<Entry | null>(entry);

  if (draft?.id !== entry?.id) setDraft(entry);
  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>Editar lançamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Valor">
            <CurrencyInput
              value={draft.amount}
              onChange={(v) =>
                setDraft({ ...draft, amount: v, paid: draft.type === "income" ? v : draft.paid })
              }
            />
          </Field>
          {draft.type !== "income" && (
            <Field label="Valor já pago">
              <CurrencyInput value={draft.paid} onChange={(v) => setDraft({ ...draft, paid: v })} />
            </Field>
          )}
          <Field label="Categoria">
            <CategorySelect
              value={draft.categoryId}
              onChange={(v) => setDraft({ ...draft, categoryId: v })}
              categories={categories}
            />
          </Field>
          <Field label="Descrição">
            <Input
              className="h-12 rounded-2xl bg-secondary/60"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>
          <Field label="Vencimento">
            <Input
              type="date"
              className="h-12 rounded-2xl bg-secondary/60"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </Field>
          <Field label="Painel">
            <Select
              value={draft.scope}
              onValueChange={(v) => setDraft({ ...draft, scope: v as Scope })}
            >
              <SelectTrigger className="h-12 rounded-2xl bg-secondary/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="empresa">Empresa</SelectItem>
                <SelectItem value="pessoal">Pessoal</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter className="flex-row gap-2">
          <Button
            variant="ghost"
            className="h-12 rounded-2xl text-destructive"
            onClick={() => {
              const groupIds = draft.groupId
                ? entries.filter((e) => e.groupId === draft.groupId).map((e) => e.id)
                : [];
              if (groupIds.length > 0) {
                deleteGroup(groupIds);
                toast.success(`${groupIds.length} lançamentos excluídos`);
              } else {
                deleteEntry(draft.id);
                toast.success("Lançamento excluído");
              }
              onOpenChange(false);
            }}
          >
            <Trash2 />
          </Button>
          <Button
            className="h-12 flex-1 rounded-2xl"
            onClick={() => {
              updateEntry(draft.id, draft);
              toast.success("Lançamento atualizado");
              onOpenChange(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DetailDialog({
  open,
  onOpenChange,
  category,
  scope,
  entries,
  onEdit,
}: BaseProps & {
  category: Category | null;
  scope: Scope;
  entries: Entry[];
  onEdit?: (entry: Entry) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  useEffect(() => {
    if (!open) setExpandedGroups([]);
  }, [open]);
  const total = entries.reduce((acc, e) => acc + e.amount, 0);
  const paid = entries.reduce((acc, e) => acc + e.paid, 0);
  const pending = total - paid;
  const color = category?.color ?? "#34d399";

  const scopes = [...new Set(entries.map((e) => e.scope))];
  const scopeLabel =
    scopes.length > 1
      ? "Empresa e Pessoal"
      : scopes.length === 1
        ? scopes[0] === "pessoal"
          ? "Pessoal"
          : "Empresa"
        : scope === "pessoal"
          ? "Pessoal"
          : "Empresa";

  const parcelInfo = entries.find((e) => e.installmentCount)
    ? `${entries.find((e) => e.installmentCount)!.installmentCount}x`
    : entries.some((e) => e.fixed)
      ? "Despesa fixa"
      : null;

  const labelOf = (e: Entry) => {
    const installmentLabel = e.installmentCount
      ? `Parcela ${e.installmentIndex}/${e.installmentCount}`
      : null;
    if (e.description && installmentLabel) return `${e.description} · ${installmentLabel}`;
    return e.description || installmentLabel || "Lançamento";
  };

  const statusOf = (e: Entry): "Pago" | "Parcial" | "Em aberto" =>
    e.paid >= e.amount ? "Pago" : e.paid > 0 ? "Parcial" : "Em aberto";

  const paymentInfo = (e: Entry) => {
    if (!e.paidAt) return `Vencimento ${formatDate(e.date)}`;
    const client = e.paymentPayer === "client" && e.clientName ? ` • Cliente: ${e.clientName}` : "";
    return `Pago em ${formatDate(e.paidAt)}${client}`;
  };

  const compactGroups = new Map<string, Entry[]>();
  const standaloneEntries: Entry[] = [];
  for (const entry of entries) {
    if ((entry.installmentCount || entry.fixed) && entry.groupId) {
      const group = compactGroups.get(entry.groupId);
      if (group) group.push(entry);
      else compactGroups.set(entry.groupId, [entry]);
    } else {
      standaloneEntries.push(entry);
    }
  }
  for (const [groupId, group] of compactGroups) {
    if (group.length === 1) {
      standaloneEntries.push(group[0]!);
      compactGroups.delete(groupId);
    }
  }

  const EditButton = ({ entry }: { entry: Entry }) => (
    <button
      type="button"
      onClick={() => onEdit?.(entry)}
      aria-label="Editar lançamento"
      title="Editar lançamento"
      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
    >
      <Pencil className="size-4" />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2.5">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl"
                style={{ backgroundColor: `${color}22`, color }}
              >
                <SelectedIcon name={category?.icon} />
              </span>
              {category?.name ?? "Sem categoria"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {scopeLabel} • {entries.length} lançamento(s)
            {parcelInfo && (
              <>
                {" "}
                • <span className="font-semibold text-foreground">{parcelInfo}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Resumo da categoria */}
        <div className="grid grid-cols-3 gap-2">
          <DetailSummary label="Total" value={formatCents(total)} tone="negative" />
          <DetailSummary label="Pago" value={formatCents(paid)} tone="positive" />
          <DetailSummary
            label="Pendente"
            value={formatCents(pending)}
            tone={pending > 0 ? "negative" : "positive"}
          />
        </div>

        {entries.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lançamento nesta categoria.
          </p>
        )}

        <div className="space-y-2">
          {[...compactGroups.entries()].map(([groupId, rawGroup]) => {
            const groupEntries = [...rawGroup].sort(
              (a, b) =>
                (a.installmentIndex ?? 0) - (b.installmentIndex ?? 0) ||
                a.date.localeCompare(b.date),
            );
            const first = groupEntries[0]!;
            const isFixed = first.fixed;
            const itemCount = first.installmentCount ?? groupEntries.length;
            const groupTotal = groupEntries.reduce((acc, entry) => acc + entry.amount, 0);
            const groupPaid = groupEntries.reduce((acc, entry) => acc + entry.paid, 0);
            const groupPending = Math.max(0, groupTotal - groupPaid);
            const paidCount = groupEntries.filter((entry) => entry.paid >= entry.amount).length;
            const nextEntry = groupEntries.find((entry) => entry.paid < entry.amount);
            const progress = itemCount > 0 ? (paidCount / itemCount) * 100 : 0;
            const expanded = expandedGroups.includes(groupId);
            const description = first.description || category?.name || "Compra parcelada";

            return (
              <div
                key={groupId}
                className="overflow-hidden rounded-2xl border border-border bg-secondary/40"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-semibold">{description}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isFixed
                          ? `Despesa fixa · ${formatCents(first.amount)} por mês`
                          : `${itemCount}x de ${formatCents(first.amount)}`}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      {paidCount === itemCount
                        ? "Quitado"
                        : isFixed
                          ? "Fixa"
                          : `${paidCount}/${itemCount}`}
                    </span>
                  </div>

                  <div className="mt-4">
                    <Progress value={progress} className="h-2 bg-border" />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs">
                      <span className="font-medium text-foreground">
                        {paidCount} / {itemCount} {isFixed ? "meses pagos" : "parcelas pagas"}
                      </span>
                      <span className="text-muted-foreground">
                        {nextEntry
                          ? `Próximo vencimento: ${formatDate(nextEntry.date)}`
                          : isFixed
                            ? "Todos os meses foram pagos"
                            : "Todas as parcelas foram pagas"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <DetailSummary label="Pago" value={formatCents(groupPaid)} tone="positive" />
                    <DetailSummary
                      label="Pendente"
                      value={formatCents(groupPending)}
                      tone={groupPending > 0 ? "negative" : "positive"}
                    />
                  </div>

                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedGroups((current) =>
                        current.includes(groupId)
                          ? current.filter((id) => id !== groupId)
                          : [...current, groupId],
                      )
                    }
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform duration-200",
                        expanded && "rotate-180",
                      )}
                    />
                    {expanded
                      ? isFixed
                        ? "Ocultar meses"
                        : "Ocultar parcelas"
                      : isFixed
                        ? "Ver meses"
                        : "Ver parcelas"}
                  </button>
                </div>

                {expanded && (
                  <div className="border-t border-border bg-background/35 px-3 py-2 sm:px-4">
                    {groupEntries.map((entry) => {
                      const status = statusOf(entry);
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0"
                        >
                          <span className="w-20 shrink-0 text-sm font-semibold tabular-nums">
                            {isFixed
                              ? MONTHS[Number(entry.date.slice(5, 7)) - 1]
                              : `${entry.installmentIndex}/${entry.installmentCount}`}
                          </span>
                          <span className="min-w-0 flex-1 text-xs text-muted-foreground sm:text-sm">
                            {paymentInfo(entry)}
                          </span>
                          <span className="hidden text-sm font-medium tabular-nums sm:block">
                            {formatCents(entry.amount)}
                          </span>
                          <DetailStatus status={status} />
                          <EditButton entry={entry} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {standaloneEntries.map((e) => {
            const status = statusOf(e);
            return (
              <div
                key={e.id}
                className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-3"
              >
                {/* Mobile */}
                <div className="sm:hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {e.description ||
                        (e.installmentCount
                          ? `Parcela ${e.installmentIndex}/${e.installmentCount}`
                          : "Lançamento")}
                    </span>
                    <span className="flex items-center gap-2">
                      <DetailStatus status={status} />
                      <EditButton entry={e} />
                    </span>
                  </div>
                  {e.installmentCount && e.description && (
                    <p className="mt-1 text-xs font-semibold text-primary">
                      Parcela {e.installmentIndex} de {e.installmentCount}
                    </p>
                  )}
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {paymentInfo(e)}
                    </span>
                    <span className="font-display text-sm font-semibold tabular-nums text-foreground">
                      {formatCents(e.amount)}
                    </span>
                  </div>
                </div>
                {/* Desktop */}
                <span className="hidden text-sm tabular-nums sm:block">{formatDate(e.date)}</span>
                <span className="hidden truncate text-sm sm:block">{labelOf(e)}</span>
                <span className="hidden text-sm tabular-nums sm:block">
                  {e.paidAt ? paymentInfo(e) : "—"}
                </span>
                <span className="hidden text-right font-display text-sm font-semibold tabular-nums sm:block">
                  {formatCents(e.amount)}
                </span>
                <span className="hidden justify-self-end sm:block">
                  <DetailStatus status={status} />
                </span>
                <span className="hidden justify-self-end sm:block">
                  <EditButton entry={e} />
                </span>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailSummary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-secondary/40 px-2 py-3 sm:px-3">
      <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 whitespace-nowrap font-display text-xs font-bold tabular-nums sm:text-base",
          tone === "positive" && "text-primary",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DetailStatus({ status }: { status: "Pago" | "Parcial" | "Em aberto" }) {
  const styles =
    status === "Pago"
      ? "bg-primary/15 text-primary"
      : status === "Parcial"
        ? "bg-warning/15 text-warning"
        : "bg-destructive/15 text-destructive";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        styles,
      )}
    >
      {status}
    </span>
  );
}

export function PaidConfirmation({ detail }: { detail?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="grid size-16 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Check className="size-8" strokeWidth={3} />
      </span>
      <p className="font-display text-2xl font-bold tracking-tight">PAGO</p>
      {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
    </div>
  );
}

export function PartialPaymentDialog({
  open,
  onOpenChange,
  entry,
}: BaseProps & { entry: Entry | null }) {
  const { payPartial } = useStore();
  const [amount, setAmount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setDone(false);
      setAmount(0);
    }
  }, [open]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => onOpenChange(false), 1400);
    return () => clearTimeout(t);
  }, [done, onOpenChange]);

  if (!entry) return null;
  const remaining = entry.amount - entry.paid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        {done ? (
          <PaidConfirmation detail={`${formatCents(amount)} aplicados neste lançamento.`} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Pagamento parcial</DialogTitle>
              <DialogDescription>
                Restam {formatCents(remaining)} — vencimento {formatDate(entry.date)}
              </DialogDescription>
            </DialogHeader>
            <Field label="Valor">
              <CurrencyInput value={amount} onChange={setAmount} autoFocus />
            </Field>
            <DialogFooter>
              <Button
                variant="destructive"
                className="h-12 w-full rounded-2xl"
                onClick={() => {
                  if (!amount) {
                    toast.error("Informe o valor");
                    return;
                  }
                  payPartial(entry.id, amount);
                  toast.success("Pagamento registrado");
                  setDone(true);
                }}
              >
                <Check className="size-4" /> Pagar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
