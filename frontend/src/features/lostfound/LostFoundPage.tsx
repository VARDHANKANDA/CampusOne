import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/core/auth/useAuth";
import { useLostFoundSearch, useMarkItemStatus, useReportItem } from "@/features/lostfound/api";
import { LOST_FOUND_STATUS_TONE } from "@/features/lostfound/statusTone";
import type { LostFoundType } from "@/features/lostfound/types";

/** docs/PRD.md FR-8.1/FR-8.2 — report a lost/found item, search existing ones. */
export function LostFoundPage(): React.JSX.Element {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<LostFoundType | "">("");
  const [reportType, setReportType] = useState<LostFoundType>("lost");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | undefined>();
  const [reportError, setReportError] = useState<string | null>(null);

  const { data: items, isLoading } = useLostFoundSearch({
    keyword: keyword || undefined,
    item_type: typeFilter || undefined,
  });
  const reportItem = useReportItem();
  const markStatus = useMarkItemStatus();

  const onReport = (e: React.FormEvent): void => {
    e.preventDefault();
    setReportError(null);
    reportItem.mutate(
      { type: reportType, description, image },
      {
        onSuccess: () => {
          setDescription("");
          setImage(undefined);
        },
        onError: () => setReportError("Could not submit your report. Try again."),
      },
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-ink-navy">Lost &amp; Found</h1>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <TextField
            label="Search"
            placeholder="Keyword…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="type-filter" className="font-body text-sm font-medium text-ink-navy">
              Type
            </label>
            <select
              id="type-filter"
              className="rounded-plaque border border-slate/30 bg-chalk px-3 py-2 font-body text-sm text-ink-navy"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as LostFoundType | "")}
            >
              <option value="">All</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
          </div>
        </div>

        {isLoading && <p className="mt-4 font-body text-sm text-slate">Searching…</p>}

        {items && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <PlaqueCard
                key={item.id}
                identifierLabel="Type"
                identifier={item.type}
                title={item.description}
                status={
                  <div className="flex items-center gap-2">
                    <StatusBadge label={item.status} tone={LOST_FOUND_STATUS_TONE[item.status]} />
                    {item.status === "open" &&
                      (item.reporter_id === user?.id || user?.role === "admin") && (
                        <Button
                          variant="secondary"
                          isLoading={
                            markStatus.isPending && markStatus.variables?.itemId === item.id
                          }
                          onClick={() => markStatus.mutate({ itemId: item.id, status: "matched" })}
                        >
                          Mark matched
                        </Button>
                      )}
                  </div>
                }
              />
            ))}
            {items.length === 0 && (
              <p className="font-body text-sm text-slate">No items match your search.</p>
            )}
          </div>
        )}
      </div>

      {user?.role === "student" && (
        <div className="rounded-plaque border border-slate/15 bg-white p-4 shadow-level-1">
          <h2 className="font-display text-lg text-ink-navy">Report an item</h2>
          <form onSubmit={onReport} className="mt-4 flex flex-col gap-4">
            {reportError && (
              <div
                role="alert"
                className="rounded-plaque border border-brick/30 bg-brick/5 px-3 py-2 text-sm text-brick"
              >
                {reportError}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label htmlFor="report-type" className="font-body text-sm font-medium text-ink-navy">
                Type
              </label>
              <select
                id="report-type"
                className="rounded-plaque border border-slate/30 bg-chalk px-3 py-2 font-body text-sm text-ink-navy"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as LostFoundType)}
              >
                <option value="lost">Lost</option>
                <option value="found">Found</option>
              </select>
            </div>
            <TextField
              label="Description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <TextField
              label="Photo (optional)"
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0])}
            />
            <Button type="submit" isLoading={reportItem.isPending} className="w-fit">
              Submit report
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
