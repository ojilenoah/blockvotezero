import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { IS_DEMO_MODE } from "@/utils/blockchain";
import { motion } from "framer-motion";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/vote", label: "Vote" },
  { href: "/explorer", label: "Explorer" },
  { href: "/register", label: "Register" },
  { href: "/admin/login", label: "Admin", match: "/admin" },
];

function isActive(current: string, link: (typeof NAV_LINKS)[number]) {
  if (link.match) return current.startsWith(link.match);
  return current === link.href;
}

export function Navbar() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b-2 border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Wordmark */}
        <Link href="/">
          <div className="group flex cursor-pointer items-center gap-2">
            <motion.div
              className="flex h-8 w-8 items-center justify-center border-2 border-border bg-primary text-primary-foreground shadow-brutal-sm"
              whileHover={{ rotate: -8, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 12 }}
            >
              <span className="font-display text-lg font-bold leading-none">
                B
              </span>
            </motion.div>
            <span className="font-display text-xl font-bold tracking-tight">
              BLOCKVOTE
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground sm:inline">
              v.01
            </span>
            {IS_DEMO_MODE && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 15 }}
                className="ml-1 hidden border-2 border-border bg-warning px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-warning-foreground sm:inline"
                title="Running in demo mode — backed by Supabase, not the blockchain."
              >
                Demo
              </motion.span>
            )}
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(location, link);
            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={`
                    relative cursor-pointer px-3 py-2
                    font-display text-sm font-semibold uppercase tracking-wide
                    transition-colors
                    ${
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  {link.label}
                  {active && (
                    <span
                      className="absolute inset-x-2 -bottom-0.5 h-1 bg-primary"
                      aria-hidden
                    />
                  )}
                </div>
              </Link>
            );
          })}
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            className="inline-flex h-10 w-10 items-center justify-center border-2 border-border bg-background shadow-brutal-sm transition-[transform,box-shadow] duration-75 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
          >
            {open ? (
              <X className="h-4 w-4" strokeWidth={2.5} />
            ) : (
              <Menu className="h-4 w-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {open && (
        <div className="border-t-2 border-border bg-background sm:hidden">
          <div className="mx-auto max-w-7xl px-4 py-2">
            {NAV_LINKS.map((link) => {
              const active = isActive(location, link);
              return (
                <Link key={link.href} href={link.href}>
                  <div
                    onClick={() => setOpen(false)}
                    className={`
                      flex cursor-pointer items-center justify-between
                      border-b border-border/40 py-3
                      font-display text-base font-semibold uppercase tracking-wide
                      ${active ? "text-foreground" : "text-muted-foreground"}
                    `}
                  >
                    <span>{link.label}</span>
                    {active && <span className="h-3 w-3 bg-primary" />}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
