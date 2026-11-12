"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  LogOut,
  Menu,
  RefreshCw,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { api, fmtRelative } from "@/lib/client";
import { ROLE_LABELS, type NotificationDTO, type ProfileDTO } from "@/lib/types";
import { Avatar, Badge } from "./ui";

export type NavItem = { id: string; label: string; icon: LucideIcon; count?: number };

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-10 w-[132px] shrink-0 items-center overflow-hidden bg-white">
        <img src="/evida-logo.svg" alt="" className="h-full w-full object-contain" />
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block font-display text-lg font-semibold tracking-[0.08em] text-[#4b0758]">EVIDA</span>
          <span className="block text-[9px] font-medium tracking-[0.28em] text-ink/50">CLINIC</span>
        </span>
      )}
    </div>
  );
}

export function Shell({
  user,
  nav,
  active,
  onNavigate,
  notifications,
  onRefresh,
  refreshing,
  title,
  subtitle,
  headerAction,
  children,
}: {
  user: ProfileDTO;
  nav: NavItem[];
  active: string;
  onNavigate: (id: string) => void;
  notifications: NotificationDTO[];
  onRefresh: () => Promise<void> | void;
  refreshing: boolean;
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [mobileNav, setMobileNav] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await api("POST", "/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  async function toggleRead(n: NotificationDTO) {
    await api("PATCH", `/api/notifications/${n.id}`, { read: !n.readAt });
    await onRefresh();
  }

  async function markAll() {
    await api("PATCH", "/api/notifications/all", {});
    await onRefresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <Brand />

      <nav className="flex flex-1 flex-col gap-1">
        <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.16em] text-ink/35">
          {ROLE_LABELS[user.role].toUpperCase()} · MENU
        </p>
        {nav.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                setMobileNav(false);
              }}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition ${
                isActive
                  ? "bg-iris-700 text-sand-50 shadow-[0_12px_26px_-18px_rgba(23,18,38,1)]"
                  : "text-ink/70 hover:bg-iris-50 hover:text-iris-700"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${isActive ? "text-sand-100" : "text-ink/45 group-hover:text-iris-500"}`} />
              <span className="flex-1 font-medium">{item.label}</span>
              {item.count !== undefined && item.count > 0 ? (
                <span
                  className={`num rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-sand-50/20 text-sand-50" : "bg-sand-200 text-ink/60"
                  }`}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-ink/8 bg-white/70 p-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} hue={user.avatarHue} size={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
            <p className="truncate text-[11px] text-ink/50">{user.specialization ?? user.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Badge tone="pine">{ROLE_LABELS[user.role]}</Badge>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-ink/55 transition hover:bg-berry-100 hover:text-berry-600"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="pointer-events-none fixed inset-0 grain opacity-70" aria-hidden />

      <div className="relative flex min-h-screen">
        {/* desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[240px] xl:w-[252px] 2xl:w-[268px] shrink-0 border-e border-ink/8 bg-sand-100/70 backdrop-blur lg:block">
          {sidebar}
        </aside>

        {/* mobile drawer */}
        {mobileNav ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="anim-fade absolute inset-0 bg-ink/50" onClick={() => setMobileNav(false)} />
            <aside className="anim-pop absolute inset-y-0 start-0 w-[280px] border-e border-ink/10 bg-sand-100">
              <button
                type="button"
                onClick={() => setMobileNav(false)}
                className="absolute end-3 top-4 rounded-lg bg-white p-1.5 text-ink/60 shadow"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
              {sidebar}
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          <header className="sticky top-0 z-40 border-b border-ink/8 bg-sand-50/85 backdrop-blur-md">
            <div className="flex min-w-0 flex-nowrap items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5 lg:px-6 xl:px-8 sm:py-3.5">
              <button
                type="button"
                onClick={() => setMobileNav(true)}
                className="rounded-lg border border-ink/10 bg-white p-2 text-ink/60 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="truncate font-display text-lg font-bold text-ink sm:text-xl">{title}</h1>
                {subtitle ? <p className="mt-0.5 truncate text-xs text-ink/55">{subtitle}</p> : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onRefresh()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-2.5 py-2 text-xs font-medium text-ink/65 transition hover:border-iris-300 hover:text-iris-700"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>

                <div className="relative" ref={bellRef}>
                  <button
                    type="button"
                    onClick={() => setBellOpen((v) => !v)}
                    className="relative rounded-lg border border-ink/10 bg-white p-2 text-ink/65 transition hover:border-iris-300 hover:text-iris-700"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unread > 0 ? (
                      <span className="num absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-berry-500 px-1 text-[10px] font-bold text-white">
                        {unread}
                      </span>
                    ) : null}
                  </button>

                  {bellOpen ? (
                    <div className="anim-pop fixed inset-x-3 top-[4.5rem] z-[60] max-h-[calc(100dvh-5.5rem)] overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_28px_60px_-30px_rgba(23,18,38,0.65)] sm:absolute sm:inset-x-auto sm:end-0 sm:top-12 sm:w-[min(92vw,28rem)] sm:max-h-[min(75vh,38rem)]">
                      <div className="flex items-center justify-between gap-3 border-b border-ink/8 px-4 py-3">
                        <p className="font-display text-base font-bold text-ink">Notifications</p>
                        <button
                          type="button"
                          onClick={markAll}
                          className="shrink-0 text-xs font-semibold text-iris-600 hover:underline"
                        >
                          Mark all as read
                        </button>
                      </div>
                      <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain sm:max-h-[min(65vh,32rem)]">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-10 text-center text-sm text-ink/60">No notifications yet</p>
                        ) : (
                          notifications.slice(0, 12).map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => void toggleRead(n)}
                              className={`flex w-full items-start gap-3 border-b border-ink/5 px-4 py-4 text-start transition hover:bg-sand-50 ${
                                n.readAt ? "opacity-60" : ""
                              }`}
                            >
                              <span
                                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                  n.readAt ? "bg-sand-300" : "bg-clay-500"
                                }`}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block whitespace-normal break-words text-[15px] font-semibold leading-6 text-ink">{n.title}</span>
                                {n.body ? (
                                  <span className="mt-1 block whitespace-pre-wrap break-words text-[14px] leading-6 text-ink/75">{n.body}</span>
                                ) : null}
                                <span className="mt-2 block text-[11px] text-ink/45">{fmtRelative(n.createdAt)}</span>
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {headerAction}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-8 xl:py-7">
            <div key={active} className="anim-rise mx-auto min-w-0 w-full max-w-[1440px]">
              {children}
            </div>
          </main>

          <footer className="px-3 pb-5 pt-2 text-center text-[10px] leading-5 text-ink/40 sm:px-5 lg:px-6 xl:px-8 sm:text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              EVIDA Clinic — New Cairo · GOE Medical Park Mall 3, clinic 331 · 01000115502
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
