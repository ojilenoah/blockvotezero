import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, Lock, Eye, Zap } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ElectionStatus } from "@/components/election-status";
import { ElectionInfoCard } from "@/components/election-info-card";
import { LastElectionWinner } from "@/components/last-election-winner";
import { PreviousElections } from "@/components/previous-elections";
import { BlockchainTransparency } from "@/components/blockchain-transparency";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  CONTRACT_ADDRESS,
  IS_DEMO_MODE,
  getActiveElectionId,
  getElectionsBundle,
  explorerAddressUrl,
} from "@/utils/blockchain";
import {
  motion,
  staggerContainer,
  fadeUp,
  slideInRight,
  NumberRoll,
} from "@/lib/motion";

export default function Home() {
  const [hasActiveElection, setHasActiveElection] = useState(false);

  const { data: indexData } = useQuery({
    queryKey: ["homeIndex"],
    queryFn: async () => {
      const nextId = await getActiveElectionId();
      if (!nextId) {
        return { active: 0, upcoming: 0, completed: 0, totalVotes: 0, hasActive: false };
      }
      const ids = Array.from({ length: nextId - 1 }, (_, i) => nextId - 1 - i);
      const bundles = await getElectionsBundle(ids);
      const now = new Date();
      let active = 0, upcoming = 0, completed = 0, totalVotes = 0;
      let hasActive = false;
      for (const id of ids) {
        const b = bundles.get(id);
        if (!b?.info) continue;
        totalVotes += b.totalVotes;
        const { startTime, endTime, active: isActive } = b.info;
        if (isActive && now >= startTime && now <= endTime) {
          active++;
          hasActive = true;
        } else if (now < startTime) {
          upcoming++;
        } else {
          completed++;
        }
      }
      return { active, upcoming, completed, totalVotes, hasActive };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (indexData) setHasActiveElection(indexData.hasActive);
  }, [indexData]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* HERO ================================================================ */}
      <section className="relative overflow-hidden border-b-2 border-border">
        <div className="absolute inset-0 b-grid-bg" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:gap-16 lg:px-8 lg:py-24">
          {/* Left — headline + CTAs */}
          <motion.div
            variants={staggerContainer(0.08, 0.05)}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={fadeUp}
              className="mb-6 flex flex-wrap items-center gap-3"
            >
              <span className="inline-flex items-center gap-2 border-2 border-border bg-card px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] shadow-brutal-sm">
                <span className="h-2 w-2 bg-primary" />
                Polygon Amoy · Testnet
              </span>
              <ElectionStatus variant="inline" />
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="b-display text-6xl tracking-tight sm:text-7xl lg:text-[88px]"
            >
              VOTES THAT <br />
              <span className="bg-foreground px-2 text-background">CAN'T</span> BE <br />
              FAKED.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
            >
              A brutally simple voting protocol. Every ballot is signed, sealed,
              and stored on-chain. No central authority, no hidden tallies — just
              cryptographic proof anyone can verify.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link href={hasActiveElection ? "/vote" : "/register"}>
                <Button size="lg">
                  {hasActiveElection ? "Cast Your Vote" : "Register to Vote"}
                  <ArrowRight className="ml-1" />
                </Button>
              </Link>
              <Link href="/explorer">
                <Button size="lg" variant="outline">
                  View The Chain
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-10 flex flex-wrap gap-x-8 gap-y-3"
            >
              <Trust icon={<Lock />} label="Cryptographically sealed" />
              <Trust icon={<Eye />} label="Publicly auditable" />
              <Trust icon={<Zap />} label="Settled in seconds" />
            </motion.div>
          </motion.div>

          {/* Right — index card */}
          <motion.div
            variants={slideInRight}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="b-card">
              <div className="border-b-2 border-border bg-foreground px-4 py-2 text-background">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">
                    // protocol index
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">
                    LIVE
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2">
                <IndexStat
                  label="Live Now"
                  value={indexData?.active ?? "—"}
                  border="right bottom"
                  accent={!!indexData?.active}
                />
                <IndexStat
                  label="Upcoming"
                  value={indexData?.upcoming ?? "—"}
                  border="bottom"
                />
                <IndexStat
                  label="Completed"
                  value={indexData?.completed ?? "—"}
                  border="right"
                />
                <IndexStat
                  label="Total Votes"
                  value={
                    typeof indexData?.totalVotes === "number"
                      ? indexData.totalVotes.toLocaleString()
                      : "—"
                  }
                />
              </div>

              <div className="border-t-2 border-border bg-secondary/50 px-4 py-3">
                {IS_DEMO_MODE ? (
                  <>
                    <span className="b-label">// backend</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-block h-2 w-2 bg-warning b-blink" />
                      <span className="font-mono text-xs font-bold">
                        Supabase demo — no on-chain state
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="b-label">// contract</span>
                    <a
                      href={explorerAddressUrl(CONTRACT_ADDRESS)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block break-all font-mono text-xs hover:text-primary"
                    >
                      {CONTRACT_ADDRESS}
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* corner stamp */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 3 }}
              transition={{ delay: 0.7, type: "spring", stiffness: 200, damping: 12 }}
              className="absolute -right-2 -top-2 hidden border-2 border-border bg-primary px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-primary-foreground shadow-brutal-sm lg:block"
              aria-hidden
            >
              v.01 · 2025
            </motion.div>
          </motion.div>
        </div>

        {/* ticker */}
        <div className="border-t-2 border-border bg-foreground py-2 text-background overflow-hidden">
          <div className="b-marquee flex whitespace-nowrap">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex shrink-0 items-center gap-8 px-4 font-mono text-xs font-bold uppercase tracking-[0.2em]">
                <span>★ TRANSPARENT</span>
                <span>★ IMMUTABLE</span>
                <span>★ VERIFIABLE</span>
                <span>★ ON-CHAIN</span>
                <span>★ DECENTRALIZED</span>
                <span>★ TAMPER-PROOF</span>
                <span>★ OPEN-SOURCE</span>
                <span>★ POLYGON AMOY</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD ============================================================ */}
      <main className="flex-grow">
        <motion.div
          className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
          variants={staggerContainer(0.1, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={fadeUp}>
            <ElectionStatus />
          </motion.div>

          <motion.div
            variants={fadeUp}
            className={`mb-10 grid gap-6 ${
              !hasActiveElection ? "lg:grid-cols-2" : ""
            }`}
          >
            <ElectionInfoCard />
            {!hasActiveElection && <LastElectionWinner />}
          </motion.div>

          <motion.div variants={fadeUp}>
            <PreviousElections />
          </motion.div>
          <motion.div variants={fadeUp}>
            <BlockchainTransparency />
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center border-2 border-border bg-card [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
      </span>
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">
        {label}
      </span>
    </div>
  );
}

function IndexStat({
  label,
  value,
  border = "",
  accent = false,
}: {
  label: string;
  value: number | string;
  border?: string;
  accent?: boolean;
}) {
  const borderClasses = [
    border.includes("right") ? "border-r-2 border-border" : "",
    border.includes("bottom") ? "border-b-2 border-border" : "",
  ].join(" ");
  const numeric = typeof value === "number" ? value : null;
  return (
    <div className={`p-4 ${borderClasses} ${accent ? "bg-primary/10" : ""}`}>
      <div className="b-label">{label}</div>
      <div className={`b-mono mt-1 text-3xl font-bold ${accent ? "text-primary" : ""}`}>
        {numeric !== null ? (
          <NumberRoll value={numeric} format={(v) => Math.round(v).toLocaleString()} />
        ) : (
          value
        )}
      </div>
    </div>
  );
}
