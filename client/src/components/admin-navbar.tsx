import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface AdminNavbarProps {
  address: string;
  onLogout: () => void;
}

export function AdminNavbar({ address, onLogout }: AdminNavbarProps) {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <div className="flex items-center cursor-pointer">
                  <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span className="ml-2 text-xl font-semibold text-gray-900">BlockVote</span>
                </div>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/admin/dashboard">
                <div className="inline-flex items-center px-1 pt-1 border-b-2 border-primary text-sm font-medium text-gray-900 cursor-pointer">
                  Dashboard
                </div>
              </Link>
              <Link href="/">
                <div className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 cursor-pointer">
                  View Public Site
                </div>
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <div className="text-sm text-gray-500 mr-4">
              <span className="hidden md:inline">Connected:</span>{" "}
              <span className="font-mono truncate max-w-[120px] inline-block align-bottom">{address}</span>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}