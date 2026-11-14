"use client";
import { useEffect, useMemo, useState } from "react";
import { Activity, Camera, ClipboardHeart, Flame, HeartPulse, MessageSquareText, Scale, Sparkles, TrendingUp, Utensils } from "lucide-react";
import type { Bootstrap } from "@/lib/types";
import { api } from "@/lib/client";
import { Badge, Button, Card, EmptyState, SectionHeader, StatTile } from "@/components/ui";

type EventRow = { id: number; clientId: string; clientName?: string; kind: string; payload: Record<string, unknown>; createdAt: string };
const CHALLENGES = [
  { id: "water-week", title: "Hydration week", description: "Log your water intake every day this week.", points: 20 },
  { id: "meal-diary", title: "Mindful meal diary", description: "Record at least three meals today.", points: 15 },
  { id: "check-in", title: "Stay connected", description: "Complete your weekly care check-in.", points: 25 },
];
const fieldClass = "w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-iris-400";
const labelClass = "grid gap-1 text-xs font-medium text-ink/65";
function dayKey(value: string) { const d = new Date(value); return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate(); }
function n(value: unknown) { const v = Number(value); return Number.isFinite(v) ? v : 0; }

export function PatientExperienceHub({ data, mode }: { data: Bootstrap; mode: "admin" | "client" }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [photo, setPhoto] = useState("");
  const [weight, setWeight] = useState(data.me.weightKg ? String(data.me.weightKg) : "");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState("breakfast");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [aftercareService, setAftercareService] = useState("Skin treatment");
  const [symptomScore, setSymptomScore] = useState("0");
  const [aftercareNotes, setAftercareNotes] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState("Overall experience");
  const [rating, setRating] = useState("5");
  const [feedback, setFeedback] = useState("");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [goalMode, setGoalMode] = useState("maintain");

  async function load() {
    setLoading(true);
    try { const result = await api<{ events: EventRow[] }>("GET", "/api/patient-experience"); setEvents(result.events ?? []); setError(""); }
    catch { setError("Could not load patient journey data."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function saveEvent(kind: string, payload: Record<string, unknown>) {
    setSaving(true); setError(""); setNotice("");
    try { await api("POST", "/api/patient-experience", { kind, payload }); setNotice("Saved successfully."); await load(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save this entry."); return false; }
    finally { setSaving(false); }
  }

  const myEvents = useMemo(() => events.filter((event) => event.clientId === data.me.id), [events, data.me.id]);
  const today = dayKey(new Date().toISOString());
  const todaysMeals = myEvents.filter((event) => event.kind === "meal" && dayKey(event.createdAt) === today);
  const consumed = todaysMeals.reduce((sum, event) => sum + n(event.payload.calories), 0);
  const macroTotals = todaysMeals.reduce((total, event) => ({ protein: total.protein + n(event.payload.protein), carbs: total.carbs + n(event.payload.carbs), fat: total.fat + n(event.payload.fat) }), { protein: 0, carbs: 0, fat: 0 });
  const activeDiet = data.dietPlans.find((plan) => plan.status === "active");
  const calorieTarget = activeDiet?.dailyCalories ?? null;
  const age = data.me.birthDate ? (() => { const born = new Date(data.me.birthDate as string); const now = new Date(); let years = now.getFullYear() - born.getFullYear(); if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) years--; return years; })() : null;
  const sexOffset = data.me.gender === "male" ? 5 : data.me.gender === "female" ? -161 : null;
  const activityFactor: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 };
  const bmr = age !== null && age >= 18 && data.me.heightCm && data.me.weightKg && sexOffset !== null ? 10 * data.me.weightKg + 6.25 * data.me.heightCm - 5 * age + sexOffset : null;
  const estimatedCalories = bmr === null ? null : Math.max(1200, Math.round(bmr * activityFactor[activityLevel] + (goalMode === "lose" ? -300 : goalMode === "gain" ? 250 : 0)));
  const points = myEvents.filter((event) => event.kind === "challenge").reduce((sum, event) => sum + n(event.payload.points), 0);
  const bodyEntries = myEvents.filter((event) => event.kind === "body_measurement");
  const aftercareEntries = myEvents.filter((event) => event.kind === "aftercare");

  const adminStats = useMemo(() => {
    const past = data.appointments.filter((a) => new Date(a.scheduledAt).getTime() < Date.now());
    const noShows = past.filter((a) => a.status === "no_show").length;
    const risk = data.clients.map((client) => {
      const rows = past.filter((a) => a.clientId === client.id);
      const missed = rows.filter((a) => a.status === "no_show").length;
      const cancelled = rows.filter((a) => a.status === "cancelled").length;
      const count = rows.filter((a) => ["completed", "no_show", "cancelled"].includes(a.status)).length;
      return { client, missed, cancelled, score: count ? Math.round(Math.min(95, missed * 35 + cancelled * 12 + missed / count * 35)) : 0, count };
    }).filter((r) => r.count > 0).sort((a,b) => b.score-a.score).slice(0,8);
    const opportunities: { clientName: string; clientId: string; reason: string; priority: number }[] = [];
    for (const plan of data.plans) {
      if (plan.status === "active" && plan.sessionsTotal > plan.sessionsDone) {
        const upcoming = data.appointments.some((a) => a.clientId === plan.clientId && new Date(a.scheduledAt) >= new Date() && ["scheduled","pending_client","pending_doctor"].includes(a.status));
        if (!upcoming) opportunities.push({ clientName: plan.clientName, clientId: plan.clientId, reason: (plan.sessionsTotal-plan.sessionsDone) + " treatment sessions remain with no upcoming appointment", priority: 2 });
      }
    }
    for (const invoice of data.invoices) if (invoice.remainingAmount > 0) opportunities.push({ clientName: invoice.clientName || "Client", clientId: invoice.clientId, reason: "Invoice " + invoice.invoiceNumber + " has EGP " + invoice.remainingAmount.toLocaleString("en-US") + " outstanding", priority: 1 });
    return {
      noShows, risk, opportunities: opportunities.slice(0,15),
      aftercare: events.filter((e) => e.kind === "aftercare" && n(e.payload.symptomScore) >= 7),
      feedback: events.filter((e) => e.kind === "feedback").slice(0,12),
    };
  }, [data, events]);

  if (mode === "admin") return <div className="space-y-5">
    {loading ? <p className="text-xs text-ink/40">Loading patient journey data…</p> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Journey entries" value={events.length} hint="Body, meals, aftercare and feedback" icon={<Activity className="h-5 w-5" />} />
      <StatTile label="Past no-shows" value={adminStats.noShows} hint="Historical missed appointments" icon={<Activity className="h-5 w-5" />} tone="clay" />
      <StatTile label="Missed opportunities" value={adminStats.opportunities.length} hint="Open follow-up or payment actions" icon={<TrendingUp className="h-5 w-5" />} tone="moss" />
      <StatTile label="Aftercare alerts" value={adminStats.aftercare.length} hint="Patient-reported symptom score 7+" icon={<HeartPulse className="h-5 w-5" />} tone="clay" />
    </div>
    <Card><SectionHeader title="No-show risk signals" subtitle="Transparent rules-based estimate from past appointment outcomes; not a machine-learning prediction." icon={<Activity className="h-4 w-4" />} />
      {adminStats.risk.length ? <div className="divide-y divide-ink/6">{adminStats.risk.map((r) => <div key={r.client.id} className="flex flex-wrap items-center gap-3 px-5 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{r.client.fullName}</p><p className="text-xs text-ink/50">{r.missed} no-show · {r.cancelled} cancelled · {r.count} past outcomes</p></div><div className="w-32"><div className="h-2 overflow-hidden rounded-full bg-sand-100"><div className="h-full rounded-full bg-clay-500" style={{width:r.score+"%"}} /></div><p className="mt-1 text-right text-[10px] text-ink/50">{r.score}/100 signal</p></div></div>)}</div> : <EmptyState title="Not enough appointment history" hint="Signals appear as appointment outcomes are recorded." />}
    </Card>
    <Card><SectionHeader title="Missed opportunity detector" subtitle="Active plans without future bookings and unpaid balances. Review before contacting." icon={<Sparkles className="h-4 w-4" />} />
      {adminStats.opportunities.length ? <div className="divide-y divide-ink/6">{adminStats.opportunities.map((o,i) => <div key={o.clientId+"-"+i} className="flex flex-wrap items-center gap-3 px-5 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{o.clientName}</p><p className="text-xs text-ink/55">{o.reason}</p></div><Badge tone={o.priority===1?"clay":"neutral"}>{o.priority===1?"Payment follow-up":"Care follow-up"}</Badge></div>)}</div> : <EmptyState title="No open opportunities found" hint="Relevant follow-up actions will appear here." />}
    </Card>
    <Card><SectionHeader title="Recent body and meal activity" subtitle="Latest measurements and food diary entries submitted by clients." icon={<Activity className="h-4 w-4" />} />
      {events.filter((e) => e.kind === "body_measurement" || e.kind === "meal").slice(0,12).length ? <div className="divide-y divide-ink/6">{events.filter((e) => e.kind === "body_measurement" || e.kind === "meal").slice(0,12).map((e) => <div key={e.id} className="flex items-center gap-3 px-5 py-3">{e.kind === "meal" && typeof e.payload.photoDataUrl === "string" ? <img src={e.payload.photoDataUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sand-100"><Activity className="h-4 w-4" /></div>}<div className="min-w-0 flex-1"><p className="text-sm font-semibold">{e.clientName || "Client"} · {e.kind === "meal" ? String(e.payload.name || "Meal") : "Body measurement"}</p><p className="text-xs text-ink/55">{e.kind === "meal" ? String(e.payload.calories || 0) + " kcal" : String(e.payload.weightKg || "—") + " kg · waist " + String(e.payload.waistCm || "—") + " cm"}</p></div><span className="text-[10px] text-ink/40">{new Date(e.createdAt).toLocaleDateString()}</span></div>)}</div> : <EmptyState title="No body or meal entries yet" hint="Patient submissions will appear here." />}
    </Card>
    <Card><SectionHeader title="Patient voice analytics" subtitle="Recent patient feedback from the client portal." icon={<MessageSquareText className="h-4 w-4" />} />
      {adminStats.feedback.length ? <div className="divide-y divide-ink/6">{adminStats.feedback.map((e) => <div key={e.id} className="px-5 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{e.clientName || "Client"} · {String(e.payload.category || "Feedback")}</p><Badge tone={n(e.payload.rating)<=2?"clay":"pine"}>{n(e.payload.rating)}/5</Badge></div><p className="mt-1 text-xs leading-5 text-ink/60">{String(e.payload.message || "")}</p><p className="mt-1 text-[10px] text-ink/40">{new Date(e.createdAt).toLocaleString()}</p></div>)}</div> : <EmptyState title="No feedback yet" hint="Patient feedback will be summarized here." />}
    </Card>
    <Card><SectionHeader title="Aftercare watch" subtitle="High symptom scores need human review; the app does not diagnose or provide emergency triage." icon={<HeartPulse className="h-4 w-4" />} />
      {adminStats.aftercare.length ? <div className="divide-y divide-ink/6">{adminStats.aftercare.map((e) => <div key={e.id} className="px-5 py-3"><p className="text-sm font-semibold">{e.clientName || "Client"} · score {String(e.payload.symptomScore)}/10</p><p className="text-xs text-ink/55">{String(e.payload.service || "")} — {String(e.payload.notes || "No additional notes")}</p></div>)}</div> : <EmptyState title="No high symptom reports" hint="Reports with a score of 7 or higher appear here for review." />}
    </Card>
  </div>;

  return <div className="space-y-5">
    {loading ? <p className="text-xs text-ink/40">Loading your progress…</p> : null}
    <Card className="overflow-hidden"><div className="bg-[#29213a] px-5 py-5 text-white sm:px-6"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#d9cce6]">EVIDA · YOUR DAILY JOURNEY</p><h2 className="mt-2 font-display text-2xl font-semibold">Small steps, meaningful progress.</h2><p className="mt-1 text-xs text-white/60">Track your measurements, meals and follow-up in one place.</p></div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <div className="rounded-xl bg-sand-50 p-3"><p className="text-[10px] text-ink/50">Today's calories</p><p className="num mt-1 text-2xl font-semibold">{consumed.toLocaleString("en-US")} <span className="text-xs text-ink/40">kcal</span></p><p className="text-[10px] text-ink/45">{(calorieTarget ?? estimatedCalories) ? Math.max(0,(calorieTarget ?? estimatedCalories ?? 0)-consumed)+" kcal remaining · "+(calorieTarget ? "clinician plan" : "estimated target") : "Add your height, weight, birth date and gender to estimate a target."}</p></div>
        <div className="rounded-xl bg-sand-50 p-3"><p className="text-[10px] text-ink/50">Meals logged today</p><p className="num mt-1 text-2xl font-semibold">{todaysMeals.length}</p></div>
        <div className="rounded-xl bg-sand-50 p-3"><p className="text-[10px] text-ink/50">Challenge points</p><p className="num mt-1 text-2xl font-semibold">{points}</p></div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 pb-4 text-center"><div className="rounded-lg bg-sand-50 p-2"><p className="num text-sm font-semibold">{macroTotals.protein}g</p><p className="text-[10px] text-ink/45">Protein</p></div><div className="rounded-lg bg-sand-50 p-2"><p className="num text-sm font-semibold">{macroTotals.carbs}g</p><p className="text-[10px] text-ink/45">Carbs</p></div><div className="rounded-lg bg-sand-50 p-2"><p className="num text-sm font-semibold">{macroTotals.fat}g</p><p className="text-[10px] text-ink/45">Fat</p></div></div>
    </Card>
    <Card>
      <SectionHeader title="Daily calorie needs" subtitle="An estimate based on your profile. Your nutritionist's assigned plan takes priority." icon={<Flame className="h-4 w-4" />} />
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
        <label className={labelClass}>Activity level<select value={activityLevel} onChange={(e)=>setActivityLevel(e.target.value)} className={fieldClass}><option value="sedentary">Mostly sitting</option><option value="light">Light activity</option><option value="moderate">Moderate activity</option><option value="high">High activity</option></select></label>
        <label className={labelClass}>Goal<select value={goalMode} onChange={(e)=>setGoalMode(e.target.value)} className={fieldClass}><option value="maintain">Maintain weight</option><option value="lose">Weight loss</option><option value="gain">Weight gain</option></select></label>
        <div className="rounded-xl bg-sand-50 p-3"><p className="text-[10px] text-ink/50">{calorieTarget ? "Assigned daily target" : "Estimated daily target"}</p><p className="num mt-1 text-2xl font-semibold">{calorieTarget ?? estimatedCalories ?? "—"} <span className="text-xs text-ink/40">kcal</span></p><p className="text-[10px] text-ink/45">{calorieTarget ? "Set by your nutritionist" : "Needs clinician review"}</p></div>
      </div>
      {!calorieTarget && estimatedCalories ? <p className="px-5 pb-4 text-[10px] leading-4 text-ink/45">Estimate uses the Mifflin–St Jeor equation and your selected activity and goal. It is a starting estimate only, not a prescription; your nutritionist should confirm an appropriate target.</p> : null}
    </Card>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><SectionHeader title="Body transformation tracker" subtitle="Record measurements over time for your care team." icon={<Scale className="h-4 w-4" />} />
        <form className="grid gap-3 px-5 pb-5 sm:grid-cols-2" onSubmit={async (e) => {e.preventDefault();const ok=await saveEvent("body_measurement",{weightKg:Number(weight),waistCm:waist?Number(waist):null,hipsCm:hips?Number(hips):null,bodyFatPercent:bodyFat?Number(bodyFat):null});if(ok){setWaist("");setHips("");setBodyFat("");}}}>
          <label className={labelClass}>Weight (kg)<input required type="number" min="20" max="400" step="0.1" value={weight} onChange={(e)=>setWeight(e.target.value)} className={fieldClass}/></label>
          <label className={labelClass}>Waist (cm)<input type="number" min="20" max="250" step="0.1" value={waist} onChange={(e)=>setWaist(e.target.value)} className={fieldClass}/></label>
          <label className={labelClass}>Hips (cm)<input type="number" min="20" max="250" step="0.1" value={hips} onChange={(e)=>setHips(e.target.value)} className={fieldClass}/></label>
          <label className={labelClass}>Body fat (%)<input type="number" min="1" max="75" step="0.1" value={bodyFat} onChange={(e)=>setBodyFat(e.target.value)} className={fieldClass}/></label>
          <div className="sm:col-span-2 flex items-center justify-between gap-3"><p className="text-[10px] text-ink/45">{bodyEntries.length ? "Last entry: "+new Date(bodyEntries[0].createdAt).toLocaleDateString() : "No measurements recorded yet."}</p><Button type="submit" loading={saving} disabled={saving}>Save measurement</Button></div>
        </form>
        {bodyEntries.length>0?<div className="border-t border-ink/6 px-5 py-3">{bodyEntries.slice(0,5).map((e)=><div key={e.id} className="flex justify-between gap-3 py-1.5 text-xs"><span className="text-ink/55">{new Date(e.createdAt).toLocaleDateString()}</span><strong>{n(e.payload.weightKg)} kg · waist {e.payload.waistCm??"—"} cm · hips {e.payload.hipsCm??"—"} cm</strong></div>)}</div>:null}
      </Card>
      <Card><SectionHeader title="Meal photo diary & calorie tracker" subtitle="Log your food and attach a photo for nutritionist review." icon={<Utensils className="h-4 w-4" />} />
        <form className="grid gap-3 px-5 pb-5 sm:grid-cols-2" onSubmit={async(e)=>{e.preventDefault();const ok=await saveEvent("meal",{name:mealName,mealType,calories:Number(calories),protein:Number(protein||0),carbs:Number(carbs||0),fat:Number(fat||0),photoDataUrl:photo||null});if(ok){setMealName("");setCalories("");setProtein("");setCarbs("");setFat("");setPhoto("");}}}>
          <label className={labelClass+" sm:col-span-2"}>Meal name<input required value={mealName} onChange={(e)=>setMealName(e.target.value)} placeholder="e.g. grilled chicken, rice and salad" className={fieldClass}/></label>
          <label className={labelClass}>Meal type<select value={mealType} onChange={(e)=>setMealType(e.target.value)} className={fieldClass}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option></select></label>
          <label className={labelClass}>Calories (kcal)<input required type="number" min="0" max="5000" value={calories} onChange={(e)=>setCalories(e.target.value)} className={fieldClass}/></label>
          <label className={labelClass}>Protein (g)<input type="number" min="0" max="500" value={protein} onChange={(e)=>setProtein(e.target.value)} className={fieldClass}/></label>
          <label className={labelClass}>Carbs (g)<input type="number" min="0" max="1000" value={carbs} onChange={(e)=>setCarbs(e.target.value)} className={fieldClass}/></label>
          <label className={labelClass}>Fat (g)<input type="number" min="0" max="500" value={fat} onChange={(e)=>setFat(e.target.value)} className={fieldClass}/></label>
          <label className={labelClass+" sm:col-span-2"}>Meal photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e)=>{const file=e.target.files?.[0];if(!file)return;if(file.size>850*1024){setError("Choose an image smaller than 850 KB.");return;}const reader=new FileReader();reader.onload=()=>setPhoto(String(reader.result||""));reader.readAsDataURL(file);}} className="text-xs"/></label>
          {photo?<img src={photo} alt="Meal preview" className="h-28 w-28 rounded-xl object-cover sm:col-span-2"/>:null}
          <p className="text-[10px] leading-4 text-ink/45 sm:col-span-2">Photo recognition is not enabled yet. Calories and portions are entered manually and can be reviewed by your nutritionist.</p>
          <div className="sm:col-span-2 flex justify-end"><Button type="submit" loading={saving} disabled={saving}>Add meal to diary</Button></div>
        </form>
        {todaysMeals.length>0?<div className="border-t border-ink/6 px-5 py-3"><div className="mb-2 flex justify-between text-xs"><strong>Today's food log</strong><Badge tone="moss">{consumed} kcal</Badge></div>{todaysMeals.map((e)=><div key={e.id} className="flex items-center gap-3 py-2">{typeof e.payload.photoDataUrl==="string"?<img src={e.payload.photoDataUrl} alt="" className="h-10 w-10 rounded-lg object-cover"/>:<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sand-100"><Camera className="h-4 w-4"/></div>}<div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{String(e.payload.name)}</p><p className="text-[10px] text-ink/45">{String(e.payload.mealType)} · {n(e.payload.protein)}g protein</p></div><strong className="num text-xs">{n(e.payload.calories)} kcal</strong></div>)}</div>:null}
      </Card>
      <Card><SectionHeader title="Smart aftercare check-in" subtitle="Tell your care team how you feel after a treatment or session." icon={<ClipboardHeart className="h-4 w-4"/>}/>
        <form className="grid gap-3 px-5 pb-5" onSubmit={async(e)=>{e.preventDefault();const ok=await saveEvent("aftercare",{service:aftercareService,symptomScore:Number(symptomScore),notes:aftercareNotes});if(ok)setAftercareNotes("");}}>
          <label className={labelClass}>Treatment / service<input value={aftercareService} onChange={(e)=>setAftercareService(e.target.value)} className={fieldClass}/></label>
          <label className={labelClass}>How uncomfortable do you feel? (0–10)<input type="range" min="0" max="10" value={symptomScore} onChange={(e)=>setSymptomScore(e.target.value)}/><span className="text-sm font-semibold">{symptomScore}/10</span></label>
          <label className={labelClass}>What should your care team know?<textarea rows={3} value={aftercareNotes} onChange={(e)=>setAftercareNotes(e.target.value)} className={fieldClass}/></label>
          <p className="text-[10px] leading-4 text-ink/45">This is not an emergency service. For severe or rapidly worsening symptoms, contact your doctor or local emergency services directly.</p>
          <div className="flex justify-end"><Button type="submit" loading={saving} disabled={saving}>Send check-in</Button></div>
        </form>
        {aftercareEntries.length>0?<div className="border-t border-ink/6 px-5 py-3 text-xs text-ink/55">Last check-in: {new Date(aftercareEntries[0].createdAt).toLocaleDateString()} · {String(aftercareEntries[0].payload.symptomScore)}/10</div>:null}
      </Card>
      <Card><SectionHeader title="EVIDA challenges & rewards" subtitle="Points reward healthy participation, not weight loss." icon={<Flame className="h-4 w-4"/>}/>
        <div className="grid gap-3 px-5 pb-5">{CHALLENGES.map((c)=>{const done=myEvents.some((e)=>e.kind==="challenge"&&e.payload.challengeId===c.id&&dayKey(e.createdAt)===today);return <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-sand-50 p-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{c.title}</p><p className="text-xs text-ink/50">{c.description}</p><p className="mt-1 text-[10px] font-semibold text-iris-600">+{c.points} points</p></div><Button size="sm" variant={done?"soft":"outline"} disabled={done||saving} onClick={()=>void saveEvent("challenge",{challengeId:c.id,title:c.title,points:c.points})} type="button">{done?"Completed today":"Mark done"}</Button></div>;})}</div>
      </Card>
      <Card><SectionHeader title="Your feedback matters" subtitle="Share your experience so the clinic can improve." icon={<MessageSquareText className="h-4 w-4"/>}/>
        <form className="grid gap-3 px-5 pb-5 sm:grid-cols-2" onSubmit={async(e)=>{e.preventDefault();const ok=await saveEvent("feedback",{category:feedbackCategory,rating:Number(rating),message:feedback});if(ok)setFeedback("");}}>
          <label className={labelClass}>Feedback about<select value={feedbackCategory} onChange={(e)=>setFeedbackCategory(e.target.value)} className={fieldClass}><option>Overall experience</option><option>Appointment</option><option>Nutrition</option><option>Dermatology</option><option>Aftercare</option><option>Staff and communication</option></select></label>
          <label className={labelClass}>Rating<select value={rating} onChange={(e)=>setRating(e.target.value)} className={fieldClass}><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Okay</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></label>
          <label className={labelClass+" sm:col-span-2"}>Your comments<textarea required rows={3} value={feedback} onChange={(e)=>setFeedback(e.target.value)} className={fieldClass} placeholder="Tell us what went well or what we can improve..."/></label>
          <div className="sm:col-span-2 flex justify-end"><Button type="submit" loading={saving} disabled={saving}>Submit feedback</Button></div>
        </form>
      </Card>
    </div>
    {error?<p className="rounded-xl bg-berry-50 px-4 py-3 text-xs text-berry-700">{error}</p>:null}
    {notice?<p className="rounded-xl bg-moss-50 px-4 py-3 text-xs text-moss-700">{notice}</p>:null}
    <p className="text-[10px] leading-4 text-ink/40">Calorie targets come from the active plan assigned by your care team. Automatic food-photo recognition and AI clinical recommendations are not enabled in this release.</p>
  </div>;
}
