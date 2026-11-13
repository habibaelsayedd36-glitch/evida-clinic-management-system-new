"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Pencil, Wallet } from "lucide-react";
import { api, currency, fmtDate, fmtDateTime } from "@/lib/client";
import type { InvoiceDTO } from "@/lib/types";
import { Badge, Button, Card, EmptyState, SectionHeader } from "@/components/ui";

type Props = {
  invoices: InvoiceDTO[];
  onDone: () => Promise<void> | void;
};

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "instapay", label: "Instapay" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "wallet", label: "Mobile wallet" },
  { value: "other", label: "Other" },
];

export function BillingManager({ invoices, onDone }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [editTotal, setEditTotal] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editMessage, setEditMessage] = useState("");

  const filtered = useMemo(() => invoices.filter((invoice) => {
    const matchesStatus = filter === "all" || invoice.status === filter;
    const matchesQuery = !query || (invoice.clientName ?? "").toLowerCase().includes(query.toLowerCase()) || invoice.invoiceNumber.toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  }), [invoices, filter, query]);

  const selected = invoices.find((invoice) => invoice.id === selectedId) ?? null;

  function openPayment(invoice: InvoiceDTO) {
    setSelectedId(invoice.id);
    setAmount(String(invoice.remainingAmount));
    setPaymentType("full");
    setMethod("cash");
    setReference("");
    setNote("");
    setMessage("");
  }

  async function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value <= 0) {
      setMessage("Enter a valid payment amount in EGP.");
      return;
    }
    if (value > selected.remainingAmount) {
      setMessage("Payment cannot exceed the remaining balance.");
      return;
    }
    if (paymentType === "partial" && value >= selected.remainingAmount) {
      setMessage("For a partial payment, enter an amount lower than the remaining balance. Choose Full payment to settle it.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await api("POST", "/api/invoice-payments", {
        invoiceId: selected.id,
        amount: value,
        method,
        reference: reference.trim() || null,
        note: note.trim() || null,
      });
      setMessage("Payment recorded successfully.");
      setSelectedId(null);
      await onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not record payment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function openEditInvoice(invoice: InvoiceDTO) {
    setEditInvoiceId(invoice.id);
    setEditTotal(String(invoice.totalAmount));
    setEditMessage("");
  }

  async function saveInvoiceEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invoice = invoices.find((item) => item.id === editInvoiceId);
    if (!invoice) return;
    const value = Number(editTotal);
    if (!Number.isSafeInteger(value) || value <= 0) {
      setEditMessage("Enter a valid invoice total in EGP.");
      return;
    }
    if (value < invoice.paidAmount) {
      setEditMessage("Invoice total cannot be lower than the amount already paid.");
      return;
    }
    setEditSaving(true);
    setEditMessage("");
    try {
      await api("PATCH", `/api/invoices/${invoice.id}`, { totalAmount: value });
      setEditInvoiceId(null);
      await onDone();
    } catch (error) {
      setEditMessage(error instanceof Error ? error.message : "Could not update invoice.");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader
          title={`Invoices & payments (${invoices.length})`}
          subtitle="Record client payments and track outstanding balances"
          icon={<Wallet className="h-4 w-4" />}
        />
        <div className="flex flex-wrap gap-2 border-b border-ink/8 px-5 py-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search client or invoice number…"
            aria-label="Search invoices"
            className="min-w-[200px] flex-1 rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm outline-none focus:border-iris-400"
          />
          <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter invoice status" className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially paid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="No matching invoices" hint="Invoices are created automatically for eligible appointments." icon={<CreditCard className="h-5 w-5" />} />
        ) : (
          <div className="divide-y divide-ink/8">
            {filtered.map((invoice) => (
              <div key={invoice.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-xs text-ink/60">{invoice.clientName ?? "Client"} · {invoice.appointmentKind ?? "Clinic visit"} · {fmtDate(invoice.createdAt)}</p>
                  </div>
                  <Badge tone={invoice.status === "paid" ? "moss" : invoice.status === "partially_paid" ? "clay" : "berry"}>
                    {invoice.status === "paid" ? "Paid" : invoice.status === "partially_paid" ? "Partially paid" : "Unpaid"}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-sand-100 p-2"><p className="text-[10px] text-ink/50">Total</p><p className="num text-sm font-bold">{currency(invoice.totalAmount)}</p></div>
                  <div className="rounded-xl bg-moss-100/60 p-2"><p className="text-[10px] text-ink/50">Paid</p><p className="num text-sm font-bold">{currency(invoice.paidAmount)}</p></div>
                  <div className="rounded-xl bg-clay-100/60 p-2"><p className="text-[10px] text-ink/50">Remaining</p><p className="num text-sm font-bold">{currency(invoice.remainingAmount)}</p></div>
                </div>
                {invoice.payments.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-ink/8 p-3">
                    <p className="mb-2 text-xs font-semibold text-ink">Payment history</p>
                    <div className="space-y-2">
                      {invoice.payments.map((payment) => (
                        <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-ink/60">{payment.method.replace(/_/g, " ")} · {fmtDateTime(payment.paidAt)}{payment.reference ? ` · Ref: ${payment.reference}` : ""}</span>
                          <strong className="num text-ink">{currency(payment.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditInvoice(invoice)} type="button" icon={<Pencil className="h-3.5 w-3.5" />}>Edit invoice</Button>
                  {invoice.remainingAmount > 0 ? (
                    <Button size="sm" onClick={() => openPayment(invoice)} type="button">Record payment</Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-moss-700"><CheckCircle2 className="h-4 w-4" /> Fully paid</span>
                  )}
                </div>
                {editInvoiceId === invoice.id ? (
                  <form onSubmit={saveInvoiceEdit} className="mt-4 space-y-3 rounded-xl border border-iris-200 bg-iris-50/50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink">Edit invoice total</p>
                      <button type="button" onClick={() => setEditInvoiceId(null)} className="text-xs text-ink/55 hover:text-ink">Cancel</button>
                    </div>
                    <p className="text-xs text-ink/60">Already paid: <strong className="num">{currency(invoice.paidAmount)}</strong>. The new total cannot be lower than this amount.</p>
                    <label className="block text-xs font-medium text-ink/70">Invoice total (EGP)
                      <input type="number" min={Math.max(1, invoice.paidAmount)} step="1" required value={editTotal} onChange={(event) => setEditTotal(event.target.value)} className="mt-1 w-full rounded-lg border border-ink/12 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-iris-400" />
                    </label>
                    {editMessage ? <p role="alert" className="text-xs text-red-700">{editMessage}</p> : null}
                    <div className="flex justify-end">
                      <Button size="sm" type="submit" loading={editSaving} disabled={editSaving}>Save changes</Button>
                    </div>
                  </form>
                ) : null}
                {selectedId === invoice.id ? (
                  <form onSubmit={recordPayment} className="mt-4 space-y-3 rounded-xl border border-iris-200 bg-iris-50/50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink">Record a payment</p>
                      <button type="button" onClick={() => setSelectedId(null)} className="text-xs text-ink/55 hover:text-ink">Cancel</button>
                    </div>
                    <p className="text-xs text-ink/60">Remaining balance: <strong className="num">{currency(invoice.remainingAmount)}</strong></p>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => { setPaymentType("full"); setAmount(String(invoice.remainingAmount)); setMessage(""); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${paymentType === "full" ? "border-iris-500 bg-iris-100 text-iris-800" : "border-ink/12 bg-white text-ink/65"}`}>Full payment</button>
                      <button type="button" onClick={() => { setPaymentType("partial"); setAmount(""); setMessage(""); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${paymentType === "partial" ? "border-iris-500 bg-iris-100 text-iris-800" : "border-ink/12 bg-white text-ink/65"}`}>Partial payment</button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-medium text-ink/70">Amount (EGP)
                        <input type="number" min="1" max={invoice.remainingAmount} step="1" required disabled={paymentType === "full"} value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-ink/12 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-iris-400 disabled:bg-sand-100 disabled:text-ink/55" />
                      </label>
                      <label className="block text-xs font-medium text-ink/70">Payment method
                        <select value={method} onChange={(event) => setMethod(event.target.value)} className="mt-1 w-full rounded-lg border border-ink/12 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-iris-400">
                          {METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="block text-xs font-medium text-ink/70">Reference number (optional)
                      <input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={120} placeholder="Transaction or receipt reference" className="mt-1 w-full rounded-lg border border-ink/12 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-iris-400" />
                    </label>
                    <label className="block text-xs font-medium text-ink/70">Note (optional)
                      <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} placeholder="Additional payment details" className="mt-1 w-full rounded-lg border border-ink/12 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-iris-400" />
                    </label>
                    {message ? <p role="status" className="text-xs text-ink/70">{message}</p> : null}
                    <div className="flex justify-end">
                      <Button size="sm" type="submit" loading={saving} disabled={saving}>Save payment</Button>
                    </div>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
