import { Github, Twitter, FileText } from "lucide-react";
import { Link } from "wouter";
import { CONTRACT_ADDRESS, EXPLORER_BASE_URL, IS_DEMO_MODE } from "@/utils/blockchain";

export function Footer() {
  return (
    <footer className="border-t-2 border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Big wordmark band */}
        <div className="mb-8 border-b-2 border-border pb-8">
          <div className="b-display text-6xl tracking-tighter sm:text-8xl lg:text-[140px]">
            BLOCKVOTE<span className="text-primary">.</span>
          </div>
        </div>

        {/* Link grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <Col label="Protocol">
            <FLink href="/">Home</FLink>
            <FLink href="/vote">Vote</FLink>
            <FLink href="/explorer">Explorer</FLink>
            <FLink href="/register">Register</FLink>
          </Col>
          <Col label="Admin">
            <FLink href="/admin/login">Sign In</FLink>
            <FLink href="/admin/dashboard">Dashboard</FLink>
          </Col>
          <Col label="Resources">
            <FAnchor href={EXPLORER_BASE_URL} external>
              Block Explorer
            </FAnchor>
            <FAnchor href="https://polygon.technology/" external>
              Polygon Network
            </FAnchor>
          </Col>
          <Col label="Connect">
            <div className="flex gap-2">
              <SocialIcon href="#" label="GitHub">
                <Github className="h-4 w-4" strokeWidth={2.5} />
              </SocialIcon>
              <SocialIcon href="#" label="Twitter">
                <Twitter className="h-4 w-4" strokeWidth={2.5} />
              </SocialIcon>
              <SocialIcon href="#" label="Docs">
                <FileText className="h-4 w-4" strokeWidth={2.5} />
              </SocialIcon>
            </div>
          </Col>
        </div>

        {/* Bottom strip */}
        <div className="mt-10 flex flex-col items-start gap-3 border-t-2 border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {IS_DEMO_MODE ? (
              <>
                <span className="b-label">// backend</span>
                <span className="b-mono text-xs">Supabase (demo mode)</span>
              </>
            ) : (
              <>
                <span className="b-label">// contract</span>
                <span className="b-mono text-xs break-all">{CONTRACT_ADDRESS}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="b-label">© 2025 BlockVote · All rights reserved</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Col({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="b-label mb-3">{label}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function FLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}>
      <span className="cursor-pointer font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground">
        {children}
      </span>
    </Link>
  );
}

function FAnchor({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </a>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="
        flex h-10 w-10 items-center justify-center
        border-2 border-border bg-background text-foreground
        shadow-brutal-sm transition-[transform,box-shadow] duration-75
        hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none
        hover:bg-primary hover:text-primary-foreground
      "
    >
      {children}
    </a>
  );
}
