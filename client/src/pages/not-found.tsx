import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background px-4">
      <div className="absolute inset-0 b-grid-bg" aria-hidden />

      <div className="relative text-center">
        <div className="b-label mb-3">// error · 404</div>
        <div className="b-display text-[140px] leading-none tracking-tighter sm:text-[200px]">
          404
        </div>
        <h1 className="b-display mt-2 text-3xl sm:text-4xl">
          Page Not Found
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          The route you requested does not exist on this protocol. It may have
          been moved, or never existed.
        </p>

        <Link href="/">
          <Button size="lg" className="mt-8">
            <ArrowLeft className="mr-1" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
