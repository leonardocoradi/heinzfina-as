import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCents, formatDate, MONTHS, monthKey } from "./money";
import type { Category, Entry, Scope } from "./types";

const scopeLabel = (s: Scope) => (s === "empresa" ? "Empresa" : "Pessoal");

function header(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(16, 34, 27);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("Família Heinz", 40, 40);
  doc.setFontSize(12);
  doc.setTextColor(120, 220, 170);
  doc.text(title, 40, 60);
  doc.setTextColor(200, 210, 205);
  doc.setFontSize(10);
  doc.text(subtitle, 40, 76);
  doc.setTextColor(20, 20, 20);
}

export function monthlyReportPdf(
  entries: Entry[],
  categories: Category[],
  scope: Scope,
  month: string,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Sem categoria";
  const [y, m] = month.split("-");
  header(doc, `Relatório Mensal • ${scopeLabel(scope)}`, `${MONTHS[Number(m) - 1]} de ${y}`);

  const rows = entries
    .filter((e) => e.scope === scope && e.type === "expense" && monthKey(e.date) === month)
    .sort((a, b) => a.date.localeCompare(b.date));

  let total = 0;
  let paid = 0;
  const body = rows.map((e) => {
    total += e.amount;
    paid += e.paid;
    const status = e.paid >= e.amount ? "Pago" : e.paid > 0 ? "Parcial" : "A pagar";
    const obs = [
      e.installmentCount ? `Parcela ${e.installmentIndex}/${e.installmentCount}` : "",
      e.fixed ? "Despesa fixa" : "",
      e.fromReserve ? "Retirada da reserva" : "",
      e.paid > 0 && e.paid < e.amount ? `Pago ${formatCents(e.paid)}` : "",
    ]
      .filter(Boolean)
      .join(" • ");
    return [
      formatDate(e.date),
      e.description || "—",
      catName(e.categoryId),
      formatCents(e.amount),
      status,
      e.paidAt ? formatDate(e.paidAt) : "—",
      obs || "—",
    ];
  });

  autoTable(doc, {
    startY: 110,
    head: [["Vencimento", "Descrição", "Categoria", "Valor", "Status", "Pago em", "Observações"]],
    body,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [34, 88, 66], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 248, 246] },
  });

  const endY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  autoTable(doc, {
    startY: endY + 18,
    body: [
      ["Total do mês", formatCents(total)],
      ["Total pago", formatCents(paid)],
      ["Total a pagar", formatCents(total - paid)],
    ],
    styles: { fontSize: 11, cellPadding: 6 },
    columnStyles: { 0: { fontStyle: "bold" } },
    theme: "grid",
  });

  doc.save(`familia-heinz-${scope}-${month}.pdf`);
}

export function annualReportPdf(
  entries: Entry[],
  categories: Category[],
  scope: Scope,
  year: string,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Sem categoria";
  header(doc, `Relatório Anual • ${scopeLabel(scope)}`, `Ano de ${year}`);

  let cursor = 110;
  let grand = 0;

  for (let m = 0; m < 12; m++) {
    const key = `${year}-${String(m + 1).padStart(2, "0")}`;
    const rows = entries.filter(
      (e) => e.scope === scope && e.type === "expense" && monthKey(e.date) === key,
    );
    const byCat = new Map<string, number>();
    for (const e of rows) byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amount);
    const total = [...byCat.values()].reduce((a, b) => a + b, 0);
    grand += total;

    const body = [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => [catName(id), formatCents(v)]);
    if (body.length === 0) body.push(["Sem lançamentos", formatCents(0)]);
    body.push(["Total do mês", formatCents(total)]);

    autoTable(doc, {
      startY: cursor,
      head: [[MONTHS[m] ?? "", "Valor"]],
      body,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [34, 88, 66], textColor: 255 },
      columnStyles: { 1: { halign: "right" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [232, 242, 237];
        }
      },
      margin: { left: 40, right: 40 },
    });
    cursor = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
    if (cursor > 720 && m < 11) {
      doc.addPage();
      cursor = 50;
    }
  }

  autoTable(doc, {
    startY: cursor + 6,
    body: [["Total do ano", formatCents(grand)]],
    styles: { fontSize: 12, cellPadding: 8, fontStyle: "bold" },
    theme: "grid",
  });

  doc.save(`familia-heinz-${scope}-${year}.pdf`);
}
