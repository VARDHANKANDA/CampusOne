import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth/useAuth";
import { useTheme } from "@/core/theme/useTheme";
import { apiClient } from "@/core/api/client";
import { ROLE_LABEL } from "@/routes/navigation";

interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  url: string;
}

export function CommandPalette(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle Command Palette on Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Debounced API Search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<SearchResultItem[]>(`/search?q=${encodeURIComponent(query)}`);
        setResults(response.data);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  if (!isOpen) return <></>;

  const handleSelect = (url: string) => {
    navigate(url);
    setIsOpen(false);
  };

  const executeAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  // Predefined Quick Actions based on Role
  const getQuickActions = () => {
    const actions = [
      {
        label: `Switch to ${theme === "light" ? "Dark" : "Light"} Mode`,
        shortcut: "T",
        action: () => toggleTheme(),
      },
      {
        label: "Go to Dashboard",
        shortcut: "G D",
        action: () => navigate("/"),
      },
    ];

    if (user?.role === "student") {
      actions.push(
        { label: "Submit Hostel Complaint", shortcut: "G C", action: () => navigate("/complaints/new") },
        { label: "Scan QR Attendance", shortcut: "G A", action: () => navigate("/attendance/scan") }
      );
    } else if (user?.role === "faculty") {
      actions.push(
        { label: "Book Classroom", shortcut: "G B", action: () => navigate("/bookings/new") },
        { label: "Generate QR Attendance", shortcut: "G Q", action: () => navigate("/attendance/generate") }
      );
    } else if (user?.role === "warden") {
      actions.push(
        { label: "Complaint Queue", shortcut: "G Q", action: () => navigate("/complaints/queue") }
      );
    } else if (user?.role === "maintenance_staff") {
      actions.push(
        { label: "My Maintenance Tasks", shortcut: "G T", action: () => navigate("/maintenance/tasks") }
      );
    } else if (user?.role === "admin") {
      actions.push(
        { label: "User Accounts Management", shortcut: "G U", action: () => navigate("/admin/users") },
        { label: "Audit Logs Viewer", shortcut: "G L", action: () => navigate("/admin/audit-logs") }
      );
    }

    return actions;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-plaque border border-card-border bg-card-bg shadow-level-3 animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-card-border px-3 py-3">
          <svg
            className="mr-2 h-5 w-5 text-slate"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search rooms, bookings, complaints, equipment..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-text-primary placeholder-slate outline-none"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="rounded border border-card-border px-1.5 py-0.5 text-[10px] text-slate hover:bg-canvas"
          >
            ESC
          </button>
        </div>

        {/* Results / Quick Actions */}
        <div className="max-h-72 overflow-y-auto p-2">
          {loading && (
            <div className="p-4 text-center text-xs text-slate">Searching the campus...</div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="p-4 text-center text-xs text-slate">No matching campus records found.</div>
          )}

          {/* Render Search Results */}
          {!loading && results.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate">
                Search Results
              </div>
              <ul className="mt-1 flex flex-col gap-0.5">
                {results.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleSelect(item.url)}
                      className="flex w-full items-start rounded-plaque px-3 py-2 text-left hover:bg-canvas transition"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-xs text-slate">{item.subtitle}</div>
                        )}
                      </div>
                      <span className="rounded bg-canvas/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate font-mono">
                        {item.type}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Render Quick Actions if query is empty */}
          {query.trim().length < 2 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate">
                Quick Actions
              </div>
              <ul className="mt-1 flex flex-col gap-0.5">
                {getQuickActions().map((action, i) => (
                  <li key={i}>
                    <button
                      onClick={() => executeAction(action.action)}
                      className="flex w-full items-center justify-between rounded-plaque px-3 py-2 text-left hover:bg-canvas transition"
                    >
                      <span className="text-sm text-text-primary">{action.label}</span>
                      <kbd className="rounded border border-card-border px-1.5 py-0.5 text-[9px] font-mono text-slate">
                        {action.shortcut}
                      </kbd>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex justify-between border-t border-card-border bg-canvas/40 px-3 py-2 text-[10px] text-slate">
          <span>Logged in as: {ROLE_LABEL[user?.role ?? "student"]}</span>
          <span>Press <kbd className="font-mono">Ctrl + K</kbd> anywhere</span>
        </div>
      </div>
    </div>
  );
}
