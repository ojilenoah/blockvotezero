import { useEffect, useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { useMetaMask } from "@/hooks/use-metamask";
import { Button } from "@/components/ui/button";
import { CONTRACT_ADDRESS, EXPLORER_BASE_URL, IS_DEMO_MODE } from "@/utils/blockchain";

export function BlockchainTransparency() {
  const { chainId } = useMetaMask();
  const [explorerBaseUrl, setExplorerBaseUrl] = useState(EXPLORER_BASE_URL);

  useEffect(() => {
    if (chainId) {
      const hex = chainId.startsWith("0x")
        ? chainId
        : `0x${parseInt(chainId).toString(16)}`;
      switch (hex.toLowerCase()) {
        case "0x89":
          setExplorerBaseUrl("https://polygonscan.com");
          break;
        case "0x13882":
        case "0xe9":
        default:
          setExplorerBaseUrl(EXPLORER_BASE_URL);
      }
    }
  }, [chainId]);

  const networkLabel =
    chainId === "0x13882" || chainId === "0xe9"
      ? "POLYGON AMOY"
      : chainId === "0x89"
      ? "POLYGON MAINNET"
      : chainId
      ? "UNKNOWN NETWORK"
      : "POLYGON AMOY";

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between border-b-2 border-border pb-2">
        <h2 className="b-display text-2xl">
          {IS_DEMO_MODE ? "Demo Backend" : "Transparency"}
        </h2>
        <span className="b-label">
          {IS_DEMO_MODE ? "// supabase" : "// on-chain"}
        </span>
      </div>

      <div className="b-card">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
          <div className="border-b-2 border-border p-6 lg:border-b-0 lg:border-r-2">
            {IS_DEMO_MODE ? (
              <>
                <h3 className="b-display text-2xl">Running in Demo Mode.</h3>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  Elections, candidates, and votes live in Supabase tables —
                  not on a public blockchain. The flow is identical, but
                  there's no gas, no contract, and nothing externally
                  verifiable. Flip <span className="font-mono text-foreground">VITE_DEMO_MODE=false</span> to
                  switch over to the real Polygon contract.
                </p>
              </>
            ) : (
              <>
                <h3 className="b-display text-2xl">Every Vote, Verifiable.</h3>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  The contract behind every BlockVote election is open-source
                  and deployed on a public testnet. Anyone — voter, observer,
                  journalist — can independently confirm every ballot.
                </p>

                <a
                  href={`${explorerBaseUrl}/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-block"
                >
                  <Button variant="foreground">
                    View Contract on Explorer
                    <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
                  </Button>
                </a>
              </>
            )}
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {IS_DEMO_MODE ? (
                <>
                  <Row label="Backend" value="Supabase Postgres" />
                  <Row label="Tables" value="elections · candidates · votes" mono />
                  <Row label="Wallet" value="Demo (localStorage)" />
                </>
              ) : (
                <>
                  <Row label="Contract" value={CONTRACT_ADDRESS} mono />
                  <Row label="Network" value={networkLabel} />
                  <Row label="Standard" value="Custom VotingSystem ABI" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="border-b-2 border-dashed border-border/40 pb-3 last:border-b-0 last:pb-0">
      <div className="b-label flex items-center gap-1.5">
        <Link2 className="h-3 w-3" strokeWidth={2.5} />
        {label}
      </div>
      <div
        className={`mt-1 break-all text-sm font-bold ${
          mono ? "b-mono" : "font-display"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
