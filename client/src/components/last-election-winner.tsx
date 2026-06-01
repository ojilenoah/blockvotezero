import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import {
  getElectionsBundle,
  getActiveElectionId,
} from "@/utils/blockchain";
import { candidateColors } from "@/data/mock-data";
import { AnimatedBar, NumberRoll } from "@/lib/motion";

interface WinnerView {
  id: number;
  name: string;
  winner: {
    name: string;
    party: string;
    votes: number;
    percentage: number;
  } | null;
  totalVotes: number;
  endDate: Date;
}

export function LastElectionWinner() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WinnerView | null>(null);

  useEffect(() => {
    const fetchLast = async () => {
      try {
        setLoading(true);
        const nextId = await getActiveElectionId();
        if (nextId <= 0) {
          setData(null);
          return;
        }

        const ids = Array.from({ length: nextId - 1 }, (_, i) => nextId - 1 - i);
        const bundles = await getElectionsBundle(ids);
        const now = new Date();

        for (const id of ids) {
          const b = bundles.get(id);
          if (!b?.info?.name) continue;
          if (now <= b.info.endTime) continue;

          let winner = b.candidates[0];
          for (const c of b.candidates) if (c.votes > winner.votes) winner = c;

          const pct = b.totalVotes > 0
            ? Math.round((winner.votes / b.totalVotes) * 100)
            : 0;

          setData({
            id,
            name: b.info.name,
            winner: b.candidates.length > 0
              ? { name: winner.name, party: winner.party, votes: winner.votes, percentage: pct }
              : null,
            totalVotes: b.totalVotes,
            endDate: b.info.endTime,
          });
          return;
        }
        setData(null);
      } catch (err) {
        console.error("[LastElectionWinner] error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLast();
  }, []);

  if (loading) {
    return (
      <div className="b-card flex h-72 items-center justify-center">
        <div className="text-center">
          <div className="b-label">// historical</div>
          <p className="mt-2 font-display text-lg font-bold">Loading archive…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="b-card">
        <div className="border-b-2 border-border px-6 py-4">
          <span className="b-label">// archive</span>
        </div>
        <div className="p-6 text-center">
          <Trophy className="mx-auto mb-3 h-7 w-7 text-muted-foreground" strokeWidth={2} />
          <h3 className="b-display text-xl">No Previous Elections</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Results from finalized elections will appear here.
          </p>
        </div>
      </div>
    );
  }

  if (!data.winner || data.totalVotes === 0) {
    return (
      <div className="b-card">
        <div className="border-b-2 border-border px-6 py-4">
          <span className="b-label">// archive · election #{data.id}</span>
        </div>
        <div className="p-6 text-center">
          <Trophy className="mx-auto mb-3 h-7 w-7 text-muted-foreground" strokeWidth={2} />
          <h3 className="b-display text-xl">No Votes Recorded</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.name} concluded {data.endDate.toLocaleDateString()} with zero votes cast.
          </p>
        </div>
      </div>
    );
  }

  const color =
    candidateColors[data.winner.name.length % candidateColors.length];

  return (
    <div className="b-card flex h-full flex-col">
      <div className="flex items-center justify-between border-b-2 border-border px-6 py-3">
        <span className="b-label">// last winner · #{data.id}</span>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          <Trophy className="h-3 w-3" strokeWidth={2.5} /> Final
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="b-label">{data.name}</div>
        <div className="b-label">
          Concluded {data.endDate.toLocaleDateString()}
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="b-display truncate text-3xl">{data.winner.name}</div>
            <div className="mt-1 inline-block border-2 border-border bg-secondary px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em]">
              {data.winner.party}
            </div>
          </div>
          <div className="text-right">
            <div className="b-mono b-display text-5xl leading-none">
              <NumberRoll value={data.winner.percentage} />
              <span className="text-2xl text-muted-foreground">%</span>
            </div>
            <div className="b-label-fg mt-1">
              <NumberRoll value={data.winner.votes} /> votes
            </div>
          </div>
        </div>

        <div className="mt-5 h-3 w-full border-2 border-border bg-background">
          <AnimatedBar
            percentage={data.winner.percentage}
            color={color}
            delay={0.15}
          />
        </div>

        <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          <span>0%</span>
          <span>of {data.totalVotes.toLocaleString()} total</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
