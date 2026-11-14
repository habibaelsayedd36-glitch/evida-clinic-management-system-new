"use client";

import { useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

const topics = [
  { q: "How can I book an appointment?", a: "Use the Book appointment button in your EVIDA account. Choose the available service and time. The clinic team will confirm your request." },
  { q: "Where can I see service prices?", a: "Open the Services section in your account to review the services and listed prices. Please confirm the latest offer with reception before visiting." },
  { q: "How do I see my diet plan?", a: "Open Diet plan from the menu. Your assigned meals and notes appear there once your doctor adds them." },
  { q: "How do I track my progress?", a: "Your Home dashboard shows recorded measurements and your weight journey. Your care team updates measurements during visits." },
  { q: "Can you recommend a treatment or medicine?", a: "I can explain EVIDA services, but I cannot diagnose, prescribe, or recommend a treatment. Please ask your doctor to assess what is appropriate for you." },
  { q: "How do I contact the clinic?", a: "You can contact the EVIDA team through the WhatsApp link in the Services section of your account." },
];

export function EvidaAssistant({ context }: { context?: { calorieTarget?: number | null; currentWeight?: number | null; nextAppointment?: string | null; activePlans?: number } }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: "user" | "assistant"; text: string }[]>([
    { from: "assistant", text: "Hello! I am the EVIDA Smart Assistant. I can help you find information from your saved clinic plan and explain how to use your account. Medical decisions stay with your care team." },
  ]);
  const [question, setQuestion] = useState("");

  function ask(value: string) {
    const clean = value.trim();
    if (!clean) return;
    const normalized = clean.toLowerCase();
    const match = topics.find((topic) =>
      topic.q.toLowerCase().split(" ").some((word) => word.length > 4 && normalized.includes(word))
    );
    let answer = match?.a ?? "I don't have a verified answer for that yet. Please contact the EVIDA team through WhatsApp or ask your doctor. I can't provide medical diagnosis or treatment advice.";
    if (/calorie|calories|سعر|السعرات/i.test(normalized)) answer = context?.calorieTarget ? "Your current daily calorie target is " + context.calorieTarget + " kcal, as set in your active diet plan. Your nutritionist should review any changes." : "There is no daily calorie target in your active plan yet. Ask your nutritionist to set one before using a calorie target.";
    else if (/weight|وزن|الوزن/i.test(normalized)) answer = context?.currentWeight ? "Your latest profile weight is " + context.currentWeight + " kg. Open My progress & food diary to record additional measurements." : "There is no current weight saved in your profile yet. You can record it from My progress & food diary.";
    else if (/appointment|موعد|الحجز/i.test(normalized)) answer = context?.nextAppointment ? "Your next appointment is " + context.nextAppointment + ". Open My appointments for details or to request a change." : "You do not have an upcoming appointment in your account. Use Book appointment to request one.";
    else if (/plan|خطة|جلسات/i.test(normalized)) answer = "You currently have " + (context?.activePlans ?? 0) + " active treatment plan(s). Open Treatment to review your protocol and sessions.";
    setMessages((current) => [...current, { from: "user", text: clean }, { from: "assistant", text: answer }]);
    setQuestion("");
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {open ? (
        <section className="mb-3 flex w-[min(90vw,360px)] flex-col overflow-hidden rounded-2xl border border-[#e9e3ec] bg-white shadow-[0_20px_60px_-20px_rgba(33,27,53,.35)]">
          <header className="flex items-center justify-between bg-[#302542] px-4 py-3 text-white">
            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"><Sparkles className="h-4 w-4" /></span><div><p className="text-sm font-semibold">EVIDA Smart Assistant</p><p className="text-[10px] text-white/60">Guided account & care-plan support</p></div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button>
          </header>
          <div className="max-h-72 space-y-2 overflow-y-auto bg-[#faf8fb] p-3">
            {messages.map((message, index) => <div key={index} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}><p className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-5 ${message.from === "user" ? "rounded-br-sm bg-[#806b91] text-white" : "rounded-bl-sm border border-[#eee8f0] bg-white text-ink/75"}`}>{message.text}</p></div>)}
          </div>
          <div className="border-t border-[#eee8f0] p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">{topics.slice(0, 4).map((topic) => <button key={topic.q} type="button" onClick={() => ask(topic.q)} className="rounded-full border border-[#e9e3ec] px-2.5 py-1 text-[10px] text-[#665476] hover:bg-[#f5f0f6]">{topic.q}</button>)}</div>
            <form onSubmit={(event) => { event.preventDefault(); ask(question); }} className="flex gap-2">
              <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about EVIDA..." className="min-w-0 flex-1 rounded-xl border border-[#e9e3ec] px-3 py-2 text-xs outline-none focus:border-[#806b91]" />
              <button type="submit" aria-label="Send question" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#806b91] text-white hover:bg-[#665476]"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        </section>
      ) : null}
      <button type="button" onClick={() => setOpen((value) => !value)} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#302542] text-white shadow-lg shadow-[#302542]/25 transition hover:scale-105" aria-label={open ? "Close EVIDA assistant" : "Open EVIDA assistant"}>
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
