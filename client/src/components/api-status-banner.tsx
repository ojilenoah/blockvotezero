import { AlertTriangle, ExternalLink } from "lucide-react";

interface ApiStatusBannerProps {
  show: boolean;
}

export function ApiStatusBanner({ show }: ApiStatusBannerProps) {
  if (!show) return null;

  return (
    <div className="mb-6 border-2 border-warning bg-warning/10 p-4 shadow-brutal-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center border-2 border-border bg-warning text-warning-foreground">
          <AlertTriangle className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <div className="b-label">// notice</div>
          <h4 className="font-display text-base font-bold">
            Blockchain API Configuration Required
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Enhanced APIs need to be enabled in your Alchemy project for
            contract interactions to work.
          </p>
        </div>
        <a
          href="https://dashboard.alchemy.com"
          target="_blank"
          rel="noopener noreferrer"
          className="
            inline-flex flex-shrink-0 items-center gap-1
            border-2 border-border bg-background px-3 py-2
            font-display text-xs font-bold uppercase tracking-wide
            shadow-brutal-sm transition-[transform,box-shadow] duration-75
            hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none
          "
        >
          Configure
          <ExternalLink className="h-3 w-3" strokeWidth={2.5} />
        </a>
      </div>
    </div>
  );
}
