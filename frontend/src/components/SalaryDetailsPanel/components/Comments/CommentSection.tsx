"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import CommentInput from "./CommentInput";
import CommentItem from "./CommentItem";
import { CommentWithReplies, SortOption, Attachment } from "@/types/comments";
import { useAuth } from "@/contexts/AuthContext";
import { getComments, addComment, voteOnComment, deleteComment } from "@/lib/supabase/comments";

interface CommentSectionProps {
  salaryId: string;
  upvoteCount?: number;
  downvoteCount?: number;
  initialCommentCount?: number;
  onVoteChange?: () => void;
  onCommentCountChange?: (count: number) => void;
}

export default function CommentSection({
  salaryId,
  upvoteCount = 91,
  downvoteCount = 6,
  initialCommentCount = 0,
  onVoteChange,
  onCommentCountChange,
}: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(3);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load comments
  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaryId, sortBy]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const fetchedComments = await getComments(salaryId, sortBy);
      setComments(fetchedComments);
      const count = fetchedComments.length;
      setCommentCount(count);
      if (onCommentCountChange) {
        onCommentCountChange(count);
      }
      setCurrentPage(1);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnonymousName = () => {
    const adjectives = [
      "Curious",
      "Bright",
      "Clever",
      "Savvy",
      "Smart",
      "Wise",
      "Bold",
    ];
    const nouns = [
      "Analyst",
      "Engineer",
      "Developer",
      "Professional",
      "Expert",
      "Specialist",
    ];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 1000);
    return `${randomAdj}${randomNoun}${randomNum}`;
  };

  const handleAddComment = async (
    content: string,
    attachments?: Attachment[]
  ) => {
    // Require authentication before adding comment
    if (!user) {
      throw new Error("You must be signed in to post comments");
    }

    try {
      const userId = user.id;
      const displayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        generateAnonymousName();
      const photoURL =
        user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

      await addComment(
        salaryId,
        userId,
        displayName,
        photoURL,
        content,
        attachments
      );
      await loadComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  };

  // Reply feature removed

  const handleVoteComment = async (
    commentId: string,
    voteType: "up" | "down"
  ) => {
    if (!user) return;

    try {
      await voteOnComment(commentId, user.id, voteType);
      await loadComments();
    } catch (error) {
      console.error("Error voting on comment:", error);
    }
  };

  // Delete comment handler
  const handleDeleteComment = (commentId: string) => {
    setPendingDeleteId(commentId);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      setIsDeleting(true);
      await deleteComment(pendingDeleteId);
      setPendingDeleteId(null);
      await loadComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Comments Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          Comments ({commentCount})
        </h3>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm text-slate-600 bg-white border border-slate-300 rounded-lg px-3 py-1.5 pr-8 appearance-none cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          >
            <option value="all">Sort by: All</option>
            <option value="best">Sort by: Most votes</option>
            <option value="newest">Sort by: Newest</option>
            <option value="oldest">Sort by: Oldest</option>
          </select>
          <svg
            className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
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
        </div>
      </div>

      {/* Comment Input */}
      <div className="mb-6">
        <CommentInput onSubmit={handleAddComment} />
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-600">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-6 bg-slate-50 rounded-lg border border-slate-200">
          <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">
            No comments yet. Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {comments
              .slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage)
              .map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onVote={handleVoteComment}
                  onDelete={handleDeleteComment}
                />
              ))}
          </div>

          {Math.ceil(comments.length / itemsPerPage) > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 bg-white border border-gray-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>

              <div className="flex gap-2">
                {Array.from(
                  { length: Math.ceil(comments.length / itemsPerPage) },
                  (_, i) => i + 1
                ).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      page === currentPage
                        ? "bg-slate-500 text-white shadow-md"
                        : "text-gray-700 bg-white border border-gray-300 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, Math.ceil(comments.length / itemsPerPage)))
                }
                disabled={currentPage === Math.ceil(comments.length / itemsPerPage)}
                className="px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 bg-white border border-gray-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPendingDeleteId(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 p-5">
            <h4 className="text-base font-semibold text-slate-900 mb-2">Delete comment?</h4>
            <p className="text-sm text-slate-600 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingDeleteId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

