import { useState, useEffect } from "react";
import { getActiveElectionId, getElectionsBundle } from "@/utils/blockchain";

type Status = "Active" | "Upcoming" | "Inactive" | "Loading";

const STATUS_META: Record<Status, { dotClass: string; label: string }> = {
  Active:   { dotClass: "bg-success border-success",       label: "Live" },
  Upcoming: { dotClass: "bg-warning border-warning",       label: "Upcoming" },
  Inactive: { dotClass: "bg-muted-foreground border-muted-foreground", label: "Idle" },
  Loading:  { dotClass: "bg-muted-foreground border-muted-foreground", label: "Syncing" },
};

interface ElectionStatusProps {
  /** Render as a compact inline pill instead of the dashboard block */
  variant?: "block" | "inline";
}

export function ElectionStatus({ variant = "block" }: ElectionStatusProps) {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("Loading");
  const [electionEndTime, setElectionEndTime] = useState<Date | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const nextId = await getActiveElectionId();
        if (nextId <= 0) {
          setStatus("Inactive");
          setTimeRemaining(null);
          return;
        }

        const ids = Array.from({ length: nextId - 1 }, (_, i) => nextId - 1 - i);
        const bundles = await getElectionsBundle(ids);

        let foundActive = false;
        let activeEnd: Date | null = null;
        let upcomingStart: Date | null = null;

        for (const id of ids) {
          const b = bundles.get(id);
          if (!b?.info?.name) continue;
          const now = new Date();
          const { startTime, endTime, active } = b.info;
          if (now >= startTime && now <= endTime && active) {
            foundActive = true;
            activeEnd = endTime;
            break;
          }
          if (!upcomingStart && now < startTime) upcomingStart = startTime;
        }

        if (foundActive && activeEnd) {
          setStatus("Active");
          setElectionEndTime(activeEnd);
        } else if (upcomingStart) {
          setStatus("Upcoming");
          setTimeRemaining(formatCountdown(upcomingStart, "Starts in"));
        } else {
          setStatus("Inactive");
          setTimeRemaining(null);
        }
      } catch (err) {
        console.error("[ElectionStatus] error", err);
        setStatus("Inactive");
      }
    };

    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!electionEndTime || status !== "Active") return;
    const tick = () => {
      const ms = electionEndTime.getTime() - Date.now();
      if (ms <= 0) {
        setStatus("Inactive");
        setTimeRemaining(null);
        return;
      }
      setTimeRemaining(formatRemaining(ms));
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [electionEndTime, status]);

  const meta = STATUS_META[status];

  if (variant === "inline") {
    return (
      <div className="inline-flex items-center gap-2">
        <span className={`b-dot ${meta.dotClass} ${status === "Active" ? "b-blink" : ""}`} />
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em]">
          {meta.label}
        </span>
        {timeRemaining && (
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            · {timeRemaining}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mb-8 flex flex-col gap-3 border-b-2 border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="b-label">// dashboard</span>
        <h1 className="b-display mt-1 text-4xl sm:text-5xl">Election Index</h1>
      </div>
      <div className="flex items-center gap-3 border-2 border-border bg-card px-4 py-2 shadow-brutal-sm">
        <span className={`b-dot ${meta.dotClass} ${status === "Active" ? "b-blink" : ""}`} />
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Status
          </span>
          <span className="font-display text-sm font-bold uppercase tracking-wide">
            {meta.label}
          </span>
        </div>
        {timeRemaining && (
          <>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Countdown
              </span>
              <span className="b-mono text-sm font-bold">{timeRemaining}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatRemaining(ms: number): string {
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d}D ${h}H`;
  if (h > 0) return `${h}H ${m}M`;
  return `${m}M`;
}

function formatCountdown(target: Date, prefix: string): string {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "Now";
  return `${prefix} ${formatRemaining(ms)}`;
}
