"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/config";

interface PendingSubmission {
  id: string;
  company: string;
  role: string;
  location: string;
  total_compensation: string;
  type: string;
  employment_type: string | null;
  years_of_experience: number | null;
  created_at: string;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }

    if (!adminEmail || user.email !== adminEmail) {
      router.replace("/");
    }
  }, [user, loading, router, adminEmail]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!user) return;

      try {
        setIsLoadingSubmissions(true);
        setError(null);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const token = session?.access_token;
        if (!token) {
          throw new Error("Missing access token");
        }

        const res = await fetch("/api/admin/pending-submissions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load submissions");
        }

        const body = await res.json();
        setSubmissions(body.submissions || []);
      } catch (err: any) {
        console.error("Error loading submissions:", err);
        setError(err.message || "Failed to load submissions");
      } finally {
        setIsLoadingSubmissions(false);
      }
    };

    if (!loading && user && adminEmail && user.email === adminEmail) {
      fetchSubmissions();
    }
  }, [user, loading, adminEmail]);

  const refresh = async () => {
    // Reuse the effect logic by updating state dependencies is complex; instead call the API directly.
    if (!user) return;
    try {
      setIsLoadingSubmissions(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch("/api/admin/pending-submissions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const body = await res.json();
      setSubmissions(body.submissions || []);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!user) return;
    setActionLoadingId(id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Missing access token");
      }

      const res = await fetch(`/api/admin/pending-submissions/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to approve submission");
      }

      await refresh();
    } catch (err: any) {
      console.error("Error approving submission:", err);
      setError(err.message || "Failed to approve submission");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!user) return;
    const reason = window.prompt("Optional: Enter a reason for rejection") || null;
    setActionLoadingId(id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Missing access token");
      }

      const res = await fetch(`/api/admin/pending-submissions/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to reject submission");
      }

      await refresh();
    } catch (err: any) {
      console.error("Error rejecting submission:", err);
      setError(err.message || "Failed to reject submission");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (!user || !adminEmail || user.email !== adminEmail) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="mt-2 text-slate-600">
            Review user-submitted salary entries before publishing them.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Pending submissions</h2>
            <button
              onClick={refresh}
              disabled={isLoadingSubmissions}
              className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {isLoadingSubmissions ? (
            <div className="p-6 text-center text-slate-500">Loading...</div>
          ) : submissions.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              No pending submissions right now.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Comp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {submissions.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {s.company}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {s.role}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {s.location}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {s.total_compensation}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {s.type}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(s.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => handleApprove(s.id)}
                            disabled={actionLoadingId === s.id}
                            className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(s.id)}
                            disabled={actionLoadingId === s.id}
                            className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


