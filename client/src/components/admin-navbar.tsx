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
                <a className="flex items-center">
                  <svg
                    className="h-8 w-8 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="ml-2 font-bold text-xl">VoteChain Admin</span>
                </a>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/admin/dashboard">
                <a className="inline-flex items-center px-1 pt-1 border-b-2 border-primary text-sm font-medium text-gray-900">
                  Dashboard
                </a>
              </Link>
              <Link href="/">
                <a className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">
                  View Public Site
                </a>
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="flex items-center">
              <div className="text-sm text-gray-500 mr-4">
                <span className="hidden md:inline">Connected:</span>{" "}
                <span className="font-mono">{address}</span>
              </div>
              <Button variant="outline" size="sm" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}