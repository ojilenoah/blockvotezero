import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  getActiveElectionId,
  getElectionsBundle,
} from "@/utils/blockchain";
import { candidateColors } from "@/data/mock-data";
import { ArrowRight, BarChart3, Table2, Calendar, Clock, Users } from "lucide-react";
import { AnimatedBar, NumberRoll, motion, fadeUp } from "@/lib/motion";

interface CandidateRow {
  name: string;
  party: string;
  votes: number;
  percentage: number;
}

interface ActiveElectionView {
  id: number;
  name: string;
  startTime: Date;
  endTime: Date;
  candidates: CandidateRow[];
  totalVotes: number;
}

export function ElectionInfoCard() {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  const { data: electionData, isLoading } = useQuery<ActiveElectionView | null>({
    queryKey: ["activeElection"],
    queryFn: async () => {
      const nextId = await getActiveElectionId();
      if (!nextId) return null;

      const ids = Array.from({ length: nextId - 1 }, (_, i) => nextId - 1 - i);
      const bundles = await getElectionsBundle(ids);

      for (const id of ids) {
        const b = bundles.get(id);
        if (!b?.info?.name) continue;
        const now = new Date();
        const { startTime, endTime, active } = b.info;
        if (active && now >= startTime && now <= endTime) {
          return {
            id,
            name: b.info.name,
            startTime,
            endTime,
            totalVotes: b.totalVotes,
            candidates: b.candidates.map((c) => ({
              name: c.name,
              party: c.party,
              votes: c.votes,
              percentage:
                b.totalVotes > 0 ? Math.round((c.votes / b.totalVotes) * 100) : 0,
            })),
          };
        }
      }
      return null;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="b-card flex h-72 items-center justify-center">
        <div className="text-center">
          <div className="b-label">// status</div>
          <p className="mt-2 font-display text-lg font-bold">Syncing chain data…</p>
        </div>
      </div>
    );
  }

  if (!electionData) {
    return (
      <div className="b-card">
        <div className="border-b-2 border-border px-6 py-4">
          <span className="b-label">// no active election</span>
        </div>
        <div className="px-6 py-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border-2 border-border bg-secondary">
            <Calendar className="h-7 w-7" strokeWidth={2} />
          </div>
          <h3 className="b-display text-2xl">No Active Election</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            The protocol is idle. Register now so you're ready when the next vote opens.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button>Register to Vote <ArrowRight className="ml-1" /></Button>
            </Link>
            <Link href="/explorer">
              <Button variant="outline">View Past Elections</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const remainingMs = electionData.endTime.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.floor(remainingMs / 86_400_000));
  const hoursRemaining = Math.max(0, Math.floor((remainingMs % 86_400_000) / 3_600_000));

  return (
    <div className="b-card">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b-2 border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="b-label">// election</span>
          <span className="font-mono text-[11px] font-bold">
            #{String(electionData.id).padStart(3, "0")}
          </span>
        </div>
        <span className="inline-flex items-center gap-2 border-2 border-success bg-success/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-success">
          <span className="h-1.5 w-1.5 bg-success b-blink" />
          Live
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_1.2fr]">
        {/* Left — meta */}
        <div className="border-b-2 border-border p-6 lg:border-b-0 lg:border-r-2">
          <h2 className="b-display text-3xl sm:text-4xl">{electionData.name}</h2>

          <dl className="mt-6 space-y-5">
            <Stat
              icon={<Calendar className="h-4 w-4" strokeWidth={2.5} />}
              label="Election Period"
              value={`${electionData.startTime.toLocaleDateString()} → ${electionData.endTime.toLocaleDateString()}`}
            />
            <Stat
              icon={<Clock className="h-4 w-4" strokeWidth={2.5} />}
              label="Time Remaining"
              value={
                <span className="b-mono">
                  {daysRemaining}D {hoursRemaining}H
                </span>
              }
            />
            <Stat
              icon={<Users className="h-4 w-4" strokeWidth={2.5} />}
              label="Total Votes Cast"
              value={
                <span className="b-mono">
                  {electionData.totalVotes.toLocaleString()}
                </span>
              }
            />
          </dl>

          <Link href="/vote">
            <Button size="lg" className="mt-8 w-full">
              Cast Your Vote <ArrowRight className="ml-1" />
            </Button>
          </Link>
        </div>

        {/* Right — results */}
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <span className="b-label">// live results</span>
              <h3 className="font-display text-lg font-bold">Current Tally</h3>
            </div>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          {viewMode === "chart" ? (
            <>
              <div className="h-56 border-2 border-border bg-secondary/30 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={electionData.candidates}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      dataKey="percentage"
                      nameKey="name"
                      stroke="hsl(var(--border))"
                      strokeWidth={2}
                    >
                      {electionData.candidates.map((_, i) => (
                        <Cell
                          key={i}
                          fill={candidateColors[i % candidateColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "2px solid hsl(var(--border))",
                        borderRadius: 0,
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 12,
                      }}
                      formatter={(v) => [`${v}%`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <motion.div
                className="mt-4 space-y-3"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
              >
                {electionData.candidates.map((candidate, i) => {
                  const color = candidateColors[i % candidateColors.length];
                  return (
                    <motion.div key={i} variants={fadeUp}>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 border-2 border-border"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-display text-sm font-bold">
                            {candidate.name}
                          </span>
                        </div>
                        <span className="b-mono text-sm font-bold">
                          <NumberRoll value={candidate.percentage} format={(v) => `${Math.round(v)}%`} />
                        </span>
                      </div>
                      <div className="h-2 w-full border-2 border-border bg-background">
                        <AnimatedBar
                          percentage={candidate.percentage}
                          color={color}
                          delay={i * 0.06}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </>
          ) : (
            <div className="border-2 border-border">
              <table className="min-w-full">
                <thead className="border-b-2 border-border bg-secondary">
                  <tr>
                    <Th>Candidate</Th>
                    <Th>Party</Th>
                    <Th align="right">Votes</Th>
                    <Th align="right">%</Th>
                  </tr>
                </thead>
                <tbody>
                  {electionData.candidates.map((c, i) => (
                    <tr key={i} className="border-b border-border/40 last:border-b-0">
                      <Td className="font-display font-bold">{c.name}</Td>
                      <Td className="text-muted-foreground">{c.party}</Td>
                      <Td align="right" className="b-mono">
                        {c.votes.toLocaleString()}
                      </Td>
                      <Td align="right" className="b-mono font-bold">
                        {c.percentage}%
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center border-2 border-border bg-secondary">
        {icon}
      </div>
      <div>
        <dt className="b-label">{label}</dt>
        <dd className="font-display text-base font-bold">{value}</dd>
      </div>
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: "chart" | "table";
  onChange: (v: "chart" | "table") => void;
}) {
  return (
    <div className="inline-flex border-2 border-border">
      <button
        type="button"
        onClick={() => onChange("chart")}
        className={`flex h-8 w-9 items-center justify-center transition-colors ${
          value === "chart"
            ? "bg-foreground text-background"
            : "bg-background text-foreground hover:bg-secondary"
        }`}
        aria-label="Chart view"
      >
        <BarChart3 className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`flex h-8 w-9 items-center justify-center border-l-2 border-border transition-colors ${
          value === "table"
            ? "bg-foreground text-background"
            : "bg-background text-foreground hover:bg-secondary"
        }`}
        aria-label="Table view"
      >
        <Table2 className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2 text-sm ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}
