import { Link } from "wouter";
import { LogOut, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface AdminNavbarProps {
  /** Email of the signed-in admin (Supabase Auth) */
  identity: string;
  onLogout: () => void;
}

export function AdminNavbar({ identity, onLogout }: AdminNavbarProps) {
  return (
    <nav className="sticky top-0 z-40 border-b-2 border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Wordmark + admin badge */}
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="group flex cursor-pointer items-center gap-2">
              <motion.div
                whileHover={{ rotate: -8, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                className="flex h-8 w-8 items-center justify-center border-2 border-border bg-primary text-primary-foreground shadow-brutal-sm"
              >
                <span className="font-display text-lg font-bold leading-none">B</span>
              </motion.div>
              <span className="font-display text-xl font-bold tracking-tight">
                BLOCKVOTE
              </span>
            </div>
          </Link>

          <span className="hidden border-2 border-border bg-foreground px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-background sm:inline-flex sm:items-center sm:gap-1">
            <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
            Admin
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Signed in
            </div>
            <div
              className="b-mono max-w-[200px] truncate text-sm font-bold"
              title={identity}
            >
              {identity}
            </div>
          </div>

          <ThemeToggle />

          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="mr-1 h-4 w-4" /> Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
