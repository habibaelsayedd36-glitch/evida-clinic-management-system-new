"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Badge, Button, Card, EmptyState, SectionHeader } from "@/components/ui";
import { Clock3, ListChecks, MessageCircle, Users } from "lucide-react";

type Entry = { id: number; fullName: string; phone: string | null; service: string | null; notes: string | null; status: string; createdAt: string };

const statusLabel: Record<string, string> = { waiting: "Waiting", contacted: "Contacted", booked: "Booked", closed: "Closed" };

export function WaitlistManager() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try { const result = await api<{ entries: Entry[] }>("GET", "/api/waitlist"); setEntries(result.entries ?? []); setError(""); }
    catch { setError("Could not load the waiting list."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function addEntry(event: React.FormEvent) {
    event.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true); setError("");
    try {
      await api("POST", "/api/waitlist", { fullName, phone, service, notes });
      setFullName(""); setPhone(""); setService(""); setNotes("");
      await load();
    } catch { setError("Could not add this entry. Please try again."); }
    finally { setSaving(false); }
  }

  async function updateStatus(entry: Entry, status: string) {
    try { await api("PATCH", `/api/waitlist/${entry.id}`, { status }); await load(); }
    catch { setError("Could not update the entry."); }
  }

  async function removeEntry(entry: Entry) {
    if (!window.confirm(`Remove ${entry.fullName} from the waiting list?`)) return;
    try { await api("DELETE", `/api/waitlist/${entry.id}`); await load(); }
    catch { setError("Could not remove the entry."); }
  }

  const waiting = entries.filter((entry) => entry.status === "waiting").length;
  const phoneDigits = (value: string) => { let digits = value.replace(/\D/g, ""); if (digits.startsWith("0")) digits = "20" + digits.slice(1); return digits; };

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <Card><div className="flex items-center gap-3"><Users className="h-5 w-5 text-iris-500" /><div><p className="text-xs text-ink/50">Total entries</p><p className="num text-2xl font-semibold">{entries.length}</p></div></div></Card>
      <Card><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-clay-600" /><div><p className="text-xs text-ink/50">Waiting</p><p className="num text-2xl font-semibold">{waiting}</p></div></div></Card>
      <Card><div className="flex items-center gap-3"><ListChecks className="h-5 w-5 text-moss-600" /><div><p className="text-xs text-ink/50">Booked</p><p className="num text-2xl font-semibold">{entries.filter((entry) => entry.status === "booked").length}</p></div></div></Card>
    </div>
    <Card>
      <SectionHeader title="Add to waiting list" subtitle="Record a client who wants an earlier or currently unavailable appointment" />
      <form onSubmit={addEntry} className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium text-ink/65">Client name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-xl border border-ink/10 px-3 py-2.5 text-sm outline-none focus:border-iris-400" /></label>
        <label className="space-y-1 text-xs font-medium text-ink/65">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-xl border border-ink/10 px-3 py-2.5 text-sm outline-none focus:border-iris-400" /></label>
        <label className="space-y-1 text-xs font-medium text-ink/65">Requested service<input value={service} onChange={(event) => setService(event.target.value)} placeholder="Nutrition / Dermatology..." className="w-full rounded-xl border border-ink/10 px-3 py-2.5 text-sm outline-none focus:border-iris-400" /></label>
        <label className="space-y-1 text-xs font-medium text-ink/65">Notes<input value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-xl border border-ink/10 px-3 py-2.5 text-sm outline-none focus:border-iris-400" /></label>
        <div className="sm:col-span-2 flex items-center justify-between gap-3"><p className="text-[11px] text-ink/45">Only clinic administrators can view this list.</p><Button type="submit" loading={saving} disabled={saving || !fullName.trim()}>Add to list</Button></div>
      </form>
      {error ? <p className="px-5 pb-4 text-xs text-berry-600">{error}</p> : null}
    </Card>
    <Card>
      <SectionHeader title="Waiting list" subtitle="Update each entry as the clinic team contacts the client" />
      {loading ? <p className="px-5 py-6 text-sm text-ink/50">Loading…</p> : entries.length === 0 ? <EmptyState title="No waiting list entries" hint="New requests will appear here." /> : <div className="divide-y divide-ink/6">
        {entries.map((entry) => {
          const wa = entry.phone ? `https://wa.me/${phoneDigits(entry.phone)}?text=${encodeURIComponent(`Hello ${entry.fullName}, this is EVIDA Clinic. A slot may be available for your requested service. Would you like us to arrange it?`)}` : null;
          return <div key={entry.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-ink">{entry.fullName}</p><Badge tone={entry.status === "booked" ? "pine" : entry.status === "waiting" ? "clay" : "neutral"}>{statusLabel[entry.status] ?? entry.status}</Badge></div><p className="mt-1 text-xs text-ink/55">{entry.phone ?? "No phone"} · {entry.service ?? "Service not specified"}</p>{entry.notes ? <p className="mt-1 text-xs text-ink/45">{entry.notes}</p> : null}</div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={entry.status} onChange={(event) => void updateStatus(entry, event.target.value)} className="rounded-lg border border-ink/10 bg-white px-2 py-2 text-xs"><option value="waiting">Waiting</option><option value="contacted">Contacted</option><option value="booked">Booked</option><option value="closed">Closed</option></select>
              {wa ? <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#25D366] px-3 text-xs font-semibold text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</a> : null}
              <Button size="sm" variant="ghost" onClick={() => void removeEntry(entry)} type="button">Remove</Button>
            </div>
          </div>;
        })}
      </div>}
    </Card>
  </div>;
}
