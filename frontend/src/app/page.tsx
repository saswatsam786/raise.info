"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { supabase } from "@/lib/supabase/config";
import SalaryDetailsPanel from "@/components/SalaryDetailsPanel";
import AddSalaryModal from "@/components/AddSalaryModal";

interface SalaryData {
  id?: string;
  company_name: string;
  designation: string;
  location: string;
  yoe: number;
  avg_salary: number;
  reports: number;
  base_salary?: number;
  bonus?: number;
  stock_compensation?: number;
  total_compensation?: number;
  upvotes?: number;
  downvotes?: number;
}

interface Filters {
  companyName: string;
  location: string;
  designation: string;
  yoe: number | "";
  salaryMin: number;
  salaryMax: number;
}

type SortField = keyof SalaryData;
type SortDirection = "asc" | "desc";

export default function PayScope() {
  const [salaries, setSalaries] = useState<SalaryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch salary data from Supabase
  useEffect(() => {
    const fetchSalaries = async () => {
      try {
        const { data, error } = await supabase
          .from("salaries")
          .select(
            "id, company_name, designation, location, years_of_experience, avg_salary, data_points_count, base_salary, bonus, stock_compensation, total_compensation, upvotes, downvotes"
          )
          .order("avg_salary", { ascending: false });

        if (error) throw error;

        // Transform the data to match our interface
        const transformedData: SalaryData[] = (data || []).map(
          (item: {
            id: string;
            company_name: string;
            designation: string;
            location: string;
            years_of_experience: number | null;
            avg_salary: number;
            data_points_count: number | null;
            base_salary?: number;
            bonus?: number;
            stock_compensation?: number;
            total_compensation?: number;
            upvotes?: number;
            downvotes?: number;
          }) => ({
            id: item.id,
            company_name: item.company_name,
            designation: item.designation,
            location: item.location,
            yoe: item.years_of_experience || 0,
            avg_salary: item.avg_salary || 0,
            reports: (item.data_points_count ?? 1) + ((item.upvotes || 0) - (item.downvotes || 0)),
            base_salary: item.base_salary,
            bonus: item.bonus,
            stock_compensation: item.stock_compensation,
            total_compensation: item.total_compensation,
            upvotes: item.upvotes || 0,
            downvotes: item.downvotes || 0,
          })
        );

        setSalaries(transformedData);
      } catch (error) {
        console.error("Error fetching salaries:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalaries();
  }, []);

  // Calculate salary range from data
  const salaryRange = useMemo(() => {
    if (salaries.length === 0) {
      return { min: 0, max: 100000000 };
    }
    const allSalaries = salaries.map((item) => item.avg_salary);
    return {
      min: Math.floor(Math.min(...allSalaries)),
      max: Math.ceil(Math.max(...allSalaries)),
    };
  }, [salaries]);

  const [filters, setFilters] = useState<Filters>({
    companyName: "",
    location: "",
    designation: "",
    yoe: "",
    salaryMin: 0,
    salaryMax: 100000000,
  });

  const [sortField, setSortField] = useState<SortField>("avg_salary");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // Feedback modal state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredCompanies, setFilteredCompanies] = useState<string[]>([]);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Side panel state - open by default for first row
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [selectedSalaryData, setSelectedSalaryData] =
    useState<SalaryData | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0); // Track selected row index
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAddSalaryModalOpen, setIsAddSalaryModalOpen] = useState(false);

  // Handle row click to open side panel
  const handleRowClick = (item: SalaryData, index: number) => {
    setSelectedSalaryData(item);
    setSelectedRowIndex(index);
    setIsSidePanelOpen(true);
  };

  // Handle side panel close
  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
    setSelectedSalaryData(null);
  };

  // Function to refresh salary data
  const refreshSalaryData = async () => {
    try {
      const { data, error } = await supabase
        .from("salaries")
        .select(
          "id, company_name, designation, location, years_of_experience, avg_salary, data_points_count, base_salary, bonus, stock_compensation, total_compensation, upvotes, downvotes"
        )
        .order("avg_salary", { ascending: false });

      if (error) throw error;

      const transformedData: SalaryData[] = (data || []).map(
        (item: {
          id: string;
          company_name: string;
          designation: string;
          location: string;
          years_of_experience: number | null;
          avg_salary: number;
          data_points_count: number | null;
          base_salary?: number;
          bonus?: number;
          stock_compensation?: number;
          total_compensation?: number;
          upvotes?: number;
          downvotes?: number;
        }) => ({
          id: item.id,
          company_name: item.company_name,
          designation: item.designation,
          location: item.location,
          yoe: item.years_of_experience || 0,
          avg_salary: item.avg_salary || 0,
          reports: (item.data_points_count ?? 1) + ((item.upvotes || 0) - (item.downvotes || 0)),
          base_salary: item.base_salary,
          bonus: item.bonus,
          stock_compensation: item.stock_compensation,
          total_compensation: item.total_compensation,
          upvotes: item.upvotes || 0,
          downvotes: item.downvotes || 0,
        })
      );

      setSalaries(transformedData);

      // Update selectedSalaryData if it's still selected
      if (selectedSalaryData?.id) {
        const updatedSelected = transformedData.find(
          (item) => item.id === selectedSalaryData.id
        );
        if (updatedSelected) {
          setSelectedSalaryData(updatedSelected);
        }
      }
    } catch (error) {
      console.error("Error refreshing salaries:", error);
    }
  };

  // Listen for vote changes from the panel
  useEffect(() => {
    if (refreshTrigger > 0) {
      refreshSalaryData();
    }
  }, [refreshTrigger]);

  // Get unique values for dropdowns
  const uniqueCompanies = useMemo(
    () => Array.from(new Set(salaries.map((item) => item.company_name))).sort(),
    [salaries]
  );

  const uniqueLocations = useMemo(
    () => Array.from(new Set(salaries.map((item) => item.location))).sort(),
    [salaries]
  );

  const uniqueDesignations = useMemo(
    () => Array.from(new Set(salaries.map((item) => item.designation))).sort(),
    [salaries]
  );

  // Handle company name autocomplete
  useEffect(() => {
    if (filters.companyName) {
      const filtered = uniqueCompanies.filter((company) =>
        company.toLowerCase().includes(filters.companyName.toLowerCase())
      );
      setFilteredCompanies(filtered);
      setShowAutocomplete(
        filtered.length > 0 && filters.companyName.length > 0
      );
    } else {
      setShowAutocomplete(false);
    }
  }, [filters.companyName, uniqueCompanies]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    const filtered = salaries.filter((item) => {
      const matchesCompany = item.company_name
        .toLowerCase()
        .includes(filters.companyName.toLowerCase());
      const matchesLocation =
        filters.location === "" || item.location === filters.location;
      const matchesDesignation =
        filters.designation === "" || item.designation === filters.designation;
      const matchesYoe = filters.yoe === "" || item.yoe === filters.yoe;
      const matchesSalary =
        item.avg_salary >= filters.salaryMin &&
        item.avg_salary <= filters.salaryMax;

      return (
        matchesCompany &&
        matchesLocation &&
        matchesDesignation &&
        matchesYoe &&
        matchesSalary
      );
    });

    // Sort data
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return filtered;
  }, [salaries, filters, sortField, sortDirection]);

  // Set first row as selected by default when component mounts
  useEffect(() => {
    if (filteredAndSortedData.length > 0 && !selectedSalaryData) {
      setSelectedSalaryData(filteredAndSortedData[0]);
      setSelectedRowIndex(0);
    }
  }, [filteredAndSortedData, selectedSalaryData]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredAndSortedData.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof Filters, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Handle company selection from autocomplete
  const handleCompanySelect = (company: string) => {
    setFilters((prev) => ({ ...prev, companyName: company }));
    setShowAutocomplete(false);
    setCurrentPage(1);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      companyName: "",
      location: "",
      designation: "",
      yoe: "",
      salaryMin: salaryRange.min,
      salaryMax: salaryRange.max,
    });
    setCurrentPage(1);
  };

  // Handle salary range change
  const handleSalaryRangeChange = (values: number[]) => {
    setFilters((prev) => ({
      ...prev,
      salaryMin: values[0],
      salaryMax: values[1],
    }));
    setCurrentPage(1);
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async () => {
    setIsSubmittingFeedback(true);
    setFeedbackStatus("idle");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key:
            process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ||
            "YOUR_ACCESS_KEY_HERE",
          subject: "New Feedback from salaris.fyi",
          from_name: "salaris.fyi Feedback",
          message: `Rating: ${feedbackRating}/5\n\nFeedback:\n${feedbackMessage}`,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFeedbackStatus("success");
        setFeedbackMessage("");
        setFeedbackRating(0);
        setTimeout(() => {
          setFeedbackStatus("idle");
          setIsFeedbackOpen(false);
        }, 2000);
      } else {
        setFeedbackStatus("error");
      }
    } catch (error) {
      console.error("Feedback submission error:", error);
      setFeedbackStatus("error");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `Rs ${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `Rs ${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `Rs ${(amount / 1000).toFixed(0)}K`;
    }
    return `Rs ${amount.toFixed(0)}`;
  };

  // Format compact for sliders (no currency symbol)
  const formatCurrencyCompact = (amount: number) => {
    if (amount >= 10000000) {
      return `${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `${(amount / 100000).toFixed(1)}L`;
    }
    return `${(amount / 1000).toFixed(0)}K`;
  };

  // Sort icon component - consistent icon that doesn't change
  const SortIcon = ({ field }: { field: SortField }) => {
    const isActive = sortField === field;
    return (
      <div className="flex flex-col items-center justify-center w-4 h-4">
        <svg
          className={`w-3 h-3 transition-colors ${
            isActive
              ? "text-slate-600"
              : "text-gray-400 group-hover:text-gray-600"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
        {isActive && (
          <div
            className={`text-xs font-bold ${
              sortDirection === "asc" ? "text-slate-600" : "text-slate-600"
            }`}
          >
            {sortDirection === "asc" ? "↑" : "↓"}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-200 to-slate-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-700 mb-2">
              Are You Getting Paid What You Deserve?
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl mx-auto mb-4">
              Real salary data from 1000+ companies. Stop guessing, start negotiating.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setIsAddSalaryModalOpen(true)}
                className="group relative bg-white border border-slate-300 rounded-lg px-5 py-2.5 hover:border-slate-500 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-600 transition-colors">
                    <svg className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Share Your Salary</span>
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          {/* Filter Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                Filter Results
              </h3>
            </div>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-800 transition-colors font-medium"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reset Filters
            </button>
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Company Name with Autocomplete */}
            <div className="relative" ref={autocompleteRef}>
              <label className="block text-xs font-semibold text-gray-600 mb-0.5 uppercase tracking-wide">
                Company
              </label>
              <input
                type="text"
                placeholder="Search company..."
                value={filters.companyName}
                onChange={(e) =>
                  handleFilterChange("companyName", e.target.value)
                }
                onFocus={() =>
                  filters.companyName &&
                  setShowAutocomplete(filteredCompanies.length > 0)
                }
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white transition-colors"
              />
              {showAutocomplete && filteredCompanies.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredCompanies.map((company) => (
                    <div
                      key={company}
                      className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer transition-colors text-gray-900 border-b border-gray-100 last:border-b-0"
                      onClick={() => handleCompanySelect(company)}
                    >
                      {company}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-0.5 uppercase tracking-wide">
                Location
              </label>
              <select
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent text-gray-900 bg-white transition-colors"
              >
                <option value="">All Locations</option>
                {uniqueLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Designation */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-0.5 uppercase tracking-wide">
                Designation
              </label>
              <select
                value={filters.designation}
                onChange={(e) =>
                  handleFilterChange("designation", e.target.value)
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent text-gray-900 bg-white transition-colors"
              >
                <option value="">All Designations</option>
                {uniqueDesignations.map((designation) => (
                  <option key={designation} value={designation}>
                    {designation}
                  </option>
                ))}
              </select>
            </div>

            {/* Years of Experience */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-0.5 uppercase tracking-wide">
                Years of Exp
              </label>
              <select
                value={filters.yoe}
                onChange={(e) =>
                  handleFilterChange(
                    "yoe",
                    e.target.value === "" ? "" : parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent text-gray-900 bg-white transition-colors"
              >
                <option value="">All Levels</option>
                {[1, 2, 3, 4, 5, 6, 7].map((yoe) => (
                  <option key={yoe} value={yoe}>
                    {yoe} years
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Total Compensation Range Filter */}
          <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center">
                <span className="text-slate-700 text-xs font-semibold">Rs</span>
              </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-900">Total Compensation Range</h4>
                  <p className="text-xs text-gray-500">Filter by total compensation</p>
                </div>
              </div>
              
            </div>

            <div className="px-1">
              <Slider
                range
                min={salaryRange.min}
                max={salaryRange.max}
                value={[filters.salaryMin, filters.salaryMax]}
                onChange={(value) => handleSalaryRangeChange(value as number[])}
                styles={{
                  track: { backgroundColor: "#64748b", height: 4 },
                  rail: { backgroundColor: "#e2e8f0", height: 4 },
                  handle: {
                    backgroundColor: "#64748b",
                    borderColor: "#64748b",
                    width: 16,
                    height: 16,
                    marginTop: -6,
                    opacity: 1,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  },
                }}
              />
              <div className="flex justify-between items-center mt-1.5 text-xs text-gray-500">
                <span>Min: {formatCurrencyCompact(salaryRange.min)}</span>
                <span>Max: {formatCurrencyCompact(salaryRange.max)}</span>
              </div>
            </div>
          </div>

          
        </div>
      </div>

      {/* Results Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Table and Side Panel Container */}
        <div
          className={`flex gap-4 transition-all duration-500 ease-in-out items-stretch ${
            isSidePanelOpen ? "" : ""
          }`}
        >
          {/* Table Section - 70% when panel is open, 100% when closed */}
          <div
            className={`transition-all duration-500 ease-in-out flex flex-col ${
              isSidePanelOpen ? "w-[70%]" : "w-full"
            }`}
          >
            {isLoading ? (
              <div className="text-center py-16 bg-white dark:bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
                <p className="text-gray-600 text-lg font-semibold mt-4">
                  Loading salary data...
                </p>
              </div>
            ) : currentData.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-white rounded-xl shadow-sm border border-gray-200">
                <svg
                  className="mx-auto h-16 w-16 text-neutral-400 dark:text-neutral-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-gray-600 text-xl font-semibold mt-6">
                  No results found
                </div>
                <p className="text-neutral-500 dark:text-neutral-500 mt-2">
                  Try adjusting your filters to see more results
                </p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="bg-white dark:bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200 flex-1 flex flex-col">
                  <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200 table-fixed">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0">
                        <tr>
                          <th
                            className="group px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors select-none w-36"
                            onClick={() => handleSort("company_name")}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="flex-1">Company</span>
                              <SortIcon field="company_name" />
                            </div>
                          </th>
                          <th
                            className="group px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none w-52"
                            onClick={() => handleSort("designation")}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="flex-1">Designation</span>
                              <SortIcon field="designation" />
                            </div>
                          </th>
                          <th
                            className="group px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none w-32"
                            onClick={() => handleSort("location")}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="flex-1">Location</span>
                              <SortIcon field="location" />
                            </div>
                          </th>
                          <th
                            className="group px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none w-20"
                            onClick={() => handleSort("yoe")}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="flex-1">YOE</span>
                              <SortIcon field="yoe" />
                            </div>
                          </th>
                          <th
                            className="group px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none w-32"
                            onClick={() => handleSort("avg_salary")}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="flex-1">Salary</span>
                              <SortIcon field="avg_salary" />
                            </div>
                          </th>
                          <th className="group px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider transition-colors select-none w-24">
                            <div className="flex items-center justify-between w-full">
                              <span className="flex-1">Reports</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentData.map((item, index) => (
                          <tr
                            key={`${item.company_name}-${item.designation}-${index}`}
                            className={`hover:bg-slate-50 hover:shadow-sm transition-all duration-150 cursor-pointer ${
                              selectedRowIndex === index
                                ? "bg-slate-200 border-2 border-slate-300"
                                : ""
                            }`}
                            onClick={() => handleRowClick(item, index)}
                          >
                            <td className="px-3 py-2 whitespace-nowrap w-36">
                              <div
                                className="text-sm font-semibold text-gray-900 truncate"
                                title={item.company_name}
                              >
                                {item.company_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 w-52">
                              <div className="break-words">
                                {item.designation}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              <div
                                className="truncate max-w-[120px]"
                                title={item.location}
                              >
                                {item.location}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {item.yoe}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">
                              {formatCurrency(item.avg_salary)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {item.reports}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Side Panel Section - 40% when open */}
          {isSidePanelOpen && (
            <SalaryDetailsPanel
              isOpen={isSidePanelOpen}
              onClose={handleCloseSidePanel}
              data={selectedSalaryData}
              onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
            />
          )}
        </div>

        {/* Pagination - Outside table/side panel container */}
        {currentData.length > 0 && totalPages > 1 && (
          <div className="max-w-7xl mx-auto pb-8 mt-8">
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-semibold text-slate-600">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-600">
                  {Math.min(endIndex, filteredAndSortedData.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-600">
                  {filteredAndSortedData.length}
                </span>{" "}
                results
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-white border border-gray-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {(() => {
                  const pages: (number | string)[] = [];
                  const maxVisiblePages = 7;

                  if (totalPages <= maxVisiblePages) {
                    // Show all pages if there are few
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    // Always show first page
                    pages.push(1);

                    if (currentPage > 3) {
                      pages.push("...");
                    }

                    // Show pages around current page
                    const startPage = Math.max(2, currentPage - 1);
                    const endPage = Math.min(totalPages - 1, currentPage + 1);

                    for (let i = startPage; i <= endPage; i++) {
                      if (i !== 1 && i !== totalPages) {
                        pages.push(i);
                      }
                    }

                    if (currentPage < totalPages - 2) {
                      pages.push("...");
                    }

                    // Always show last page
                    if (totalPages > 1) {
                      pages.push(totalPages);
                    }
                  }

                  return pages.map((page, index) => {
                    if (page === "...") {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-3 py-2 text-sm text-gray-500"
                        >
                          ...
                        </span>
                      );
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors min-w-[40px] ${
                          page === currentPage
                            ? "bg-slate-500 text-white shadow-md"
                            : "text-gray-700 bg-white dark:bg-white border border-gray-300 hover:bg-slate-50 dark:hover:bg-white"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  });
                })()}

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-white border border-gray-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsFeedbackOpen(true)}
        className="fixed bottom-6 right-6 bg-slate-500 text-white px-6 py-4 rounded-full shadow-lg hover:bg-slate-600 hover:shadow-xl transition-all duration-300 flex items-center gap-3 group z-40 animate-scale-in"
      >
        <svg
          className="w-5 h-5 group-hover:scale-110 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        <span className="font-medium">Feedback</span>
      </button>

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-scale-in border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Share Your Feedback
              </h2>
              <button
                onClick={() => setIsFeedbackOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Rating */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Rate your experience
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFeedbackRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="transition-transform hover:scale-125"
                  >
                    <svg
                      className={`w-8 h-8 ${
                        star <= (hoveredStar || feedbackRating)
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Message */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Your feedback
              </label>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Tell us what you think..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500 bg-white dark:bg-white transition-colors"
              />
            </div>

            {/* Status Messages */}
            {feedbackStatus === "success" && (
              <div className="bg-success-50 border border-success-200 text-success-600 px-4 py-3 rounded-lg mb-4">
                Thank you! Your feedback has been sent successfully.
              </div>
            )}

            {feedbackStatus === "error" && (
              <div className="bg-error-50 border border-error-200 text-error-600 px-4 py-3 rounded-lg mb-4">
                Oops! Something went wrong. Please try again.
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleFeedbackSubmit}
              disabled={
                feedbackRating === 0 ||
                feedbackMessage.trim() === "" ||
                isSubmittingFeedback
              }
              className="w-full bg-slate-500 text-white py-3 px-4 rounded-lg hover:bg-slate-600 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors font-semibold shadow-sm hover:shadow-md"
            >
              {isSubmittingFeedback ? "Sending..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      )}

      {/* Add Salary Modal */}
      <AddSalaryModal
        isOpen={isAddSalaryModalOpen}
        onClose={() => setIsAddSalaryModalOpen(false)}
        type="fulltime"
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  );
}

