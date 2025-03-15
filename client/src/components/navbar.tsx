import { Link, useLocation } from "wouter";
import { useState } from "react";

export function Navbar() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
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
              <Link href="/">
                <div className={`${location === '/' ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                  Home
                </div>
              </Link>
              <Link href="/vote">
                <div className={`${location === '/vote' ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                  Vote
                </div>
              </Link>
              <Link href="/explorer">
                <div className={`${location === '/explorer' ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                  Explorer
                </div>
              </Link>
              <Link href="/register">
                <div className={`${location === '/register' ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                  Register
                </div>
              </Link>
              <Link href="/admin/login">
                <div className={`${location.startsWith('/admin') ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                  Admin
                </div>
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <div className="ml-3 sm:hidden">
              <button 
                type="button" 
                className="bg-white p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      <div className={`sm:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`} id="mobile-menu">
        <div className="pt-2 pb-3 space-y-1">
          <Link href="/">
            <div className={`${location === '/' ? 'bg-primary border-primary text-white' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`}>
              Home
            </div>
          </Link>
          <Link href="/vote">
            <div className={`${location === '/vote' ? 'bg-primary border-primary text-white' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`}>
              Vote
            </div>
          </Link>
          <Link href="/explorer">
            <div className={`${location === '/explorer' ? 'bg-primary border-primary text-white' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`}>
              Explorer
            </div>
          </Link>
          <Link href="/register">
            <div className={`${location === '/register' ? 'bg-primary border-primary text-white' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`}>
              Register
            </div>
          </Link>
          <Link href="/admin/login">
            <div className={`${location.startsWith('/admin') ? 'bg-primary border-primary text-white' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`}>
              Admin
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
