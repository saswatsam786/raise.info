"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const { user, signOut, openAuthModal } = useAuth();
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-dropdown')) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-gradient-to-r from-slate-200 to-slate-300 shadow-lg border-b border-slate-300/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden group-hover:scale-105 transition-transform">
                <img 
                  src="/icon.png" 
                  alt="Salaris.fyi Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-2xl font-bold text-slate-700 group-hover:text-slate-800 transition-colors">
                salaris.fyi
              </h1>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Full-time */}
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-800 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-slate-200/50"
            >
              Full-time
            </Link>

            {/* Internship */}
            <Link
              href="/internships"
              className="text-slate-600 hover:text-slate-800 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-slate-200/50"
            >
              Internship
            </Link>

            {/* University */}
            <Link
              href="/university-data"
              className="text-slate-600 hover:text-slate-800 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-slate-200/50"
            >
              University
            </Link>

            {/* Community */}
            <Link
              href="/community"
              className="text-slate-600 hover:text-slate-800 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-slate-200/50"
            >
              Community
            </Link>

            {/* Auth Button / User Profile */}
            {user ? (
              <div className="relative user-dropdown">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-slate-200/50"
                >
                  <img
                    src={user.user_metadata?.avatar_url || user.user_metadata?.picture || "/default-avatar.png"}
                    alt={user.user_metadata?.full_name || user.user_metadata?.name || "User"}
                    className="w-8 h-8 rounded-full border-2 border-slate-300"
                  />
                  <span className="max-w-32 truncate">{user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      isUserDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-700 animate-slide-up">
                    <div className="py-1">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      {adminEmail && user.email === adminEmail && (
                        <Link
                          href="/admin"
                          className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                          onClick={() => setIsUserDropdownOpen(false)}
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          signOut();
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="bg-slate-400/20 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-400/30 transition-colors font-medium border border-slate-400/30 hover:border-slate-400/50"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => {
                // Mobile menu toggle logic would go here
                console.log("Mobile menu toggle");
              }}
              className="text-[#F0F0F0] hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
