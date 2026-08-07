import { useState } from "react";

import { useAuth } from "@/core/auth/useAuth";
import {
  useMarkNotificationRead,
  useNotificationRealtimeSync,
  useNotifications,
} from "@/features/notification/api";

/** docs/UI_UX.md §5.7 — bell icon with unread badge, dropdown at Level 3. */
export function NotificationBell(): React.JSX.Element {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: unread } = useNotifications(true);
  const { data: all } = useNotifications();
  const markRead = useMarkNotificationRead();
  useNotificationRealtimeSync(user?.id);

  const unreadCount = unread?.length ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative rounded-plaque p-2 text-ink-navy/70 hover:bg-chalk hover:text-ink-navy"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brick px-1 font-body text-[10px] text-chalk">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-plaque border border-slate/15 bg-white p-2 shadow-level-3">
          {!all || all.length === 0 ? (
            <p className="px-2 py-4 text-center font-body text-sm text-slate">
              No notifications yet.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {all.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-plaque px-3 py-2 font-body text-sm ${n.read_at ? "text-slate" : "text-ink-navy"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="capitalize">{n.type.replace(/_/g, " ")}</span>
                    {!n.read_at && (
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        className="font-body text-xs text-brass hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <span className="font-body text-xs text-slate">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
