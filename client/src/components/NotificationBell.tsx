/**
 * NotificationBell — shows unread count badge and a dropdown list of recent notifications.
 * Placed in the Dashboard top nav.
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCircle2, ExternalLink } from "@/lib/icons";
import { useLocation } from "wouter";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const { data: notifications = [], refetch } = trpc.notifications.getAll.useQuery(undefined, {
    refetchInterval: 60_000, // poll every 60s
  });
  const { data: unreadCount = 0 } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => refetch(),
  });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleOpen() {
    setOpen((v) => !v);
  }

  function handleNotificationClick(n: { id: number; actionUrl?: string | null; isRead: boolean }) {
    if (!n.isRead) markRead.mutate({ id: n.id });
    if (n.actionUrl) {
      setOpen(false);
      navigate(n.actionUrl);
    }
  }

  function handleMarkAll() {
    markAllRead.mutate();
  }

  const hasUnread = unreadCount > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-3.5 h-3.5 text-white/70" />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[--color-gold] text-black text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {hasUnread && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-[--color-gold] hover:text-[--color-gold]/80 transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/40 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors flex items-start gap-3 ${
                    !n.isRead ? "bg-[--color-gold]/5" : ""
                  }`}
                >
                  {!n.isRead && (
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[--color-gold] flex-shrink-0" />
                  )}
                  {n.isRead && <span className="mt-1.5 w-1.5 h-1.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white leading-snug">{n.title}</p>
                    <p className="text-xs text-white/50 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                    {n.actionLabel && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-[--color-gold]">
                        {n.actionLabel}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
