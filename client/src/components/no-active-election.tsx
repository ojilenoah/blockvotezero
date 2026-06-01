import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import {
  getActiveElectionId,
  getElectionsBundle,
} from "@/utils/blockchain";

interface NoActiveElectionProps {
  title?: string;
  description?: string;
  showSchedule?: boolean;
  showButtons?: boolean;
}

interface ScheduledElection {
  id: number;
  name: string;
  startTime: Date;
  endTime: Date;
}

export function NoActiveElection({
  title = "No Active Elections",
  description = "There are no elections currently open for voting",
  showSchedule = true,
  showButtons = true,
}: NoActiveElectionProps) {
  const [scheduled, setScheduled] = useState<ScheduledElection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!showSchedule) return;
    const fetchScheduled = async () => {
      setLoading(true);
      try {
        const nextId = await getActiveElectionId();
        const ids = Array.from(
          { length: Math.max(1, nextId - 1) },
          (_, i) => i + 1
        );
        const bundles = await getElectionsBundle(ids);
        const now = new Date();
        const next: ScheduledElection[] = [];
        for (const id of ids) {
          const b = bundles.get(id);
          if (!b?.info?.name) continue;
          if (b.info.startTime > now) {
            next.push({
              id,
              name: b.info.name,
              startTime: b.info.startTime,
              endTime: b.info.endTime,
            });
          }
        }
        next.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        setScheduled(next);
      } catch (err) {
        console.error("Error fetching scheduled elections:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchScheduled();
  }, [showSchedule]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="b-card">
        <div className="px-6 pt-8 pb-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center border-2 border-border bg-secondary">
            <Calendar className="h-7 w-7" strokeWidth={2} />
          </div>
          <h3 className="b-display mt-4 text-2xl">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="space-y-6 px-6 pb-6 pt-4">
          <p className="mx-auto max-w-md text-center text-sm text-muted-foreground">
            Elections are announced in advance through official channels and
            written into the contract on-chain.
          </p>

          {showSchedule && (
            <div className="border-2 border-border bg-secondary/40 p-4">
              <div className="b-label mb-3 flex items-center gap-1.5">
                <Clock className="h-3 w-3" strokeWidth={2.5} />
                Next scheduled
              </div>

              {loading ? (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  Loading schedule…
                </p>
              ) : scheduled.length > 0 ? (
                <ul className="space-y-2">
                  {scheduled.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-start gap-3 border-b border-border/40 pb-2 last:border-b-0 last:pb-0"
                    >
                      <span className="mt-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                        #{String(e.id).padStart(3, "0")}
                      </span>
                      <div className="flex-1">
                        <div className="font-display text-sm font-bold">
                          {e.name}
                        </div>
                        <div className="b-mono text-xs text-muted-foreground">
                          {e.startTime.toLocaleDateString()} →{" "}
                          {e.endTime.toLocaleDateString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  No scheduled elections at this time.
                </p>
              )}
            </div>
          )}

          {showButtons && (
            <div className="flex justify-center">
              <Link href="/explorer">
                <Button variant="outline">
                  View Past Elections
                  <ArrowRight className="ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
