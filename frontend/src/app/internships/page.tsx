"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import SalaryDetailsPanel from "@/components/SalaryDetailsPanel";
import AddSalaryModal from "@/components/AddSalaryModal";
import { supabase } from "@/lib/supabase/config";
import internshipSeedData from "@/data/internship_data.json";

interface InternshipData {
  id?: string;
  company_name: string;
  role: string;
  location: string;
  duration: string;
  stipend_min: number;
  stipend_max: number;
  stipend_avg: number;
  reports: number;
  university: string;
  year: number;
}

interface Filters {
  companyName: string;
  role: string;
  location: string;
  duration: string;
  stipendMin: number;
  stipendMax: number;
}

type SortField = keyof InternshipData;
type SortDirection = "asc" | "desc";

export default function InternshipsPage() {
  // Sample internship data
  const internshipData: InternshipData[] = internshipSeedData;
  // Internships loaded from Supabase (user submissions)
  const [supabaseInternships, setSupabaseInternships] = useState<
    InternshipData[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInternships = async () => {
      try {
        const { data, error } = await supabase
          .from("salaries")
          .select(
            "id, company_name, designation, location, total_compensation, data_points_count, avg_salary, job_type, additional_data, upvotes, downvotes"
          )
          .eq("job_type", "internship")
          .order("total_compensation", { ascending: false });

        if (error) throw error;

        const transformed: InternshipData[] = (data || []).map(
          (item: {
            id: string;
            company_name: string;
            designation: string;
            location: string;
            total_compensation: number | null;
            data_points_count: number | null;
            avg_salary: number | null;
            job_type?: string;
            additional_data?: { duration?: string | null };
            upvotes?: number | null;
            downvotes?: number | null;
          }) => {
            const stipend =
              item.total_compensation ?? item.avg_salary ?? 0;

            return {
              id: item.id,
              company_name: item.company_name,
              role: item.designation,
              location: item.location,
              duration: item.additional_data?.duration ?? "",
              stipend_min: stipend,
              stipend_max: stipend,
              stipend_avg: stipend,
              reports: (item.data_points_count ?? 1) + ((item.upvotes || 0) - (item.downvotes || 0)),
              university: "N/A",
              year: new Date().getFullYear(),
            };
          }
        );

        setSupabaseInternships(transformed);
      } catch (error) {
        console.error("Error fetching internships:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInternships();
  }, []);

  const allInternships = useMemo(
    () => [...supabaseInternships, ...internshipData],
    [supabaseInternships]
  );

  // Calculate stipend range from data
  const stipendRange = useMemo(() => {
    if (allInternships.length === 0) {
      return { min: 0, max: 10000 };
    }
    const allStipends = allInternships.map((item) => item.stipend_avg);
    return {
      min: Math.floor(Math.min(...allStipends)),
      max: Math.ceil(Math.max(...allStipends)),
    };
  }, [allInternships]);

  const [filters, setFilters] = useState<Filters>({
    companyName: "",
    role: "",
    location: "",
    duration: "",
    stipendMin: 0,
    stipendMax: 10000,
  });

  const [sortField, setSortField] = useState<SortField>("stipend_avg");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredCompanies, setFilteredCompanies] = useState<string[]>([]);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Side panel state - open by default for first row
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [selectedInternshipData, setSelectedInternshipData] = useState<InternshipData | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0); // Track selected row index
  const [isAddSalaryModalOpen, setIsAddSalaryModalOpen] = useState(false);

  // Handle row click to open side panel
  const handleRowClick = (item: InternshipData, index: number) => {
    setSelectedInternshipData(item);
    setSelectedRowIndex(index);
    setIsSidePanelOpen(true);
  };

  // Handle side panel close
  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
    setSelectedInternshipData(null);
  };


  // Handle company name autocomplete
  const handleCompanyNameChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      companyName: value,
    }));

    if (value) {
      const filtered = uniqueCompanies.filter((company) =>
        company.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCompanies(filtered);
      setShowAutocomplete(filtered.length > 0);
    } else {
      setShowAutocomplete(false);
    }
    setCurrentPage(1);
  };

  const handleCompanySelect = (company: string) => {
    setFilters((prev) => ({
      ...prev,
      companyName: company,
    }));
    setShowAutocomplete(false);
    setCurrentPage(1);
  };

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      companyName: "",
      role: "",
      location: "",
      duration: "",
      stipendMin: stipendRange.min,
      stipendMax: stipendRange.max,
    });
    setCurrentPage(1);
  };

  // Handle stipend range change
  const handleStipendRangeChange = (value: number | number[]) => {
    const values = Array.isArray(value) ? value : [value, value];
    setFilters((prev) => ({
      ...prev,
      stipendMin: values[0],
      stipendMax: values[1],
    }));
    setCurrentPage(1);
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = allInternships.filter((item) => {
      return (
        (filters.companyName === "" ||
          item.company_name
            .toLowerCase()
            .includes(filters.companyName.toLowerCase())) &&
        (filters.role === "" ||
          item.role.toLowerCase().includes(filters.role.toLowerCase())) &&
        (filters.location === "" ||
          item.location.toLowerCase().includes(filters.location.toLowerCase())) &&
        (filters.duration === "" || item.duration === filters.duration) &&
        (item.stipend_avg >= filters.stipendMin && item.stipend_avg <= filters.stipendMax)
      );
    });

    // Sort the data
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
  }, [allInternships, filters, sortField, sortDirection]);

  // Set first row as selected by default when component mounts
  useEffect(() => {
    if (filteredAndSortedData.length > 0 && !selectedInternshipData) {
      setSelectedInternshipData(filteredAndSortedData[0]);
      setSelectedRowIndex(0);
    }
  }, [filteredAndSortedData, selectedInternshipData]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredAndSortedData.slice(startIndex, endIndex);

  const uniqueCompanies = useMemo(
    () => [...new Set(allInternships.map((item) => item.company_name))].sort(),
    [allInternships]
  );

  const uniqueRoles = useMemo(
    () => [...new Set(allInternships.map((item) => item.role))].sort(),
    [allInternships]
  );

  const uniqueLocations = useMemo(
    () => [...new Set(allInternships.map((item) => item.location))].sort(),
    [allInternships]
  );

  const uniqueDurations = useMemo(
    () => [...new Set(allInternships.map((item) => item.duration))].sort(),
    [allInternships]
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Sort icon component - consistent icon that doesn't change
  const SortIcon = ({ field }: { field: SortField }) => {
    const isActive = sortField === field;
    return (
      <div className="flex flex-col items-center justify-center w-4 h-4">
        <svg
          className={`w-3 h-3 transition-colors ${isActive
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
            className={`text-xs font-bold ${sortDirection === "asc" ? "text-slate-600" : "text-slate-600"
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
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-200 to-slate-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-700 mb-2">
              Internships That Pay Big
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl mx-auto mb-4">
              Real stipend data from top companies.
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
                  <span className="text-sm font-semibold text-slate-800">Share Your Stipend</span>
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
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Filter Internships</h3>
            </div>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-800 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Filters
            </button>
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Company Name with Autocomplete */}
            <div className="relative" ref={autocompleteRef}>
              <label className="block text-xs font-semibold text-gray-600 mb-0.5 uppercase tracking-wide">
                Company
              </label>
              <input
                type="text"
                placeholder="Search company..."
                value={filters.companyName}
                onChange={(e) => handleCompanyNameChange(e.target.value)}
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

            {/* Role */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-0.5 uppercase tracking-wide">
                Role
              </label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange("role", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent text-gray-900 bg-white transition-colors"
              >
                <option value="">All Roles</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
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

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-0.5 uppercase tracking-wide">
                Duration
              </label>
              <select
                value={filters.duration}
                onChange={(e) => handleFilterChange("duration", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent text-gray-900 bg-white transition-colors"
              >
                <option value="">All Durations</option>
                {uniqueDurations.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Stipend Range Slider */}
          <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center">
                <span className="text-slate-700 text-xs font-semibold">Rs</span>
              </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-900">Total Stipend Range</h4>
                  <p className="text-xs text-gray-500">Filter by monthly total stipend</p>
                </div>
              </div>
            
            </div>

            <div className="px-2">
              <Slider
                range
                min={stipendRange.min}
                max={stipendRange.max}
                value={[filters.stipendMin, filters.stipendMax]}
                onChange={handleStipendRangeChange}
                trackStyle={[{ backgroundColor: "#64748b", height: 4 }]}
                handleStyle={[
                  { backgroundColor: "#64748b", borderColor: "#64748b", width: 16, height: 16, marginTop: -6, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
                  { backgroundColor: "#64748b", borderColor: "#64748b", width: 16, height: 16, marginTop: -6, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
                ]}
                railStyle={{ backgroundColor: "#e2e8f0", height: 4 }}
              />
              <div className="flex justify-between items-center mt-1.5 text-xs text-gray-500">
                <span>Min: {formatCurrency(stipendRange.min)}</span>
                <span>Max: {formatCurrency(stipendRange.max)}</span>
              </div>
            </div>
          </div>

          
        </div>
      </div>

      {/* Results Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Table and Side Panel Container */}
        <div className={`flex gap-4 transition-all duration-500 ease-in-out items-stretch ${isSidePanelOpen ? '' : ''}`}>
          {/* Table Section - 70% when panel is open, 100% when closed */}
          <div className={`transition-all duration-500 ease-in-out flex flex-col ${isSidePanelOpen ? 'w-[70%]' : 'w-full'}`}>
            {isLoading ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
                <p className="text-gray-600 text-lg font-semibold mt-4">
                  Loading internship data...
                </p>
              </div>
            ) : filteredAndSortedData.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                <svg
                  className="mx-auto h-16 w-16 text-neutral-400"
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
                <div className="text-neutral-600 text-xl font-semibold mt-6">
                  No results found
                </div>
                <p className="text-neutral-500 mt-2">
                  Try adjusting your filters to see more results
                </p>
              </div>
            ) : (
                <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200 flex-1 flex flex-col">
                  <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0">
                      <tr>
                        <th
                            className="group px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors select-none w-36"
                          onClick={() => handleSort("company_name")}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="flex-1">Company</span>
                            <SortIcon field="company_name" />
                          </div>
                        </th>
                        <th
                            className="group px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none w-52"
                          onClick={() => handleSort("role")}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="flex-1">Role</span>
                            <SortIcon field="role" />
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
                          onClick={() => handleSort("duration")}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="flex-1">Duration</span>
                            <SortIcon field="duration" />
                          </div>
                        </th>
                        <th
                            className="group px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none w-40"
                          onClick={() => handleSort("stipend_avg")}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="flex-1">Total Stipend</span>
                            <SortIcon field="stipend_avg" />
                          </div>
                        </th>
                        <th
                            className="group px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none w-24"
                          onClick={() => handleSort("reports")}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="flex-1">Reports</span>
                            <SortIcon field="reports" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentData.map((item, index) => (
                        <tr
                          key={`${item.company_name}-${item.role}-${index}`}
                          className={`hover:bg-slate-50 hover:shadow-sm transition-all duration-150 cursor-pointer ${
                            selectedRowIndex === index ? 'bg-slate-200 border-2 border-slate-300' : ''
                          }`}
                          onClick={() => handleRowClick(item, index)}
                        >
                          <td className="px-3 py-2 whitespace-nowrap w-36">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {item.company_name}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700 w-52">
                            <div className="break-words">
                              {item.role}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {item.location}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {item.duration}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-sm font-bold text-slate-600">
                              {formatCurrency(item.stipend_avg)}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {item.reports}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            )}
          </div>

          {/* Side Panel Section - 30% when open */}
          {isSidePanelOpen && (
            <SalaryDetailsPanel
              isOpen={isSidePanelOpen}
              onClose={handleCloseSidePanel}
              data={selectedInternshipData}
            />
          )}
        </div>

        {/* Pagination - Outside table/side panel container */}
        {currentData.length > 0 && totalPages > 1 && (
          <div className="max-w-7xl mx-auto pb-8 mt-8">
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-semibold text-slate-600">{startIndex + 1}</span> to{" "}
                <span className="font-semibold text-slate-600">
                  {Math.min(endIndex, filteredAndSortedData.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-600">
                  {filteredAndSortedData.length}
                </span>{" "}
                results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${page === currentPage
                          ? "bg-slate-500 text-white shadow-md"
                          : "text-gray-700 bg-white border border-gray-300 hover:bg-slate-50"
                        }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Salary Modal */}
      <AddSalaryModal
        isOpen={isAddSalaryModalOpen}
        onClose={() => setIsAddSalaryModalOpen(false)}
        type="internship"
      />
    </div>
  );
}

