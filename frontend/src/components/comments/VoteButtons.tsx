"use client";

import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface VoteButtonsProps {
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null;
  onVote: (voteType: "up" | "down") => void;
  isDisabled?: boolean;
}

export default function VoteButtons({
  upvotes,
  downvotes,
  userVote,
  onVote,
  isDisabled = false,
}: VoteButtonsProps) {
  const score = upvotes - downvotes;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onVote("up")}
        disabled={isDisabled}
        className={`p-1 rounded hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          userVote === "up" ? "text-orange-600" : "text-slate-500"
        }`}
        aria-label="Upvote"
      >
        <ChevronUp className="w-5 h-5" />
      </button>
      <span className="text-sm font-medium min-w-[2rem] text-center text-slate-600">
        {score}
      </span>
      <button
        onClick={() => onVote("down")}
        disabled={isDisabled}
        className={`p-1 rounded hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          userVote === "down" ? "text-blue-600" : "text-slate-500"
        }`}
        aria-label="Downvote"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}
