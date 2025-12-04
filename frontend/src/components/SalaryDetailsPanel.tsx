"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Maximize2, MessageSquare, Share2 } from "lucide-react";
import { CommentSection } from "./comments";
import { useAuth } from "@/contexts/AuthContext";
import { voteOnSalary, getUserVote } from "@/lib/supabase/salaryVotes";
import VoteButtons from "./comments/VoteButtons";

interface SalaryData {
  id?: string;
  company_name?: string;
  company?: string;
  designation?: string;
  role?: string;
  location: string;
  min_salary?: number;
  max_salary?: number;
  avg_salary?: number;
  stipend_min?: number;
  stipend_max?: number;
  stipend_avg?: number;
  yoe?: number;
  reports: number;
  university?: string;
  employment_type?: string;
  duration?: string;
  year?: number;
  base_salary?: number;
  bonus?: number;
  stock_compensation?: number;
  total_compensation?: number;
  upvotes?: number;
  downvotes?: number;
}

interface SalaryDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  data: SalaryData | null;
  onRefresh?: () => void;
}

export default function SalaryDetailsPanel({
  isOpen,
  onClose,
  data,
  onRefresh,
}: SalaryDetailsPanelProps) {
  const router = useRouter();
  const { user, openAuthModal } = useAuth();
  const [votes, setVotes] = useState({
    upvotes: data?.upvotes || 0,
    downvotes: data?.downvotes || 0,
  });
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  
  // Generate a unique salary ID for comments/votes
  const salaryId = useMemo(() => {
    if (!data) return "";
    // Always use database ID for voting (must be UUID)
    if (data.id) {
      return data.id;
    }
    // Fallback: generate from data for comments
    const company = data.company_name || data.company || "unknown";
    const role = data.designation || data.role || "unknown";
    const location = data.location || "unknown";
    return `${company}-${role}-${location}`.toLowerCase().replace(/\s+/g, "-");
  }, [data]);

  const handleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!data?.id) {
      console.log("No ID found in data");
      return;
    }

    // Check if it's a valid UUID (database entry)
    // UUID format: 8-4-4-4-12 hexadecimal characters
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(data.id)) {
      // Database entry - navigate to the page
      router.push(`/salaries/${data.id}`);
    } else {
      // TODO: Remove this else block once hardcoded data for internships and university is no longer used
      // Hardcoded entry - pass data via sessionStorage
      const expandedData = {
        id: data.id,
        company_name: data.company_name || data.company,
        designation: data.designation || data.role,
        location: data.location,
        yoe: data.yoe || 0,
        avg_salary: data.avg_salary || data.stipend_avg || data.total_compensation || 0,
        data_points_count: data.reports || 1,
        reports: data.reports || 1,
        base_salary: data.base_salary,
        bonus: data.bonus,
        stock_compensation: data.stock_compensation,
        total_compensation: data.total_compensation || data.avg_salary || data.stipend_avg,
        upvotes: data.upvotes || 0,
        downvotes: data.downvotes || 0,
        stipend_avg: data.stipend_avg,
        duration: data.duration,
        university: data.university,
        employment_type: data.employment_type,
        year: data.year,
        additional_data: data.duration ? { duration: data.duration } : undefined,
        job_type: data.stipend_avg ? "internship" : undefined,
      };
      // Store data in sessionStorage for the expanded page to retrieve
      sessionStorage.setItem(`salary_${data.id}`, JSON.stringify(expandedData));
      // Navigate to the page
      router.push(`/salaries/${data.id}`);
    }
  };

  // Update votes when data changes
  useEffect(() => {
    if (data) {
      setVotes({
        upvotes: data.upvotes || 0,
        downvotes: data.downvotes || 0,
      });
    }
  }, [data?.id, data?.upvotes, data?.downvotes]);

  const loadUserVote = async () => {
    try {
      const vote = await getUserVote(salaryId);
      setUserVote(vote);
    } catch (error) {
      console.error("Error loading user vote:", error);
      setUserVote(null); // Reset on error
    }
  };

  // Load user vote
  useEffect(() => {
    if (salaryId && data?.id && user) {
      // Only load user vote if user is logged in and we have a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(data.id)) {
        loadUserVote();
      } else {
        // For non-UUID entries (hardcoded data), reset userVote
        setUserVote(null);
      }
    } else {
      // Reset userVote if no user or no data
      setUserVote(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaryId, data?.id, user]);

  const handleVote = async (voteType: "up" | "down") => {
    if (!user) {
      openAuthModal();
      return;
    }

    if (isVoting || !data?.id) return;

    // Only allow voting on database entries (UUIDs), not hardcoded data
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.id)) {
      alert("Voting is only available for verified salary entries");
      return;
    }

    try {
      setIsVoting(true);
      const result = await voteOnSalary(salaryId, voteType);

      if (result.success) {
        // Use the vote counts returned from the API (already updated by database trigger)
        if (result.upvotes !== undefined && result.downvotes !== undefined) {
          setVotes({
            upvotes: result.upvotes,
            downvotes: result.downvotes,
          });
        }

        // Update user vote state from API response
        if (result.userVote !== undefined) {
          setUserVote(result.userVote);
        }
        
        // Refresh parent component data to sync with database
        // Wait longer to ensure database trigger completes (API waits 500ms, we wait 700ms more)
        if (onRefresh) {
          setTimeout(() => {
            onRefresh();
          }, 700);
        }
      } else {
        // Show error message if voting failed
        if (result.message) {
          alert(result.message);
        }
      }
    } catch (error) {
      console.error("Error voting:", error);
      alert("An error occurred while voting. Please try again.");
    } finally {
      setIsVoting(false);
    }
  };

  // Debug logging
  useEffect(() => {
    if (data) {
      console.log(
        "SalaryDetailsPanel - data:",
        data,
        "data.id:",
        data.id,
        "has id:",
        !!data.id,
        "user:",
        user?.id,
        "userVote:",
        userVote,
        "isVoting:",
        isVoting
      );
    }
  }, [data, user, userVote, isVoting]);

  const formatCurrency = (amount: number) => {
    return `Rs ${new Intl.NumberFormat("en-IN").format(amount)}`;
  };

  const formatCurrencyCompact = (amount: number) => {
    if (amount >= 10000000) {
      return `Rs ${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `Rs ${(amount / 100000).toFixed(1)}L`;
    }
    return formatCurrency(amount);
  };

  const calculateCTCBreakup = () => {
    if (!data) return null;

    const isInternship = !!data.stipend_avg;

    if (isInternship) {
      const stipend = data.stipend_avg || 0;
      return {
        total: stipend,
        components: [
          { name: "Monthly Stipend", amount: stipend, percentage: 100 },
        ],
      };
    }

    // Use real data from database if available
    const total = data.total_compensation || data.avg_salary || 0;
    const base = data.base_salary || 0;
    const bonus = data.bonus || 0;
    const stock = data.stock_compensation || 0;

    // If we have the actual breakdown from database, use it
    if (base > 0) {
      const components = [];

      if (base > 0) {
        const basePercent = total > 0 ? Math.round((base / total) * 100) : 0;
        components.push({
          name: "Base Salary",
          amount: base,
          percentage: basePercent,
        });
      }

      if (bonus > 0) {
        const bonusPercent = total > 0 ? Math.round((bonus / total) * 100) : 0;
        components.push({
          name: "Bonus",
          amount: bonus,
          percentage: bonusPercent,
        });
      }

      if (stock > 0) {
        const stockPercent = total > 0 ? Math.round((stock / total) * 100) : 0;
        components.push({
          name: "Stock",
          amount: stock,
          percentage: stockPercent,
        });
      }

      if (components.length > 0) {
        return { total, components };
      }
    }

    // Fallback: calculate estimated breakdown if no detailed data
    const estimatedBase = Math.round(total * 0.7);
    const estimatedHra = Math.round(total * 0.2);
    const estimatedAllowances = total - estimatedBase - estimatedHra;

    return {
      total,
      components: [
        { name: "Base Salary", amount: estimatedBase, percentage: 70 },
        { name: "HRA", amount: estimatedHra, percentage: 20 },
        {
          name: "Other Allowances",
          amount: estimatedAllowances,
          percentage: 10,
        },
      ],
    };
  };

  const ctcBreakup = calculateCTCBreakup();

  if (!isOpen || !data) return null;

  return (
    <div className="w-[30%] bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200 flex flex-col h-full">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">
                    {data.company_name || data.company}
                  </h2>
                  <img
                    src="/verified_logo.png"
                    alt="Verified"
                    className="w-8 h-8"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {data?.id && (
                    <button
                      onClick={handleExpand}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Expand to full page"
                      type="button"
                    >
                      <Maximize2 className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-1">
                {data.designation || data.role} • {data.location}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white min-h-0 flex flex-col">
          {/* CTC Breakup Section */}
          <div className="px-6 py-4 flex-shrink-0">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              CTC Breakup
            </h3>
            {ctcBreakup && (
              <div className="w-full space-y-2">
                {ctcBreakup.components.map((component, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-gray-200 shadow-sm"
                  >
                    <span className="text-sm text-gray-700 font-medium">
                      {component.name}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrencyCompact(component.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {component.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-200 rounded-lg border-2 border-gray-300 mt-2">
                  <span className="text-sm font-bold text-gray-900">
                    Total CTC
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrencyCompact(ctcBreakup.total)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Interaction Bar */}
          <div className="px-6 py-3 flex-shrink-0">
            <div className="flex items-center gap-6">
              {(() => {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const isValidUuid = data?.id ? uuidRegex.test(data.id) : false;
                // Only disable if: voting in progress, no data ID, or invalid UUID
                // Allow clicking when not logged in (will open auth modal)
                // Don't disable based on userVote - allow vote changes
                const isDisabled = isVoting || !data?.id || !isValidUuid;
                
                return (
                  <div className="flex items-center gap-2">
                    <VoteButtons
                      upvotes={votes.upvotes}
                      downvotes={votes.downvotes}
                      userVote={userVote}
                      onVote={(voteType) => handleVote(voteType)}
                      isDisabled={isDisabled}
                    />
                    {user && !isValidUuid && data?.id && (
                      <span className="text-xs text-gray-500 italic">
                        (Voting only for verified entries)
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">
                  {commentCount}
                </span>
              </div>

              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors ml-auto">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="px-6 pt-4 pb-4 border-t border-gray-200 flex-1 min-h-0 overflow-y-auto">
            <CommentSection
              salaryId={salaryId}
              upvoteCount={data.upvotes || 0}
              downvoteCount={data.downvotes || 0}
              onVoteChange={onRefresh}
              onCommentCountChange={setCommentCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
