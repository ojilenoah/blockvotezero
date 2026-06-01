import { useState, useEffect } from "react";
import {
  getActiveElectionId,
  getElectionsBundle,
} from "@/utils/blockchain";
import { NoActiveElection } from "@/components/no-active-election";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

interface Election {
  id: number;
  name: string;
  startTime: Date;
  endTime: Date;
  totalVotes: number;
}

interface PreviousElectionsProps {
  title?: string;
  itemsPerPage?: number;
}

export function PreviousElections({
  title = "Previous Elections",
  itemsPerPage = 4,
}: PreviousElectionsProps) {
  const [elections, setElections] = useState<Election[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(elections.length / itemsPerPage));
  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, elections.length);
  const visible = elections.slice(startIdx, endIdx);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const nextId = await getActiveElectionId();
        if (nextId <= 1) {
          setElections([]);
          return;
        }
        // Cap how far back we go for performance
        const maxLookback = Math.min(nextId - 1, 15);
        const ids = Array.from(
          { length: maxLookback },
          (_, i) => nextId - 1 - i
        );
        const bundles = await getElectionsBundle(ids);
        const now = new Date();
        const completed: Election[] = [];
        for (const id of ids) {
          const b = bundles.get(id);
          if (!b?.info?.name) continue;
          if (b.info.endTime < now) {
            completed.push({
              id,
              name: b.info.name,
              startTime: b.info.startTime,
              endTime: b.info.endTime,
              totalVotes: b.totalVotes,
            });
          }
        }
        completed.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
        setElections(completed);
      } catch (err) {
        console.error("Error fetching previous elections:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  if (isLoading) {
    return (
      <Section title={title}>
        <div className="b-card flex h-32 items-center justify-center">
          <span className="b-label">// loading archive…</span>
        </div>
      </Section>
    );
  }

  if (elections.length === 0) {
    return (
      <Section title={title}>
        <div className="b-card">
          <div className="p-6">
            <NoActiveElection
              title="No Previous Elections"
              description="No elections have been completed yet."
              showSchedule={false}
              showButtons={false}
            />
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section title={title}>
      <div className="b-card divide-y-2 divide-border">
        {visible.map((e, i) => (
          <div
            key={e.id}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-5 transition-colors hover:bg-secondary/40"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-border bg-secondary">
              <FileText className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-bold text-muted-foreground">
                  #{String(e.id).padStart(3, "0")}
                </span>
                <span className="b-label">
                  {e.startTime.toLocaleDateString()} → {e.endTime.toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-display truncate text-lg font-bold">
                {e.name}
              </h3>
              <div className="b-label-fg mt-0.5 b-mono">
                {e.totalVotes.toLocaleString()} votes recorded
              </div>
            </div>
            <Badge variant="success">Final</Badge>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="b-label">
            {startIdx + 1}–{endIdx} of {elections.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between border-b-2 border-border pb-2">
        <h2 className="b-display text-2xl">{title}</h2>
        <span className="b-label">// archive</span>
      </div>
      {children}
    </section>
  );
}
