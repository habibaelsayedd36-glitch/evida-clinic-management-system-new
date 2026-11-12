"use client";

import { useEffect, useState } from "react";
import { api, currency } from "@/lib/client";
import { Button, Card, SectionHeader, Badge } from "@/components/ui";

type Offer = {
  id: string; title: string; category: string; description: string | null;
  protocolDetails: string | null; price: number | null; originalPrice: number | null;
  packageSize: string | null; validUntil: string | null; active: boolean;
};
type FormState = {
  title: string; category: string; description: string; protocolDetails: string;
  price: string; originalPrice: string; packageSize: string; validUntil: string; active: boolean;
};
const blank: FormState = { title:"", category:"service", description:"", protocolDetails:"", price:"", originalPrice:"", packageSize:"", validUntil:"", active:true };
const inputClass = "w-full rounded-xl border border-ink/12 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-iris-400";
const labelClass = "mb-1.5 block text-xs font-semibold text-ink/65";

export function OffersManager() {
  const [items,setItems] = useState<Offer[]>([]);
  const [form,setForm] = useState<FormState>(blank);
  const [editing,setEditing] = useState<string | null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setItems(await api("GET","/api/offers") as Offer[]); }
    catch(e) { setError(e instanceof Error ? e.message : "Could not load the catalogue"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function edit(item: Offer) {
    setEditing(item.id);
    setForm({ title:item.title, category:item.category, description:item.description ?? "", protocolDetails:item.protocolDetails ?? "", price:item.price == null ? "" : String(item.price), originalPrice:item.originalPrice == null ? "" : String(item.originalPrice), packageSize:item.packageSize ?? "", validUntil:item.validUntil ? String(item.validUntil).slice(0,10) : "", active:item.active });
    setNotice(""); setError("");
    window.scrollTo({ top:0, behavior:"smooth" });
  }
  function reset() { setEditing(null); setForm(blank); setError(""); }
  async function save() {
    if (!form.title.trim()) { setError("Enter a service or offer name."); return; }
    setLoading(true); setError(""); setNotice("");
    try {
      const payload = { ...form, price:form.price, originalPrice:form.originalPrice, validUntil:form.validUntil || null };
      await api(editing ? "PATCH" : "POST", editing ? `/api/offers/${editing}` : "/api/offers", payload);
      setNotice(editing ? "Offer updated." : "New service or offer added.");
      reset(); await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Could not save changes"); }
    finally { setLoading(false); }
  }
  async function remove(item: Offer) {
    if (!window.confirm(`Delete "${item.title}" from the catalogue?`)) return;
    setLoading(true);
    try { await api("DELETE",`/api/offers/${item.id}`); await load(); setNotice("Item deleted."); }
    catch(e) { setError(e instanceof Error ? e.message : "Could not delete item"); }
    finally { setLoading(false); }
  }
  const set = (key: keyof FormState, value: string | boolean) => setForm(p => ({...p,[key]:value}));

  return <div className="space-y-4">
    <Card>
      <SectionHeader title={editing ? "Edit service or offer" : "Add a service or offer"} subtitle="Manage catalogue details, protocol information, EGP pricing and promotional deadlines" />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <label><span className={labelClass}>Name</span><input className={inputClass} value={form.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Normal Diet" /></label>
        <label><span className={labelClass}>Type</span><select className={inputClass} value={form.category} onChange={e=>set("category",e.target.value)}><option value="service">Service</option><option value="package">Package</option><option value="offer">Promotional offer</option><option value="protocol">Treatment protocol</option></select></label>
        <label className="sm:col-span-2"><span className={labelClass}>Short description</span><textarea className={inputClass} rows={3} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="What is included in this service or package?" /></label>
        <label className="sm:col-span-2"><span className={labelClass}>Full details / protocol information</span><textarea className={inputClass} rows={7} value={form.protocolDetails} onChange={e=>set("protocolDetails",e.target.value)} placeholder="Assessment, included services, follow-up details, eligibility and clinician-approved information…" /></label>
        <label><span className={labelClass}>Promotional price (EGP)</span><input className={inputClass} type="number" min="0" value={form.price} onChange={e=>set("price",e.target.value)} /></label>
        <label><span className={labelClass}>Original price (EGP)</span><input className={inputClass} type="number" min="0" value={form.originalPrice} onChange={e=>set("originalPrice",e.target.value)} /></label>
        <label><span className={labelClass}>Package size / units (optional)</span><input className={inputClass} value={form.packageSize} onChange={e=>set("packageSize",e.target.value)} placeholder="e.g. Full package — 500 units" /></label>
        <label><span className={labelClass}>Offer deadline</span><input className={inputClass} type="date" value={form.validUntil} onChange={e=>set("validUntil",e.target.value)} /></label>
        <label className="flex items-center gap-2 text-sm text-ink/70 sm:col-span-2"><input type="checkbox" checked={form.active} onChange={e=>set("active",e.target.checked)} /> Active and visible in the catalogue</label>
        {error ? <p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="sm:col-span-2 rounded-lg bg-moss-50 p-3 text-sm text-moss-700">{notice}</p> : null}
        <div className="flex gap-2 sm:col-span-2"><Button onClick={save} loading={loading} type="button">{editing ? "Save changes" : "Add to catalogue"}</Button>{editing ? <Button variant="ghost" onClick={reset} type="button">Cancel</Button> : null}</div>
      </div>
    </Card>
    <Card>
      <SectionHeader title={`Services & offers (${items.length})`} subtitle="Edit prices and deadlines or deactivate items without deleting them" />
      {loading && items.length===0 ? <p className="p-5 text-sm text-ink/50">Loading catalogue…</p> : items.length===0 ? <p className="p-5 text-sm text-ink/50">No services or offers yet. Add the first one above.</p> : <div className="divide-y divide-ink/8">
        {items.map(item=><div key={item.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-ink">{item.title}</p><Badge tone={item.active ? "pine" : "neutral"}>{item.active ? "Active" : "Inactive"}</Badge><Badge>{item.category}</Badge></div>
            {item.description ? <p className="mt-1 text-sm text-ink/60">{item.description}</p> : null}
            <p className="mt-2 text-sm font-semibold text-iris-700">{item.price == null ? "Price not set" : currency(item.price)} {item.originalPrice != null ? <span className="ms-2 text-xs font-normal text-ink/40 line-through">{currency(item.originalPrice)}</span> : null}</p>
            {item.packageSize ? <p className="mt-1 text-xs text-ink/50">{item.packageSize}</p> : null}
            {item.validUntil ? <p className="mt-1 text-xs text-ink/50">Valid until: {String(item.validUntil).slice(0,10)}</p> : null}
            {item.protocolDetails ? <details className="mt-2 text-xs text-ink/60"><summary className="cursor-pointer font-semibold text-iris-700">View full protocol details</summary><p className="mt-2 whitespace-pre-wrap leading-5">{item.protocolDetails}</p></details> : null}
          </div>
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>edit(item)} type="button">Edit</Button><Button size="sm" variant="ghost" onClick={()=>void remove(item)} type="button">Delete</Button></div>
        </div>)}
      </div>}
    </Card>
  </div>;
}
