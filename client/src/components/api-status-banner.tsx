import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ExternalLink } from "lucide-react";

interface ApiStatusBannerProps {
  show: boolean;
}

export function ApiStatusBanner({ show }: ApiStatusBannerProps) {
  if (!show) return null;

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 mb-4">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        <div className="flex items-center justify-between">
          <div>
            <strong>Blockchain API Configuration Required</strong>
            <p className="text-sm mt-1">
              Enhanced APIs need to be enabled in your Alchemy project for contract interactions to work.
            </p>
          </div>
          <a
            href="https://dashboard.alchemy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-orange-600 hover:text-orange-700 underline text-sm"
          >
            Configure
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </AlertDescription>
    </Alert>
  );
}