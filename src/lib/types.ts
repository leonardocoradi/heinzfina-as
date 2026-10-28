export type Scope = "empresa" | "pessoal";
export type EntryType = "income" | "expense";
export type PaymentPayer = "self" | "client";

export interface Category {
  id: string;
  name: string;
  color: string;
  /** nome do ícone Lucide (ver src/lib/icons.ts) */
  icon: string;
}

export interface Entry {
  id: string;
  type: EntryType;
  scope: Scope;
  categoryId: string;
  description: string;
  /** valor da parcela / valor do lançamento, em centavos */
  amount: number;
  /** valor já pago, em centavos */
  paid: number;
  /** ISO yyyy-mm-dd */
  date: string;
  fixed: boolean;
  installmentIndex: number | null;
  installmentCount: number | null;
  /** valor total do parcelamento, em centavos */
  totalAmount: number | null;
  groupId: string | null;
  fromReserve: boolean;
  paidUpfront: boolean;
  /** ISO yyyy-mm-dd da última confirmação de pagamento */
  paidAt: string | null;
  /** Quem confirmou o pagamento da despesa */
  paymentPayer: PaymentPayer | null;
  /** Preenchido quando o pagamento foi feito diretamente por um cliente */
  clientName: string | null;
  createdAt: string;
}

export interface Meta {
  reserve: number;
}

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
