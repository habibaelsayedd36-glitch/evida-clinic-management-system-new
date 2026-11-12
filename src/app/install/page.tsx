import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Share, Smartphone } from "lucide-react";
import { Brand } from "@/components/Shell";

export const metadata = {
  title: "Install EVIDA on iPhone",
  description: "Simple steps to add EVIDA Clinic to your iPhone home screen.",
};

export default function InstallPage() {
  return (
    <main className="min-h-screen bg-sand-50 px-4 py-8 text-ink sm:py-12">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-iris-700 hover:text-iris-800">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        <section className="mt-10 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-iris-50 text-iris-700">
            <Smartphone className="h-7 w-7" />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-iris-700">EVIDA Clinic</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight">Add EVIDA to your iPhone</h1>
          <p className="mt-3 text-sm leading-7 text-ink/65">
            You can add EVIDA to your Home Screen for quick access. No App Store download or paid Apple developer account is needed.
          </p>

          <div className="mt-7 space-y-5">
            <div className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-iris-100 font-bold text-iris-800">1</span>
              <div>
                <h2 className="font-bold">Open this link in Safari</h2>
                <p className="mt-1 text-sm leading-6 text-ink/60">If this page opened in WhatsApp, Instagram or another browser, open the link in Safari first.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-iris-100 font-bold text-iris-800">2</span>
              <div>
                <h2 className="font-bold">Tap the Share button</h2>
                <p className="mt-1 flex items-center gap-2 text-sm leading-6 text-ink/60">It looks like this <Share className="h-4 w-4 text-iris-700" /> and is usually at the bottom of Safari.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-iris-100 font-bold text-iris-800">3</span>
              <div>
                <h2 className="font-bold">Choose “Add to Home Screen”</h2>
                <p className="mt-1 text-sm leading-6 text-ink/60">Scroll in the Share menu if you do not see the option immediately.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-iris-100 font-bold text-iris-800">4</span>
              <div>
                <h2 className="font-bold">Tap “Add”</h2>
                <p className="mt-1 text-sm leading-6 text-ink/60">The EVIDA icon will appear on your iPhone Home Screen. Open it from there like any other app.</p>
              </div>
            </div>
          </div>

          <div className="mt-7 rounded-2xl border border-iris-100 bg-iris-50/70 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-iris-900"><CheckCircle2 className="h-4 w-4" /> Already added EVIDA?</p>
            <p className="mt-1 text-sm leading-6 text-iris-900/70">Find the EVIDA icon on your Home Screen and tap it to open the app.</p>
          </div>

          <Link href="/login" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-iris-700 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-iris-800">
            Open EVIDA <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-center text-xs text-ink/45">For iPhone, use Safari to add EVIDA to your Home Screen.</p>
        </section>
      </div>
    </main>
  );
}
