"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase/config";
import { CommentSection } from "@/components/comments";

interface SalaryData {
  id?: string;
  company_name?: string;
  company?: string;
  designation?: string;
  role?: string;
  location: string;
  years_of_experience?: number | null;
  yoe?: number;
  avg_salary?: number;
  data_points_count?: number | null;
  reports?: number;
  base_salary?: number | null;
  bonus?: number | null;
  stock_compensation?: number | null;
  total_compensation?: number | null;
  upvotes?: number | null;
  downvotes?: number | null;
  // Internship fields
  stipend_min?: number;
  stipend_max?: number;
  stipend_avg?: number;
  duration?: string;
  // University fields
  university?: string;
  employment_type?: string;
  year?: number;
  // Additional data
  additional_data?: {
    duration?: string;
    stipend?: string;
    university?: string;
    year?: string;
    employment_type?: "Full-time" | "Internship";
  };
  job_type?: string;
}

export default function SalaryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const salaryId = params.id as string;
  
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalaryData = async () => {
      try {
        setLoading(true);
        
        // TODO: Remove this hardcoded entry handling once hardcoded data for internships and university is no longer used
        // Check if it's a hardcoded entry (non-UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isHardcoded = !uuidRegex.test(salaryId);
        
        if (isHardcoded) {
          // Try to load from sessionStorage
          const storedData = sessionStorage.getItem(`salary_${salaryId}`);
          if (storedData) {
            try {
              const parsedData = JSON.parse(storedData);
              setSalaryData(parsedData);
              setLoading(false);
              return;
            } catch (e) {
              console.error("Error parsing stored data:", e);
            }
          }
          // If no stored data, show error
          setError("Salary data not found");
          setLoading(false);
          return;
        }

        // Database entry - fetch from Supabase
        const { data, error: fetchError } = await supabase
          .from("salaries")
          .select(
            "id, company_name, designation, location, years_of_experience, avg_salary, data_points_count, base_salary, bonus, stock_compensation, total_compensation, upvotes, downvotes, job_type, additional_data"
          )
          .eq("id", salaryId)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Salary data not found");
          return;
        }

        // Extract additional data
        const additionalData = data.additional_data || {};
        const isInternship = data.job_type === "internship";

        setSalaryData({
          id: data.id,
          company_name: data.company_name,
          designation: data.designation,
          location: data.location,
          years_of_experience: data.years_of_experience,
          yoe: data.years_of_experience || 0,
          avg_salary: data.avg_salary || 0,
          data_points_count: data.data_points_count,
          reports: data.data_points_count ?? 1,
          base_salary: data.base_salary,
          bonus: data.bonus,
          stock_compensation: data.stock_compensation,
          total_compensation: data.total_compensation,
          upvotes: data.upvotes || 0,
          downvotes: data.downvotes || 0,
          // Internship fields
          stipend_avg: isInternship ? (data.total_compensation || data.avg_salary || 0) : undefined,
          duration: additionalData.duration,
          // University fields
          university: additionalData.university,
          employment_type: additionalData.employment_type,
          year: additionalData.year ? Number(additionalData.year) : undefined,
          // Additional data
          additional_data: additionalData,
          job_type: data.job_type,
        });
      } catch (err: any) {
        console.error("Error fetching salary data:", err);
        setError(err.message || "Failed to load salary data");
      } finally {
        setLoading(false);
      }
    };

    if (salaryId) {
      fetchSalaryData();
    }
  }, [salaryId]);

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
    if (!salaryData) return null;

    const isInternship = !!salaryData.stipend_avg;

    if (isInternship) {
      const stipend = salaryData.stipend_avg || 0;
      return {
        total: stipend,
        components: [
          { name: "Monthly Stipend", amount: stipend, percentage: 100 },
        ],
      };
    }

    // Use real data from database if available
    const total = salaryData.total_compensation || salaryData.avg_salary || 0;
    const base = salaryData.base_salary || 0;
    const bonus = salaryData.bonus || 0;
    const stock = salaryData.stock_compensation || 0;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading salary details...</p>
        </div>
      </div>
    );
  }

  if (error || !salaryData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Salary data not found"}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Salary Table</span>
        </button>

        {/* Salary Details Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {salaryData.company_name || salaryData.company}
                </h1>
                <p className="text-lg text-gray-700 mt-2">
                  {salaryData.designation || salaryData.role} • {salaryData.location}
                </p>
                {(salaryData.years_of_experience !== null && salaryData.years_of_experience !== undefined) && (
                  <p className="text-sm text-gray-600 mt-1">
                    {salaryData.years_of_experience} years of experience
                  </p>
                )}
                {salaryData.duration && (
                  <p className="text-sm text-gray-600 mt-1">
                    Duration: {salaryData.duration}
                  </p>
                )}
                {salaryData.university && (
                  <p className="text-sm text-gray-600 mt-1">
                    University: {salaryData.university}
                    {salaryData.year && ` • Year: ${salaryData.year}`}
                    {salaryData.employment_type && ` • ${salaryData.employment_type}`}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-700">
                  {formatCurrencyCompact(
                    salaryData.stipend_avg || 
                    salaryData.total_compensation || 
                    salaryData.avg_salary || 
                    0
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {salaryData.data_points_count ?? salaryData.reports ?? 1} reports
                </p>
              </div>
            </div>
          </div>

          {/* CTC Breakup Section */}
          <div className="px-6 py-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {salaryData.stipend_avg ? "Stipend Breakdown" : "Compensation Breakdown"}
            </h2>
            {ctcBreakup && (
              <div className="space-y-3">
                {ctcBreakup.components.map((component, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <span className="text-sm font-medium text-gray-700">
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
                <div className="flex items-center justify-between px-4 py-4 bg-slate-100 rounded-lg border-2 border-slate-300 mt-4">
                  <span className="text-base font-bold text-gray-900">
                    Total CTC
                  </span>
                  <span className="text-base font-bold text-gray-900">
                    {formatCurrencyCompact(ctcBreakup.total)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-slate-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Comments & Discussions
              </h2>
            </div>
          </div>
          <div className="px-6 py-6">
            <CommentSection
              salaryId={salaryId}
              upvoteCount={salaryData.upvotes || 0}
              downvoteCount={salaryData.downvotes || 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

