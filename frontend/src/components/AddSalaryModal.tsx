"use client";

import React, { useState } from "react";
import Modal from "./ui/Modal";
import { Building2, MapPin, Briefcase, GraduationCap, Calendar, DollarSign, Shield, Heart, TrendingUp, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { SalaryPayload } from "@/payloads/salaries";

type ModalType = "fulltime" | "internship" | "university";

interface AddSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ModalType;
  onSuccess?: () => void;
}

export default function AddSalaryModal({
  isOpen,
  onClose,
  type,
  onSuccess,
}: AddSalaryModalProps) {
  const { user, openAuthModal } = useAuth();
  const initialFormState: Omit<SalaryPayload, "type"> = {
    company: "",
    role: "",
    location: "",
    yearsOfExperience: "",
    baseSalary: "",
    bonus: "",
    stockCompensation: "",
    totalCompensation: "",
    duration: "",
    stipend: "",
    university: "",
    year: "",
    employmentType: "Full-time",
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      return;
    }
    try {
      const response = await fetch("/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          totalCompensation:
            type === "internship"
              ? formData.stipend
              : formData.totalCompensation,
          type,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error("Failed to submit salary:", data);
        alert(
          data?.error || "Failed to submit salary. Please try again later."
        );
        return;
      }

      alert("Thank you for your submission!");
      // Reset the form so the modal is cleared for the next submission
      setFormData(initialFormState);
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting salary:", error);
      alert("Unexpected error. Please try again.");
    }
  };

  const getModalContent = () => {
    switch (type) {
      case "fulltime":
        return {
          title: "Contribute Your Salary Data",
          subtitle: "Help build transparency in the job market",
          description: "Share your compensation details and help thousands of professionals make informed career decisions. Your contribution creates a more fair and transparent job market for everyone.",
        };
      case "internship":
        return {
          title: "Share Your Internship Stipend",
          subtitle: "Guide the next generation",
          description: "Help students discover the best opportunities by sharing your internship experience. Your data helps others make better career choices.",
        };
      case "university":
        return {
          title: "Share Your University Data",
          subtitle: "Compare opportunities across colleges",
          description: "Help students compare placement opportunities by sharing your university data. Your insights empower better educational decisions.",
        };
    }
  };

  const content = getModalContent();

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="5xl">
      <div className="flex flex-col lg:flex-row min-h-[600px]">
        {/* Left Side - Motivational Content */}
        <div className="lg:w-2/5 bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 text-white p-8 lg:p-12 rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none flex flex-col justify-between">
          <div>
            <div className="mb-8">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-3 leading-tight">
                {content.title}
              </h2>
              <p className="text-slate-200 text-lg mb-6">
                {content.subtitle}
              </p>
              <p className="text-white/90 leading-relaxed">
                {content.description}
              </p>
            </div>

            {/* Key Points */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Shield className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold mb-1">100% Anonymous</div>
                  <div className="text-sm text-white/80">Your personal information is never shared or displayed</div>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <TrendingUp className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold mb-1">Make an Impact</div>
                  <div className="text-sm text-white/80">Join 1000+ contributors building transparency</div>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Heart className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold mb-1">Help Others</div>
                  <div className="text-sm text-white/80">Your data helps professionals negotiate better offers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
            <div className="text-center">
              <div className="text-2xl font-bold">1K+</div>
              <div className="text-xs text-white/80">Contributors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">50K+</div>
              <div className="text-xs text-white/80">Data Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">100%</div>
              <div className="text-xs text-white/80">Secure</div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="lg:w-3/5 p-8 lg:p-12 bg-white">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Your Information</h3>
            <p className="text-slate-600">All fields marked with * are required</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Company */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <Building2 className="w-4 h-4" />
                  Company Name *
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Google, Microsoft"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 placeholder-slate-400 transition-all"
                />
              </div>

              {/* Role/Designation */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <Briefcase className="w-4 h-4" />
                  {type === "university" ? "Role *" : "Designation *"}
                </label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  placeholder={type === "university" ? "e.g., Software Engineer" : "e.g., SDE 2, Product Manager"}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 placeholder-slate-400 transition-all"
                />
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <MapPin className="w-4 h-4" />
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Bangalore, Remote"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 placeholder-slate-400 transition-all"
                />
              </div>

              {/* Years of Experience (Full-time only) */}
              {type === "fulltime" && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    Years of Experience *
                  </label>
                  <select
                    name="yearsOfExperience"
                    value={formData.yearsOfExperience}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 bg-white transition-all"
                  >
                    <option value="">Select years</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((yoe) => (
                      <option key={yoe} value={yoe}>
                        {yoe} {yoe === 1 ? "year" : "years"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Duration (Internship only) */}
              {type === "internship" && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    Duration *
                  </label>
                  <select
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 bg-white transition-all"
                  >
                    <option value="">Select duration</option>
                    <option value="8 weeks">8 weeks</option>
                    <option value="10 weeks">10 weeks</option>
                    <option value="12 weeks">12 weeks</option>
                    <option value="16 weeks">16 weeks</option>
                    <option value="6 months">6 months</option>
                  </select>
                </div>
              )}

              {/* University (University only) */}
              {type === "university" && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <GraduationCap className="w-4 h-4" />
                    University *
                  </label>
                  <input
                    type="text"
                    name="university"
                    value={formData.university}
                    onChange={handleChange}
                    required
                    placeholder="e.g., IIT Delhi, Stanford"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 placeholder-slate-400 transition-all"
                  />
                </div>
              )}

              {/* Year (University only) */}
              {type === "university" && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    Year *
                  </label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 bg-white transition-all"
                  >
                    <option value="">Select year</option>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Employment Type (University only) */}
              {type === "university" && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <Briefcase className="w-4 h-4" />
                    Employment Type *
                  </label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 bg-white transition-all"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              )}

              {/* Base Salary (Full-time only) */}
              {type === "fulltime" && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <DollarSign className="w-4 h-4" />
                    Base Salary (Rs)
                  </label>
                  <input
                    type="number"
                    name="baseSalary"
                    value={formData.baseSalary}
                    onChange={handleChange}
                    placeholder="e.g., 1500000"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 placeholder-slate-400 transition-all"
                  />
                </div>
              )}

              {/* Bonus (Full-time only) */}
              {type === "fulltime" && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <DollarSign className="w-4 h-4" />
                    Bonus (Rs)
                  </label>
                  <input
                    type="number"
                    name="bonus"
                    value={formData.bonus}
                    onChange={handleChange}
                    placeholder="e.g., 200000"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 placeholder-slate-400 transition-all"
                  />
                </div>
              )}

              {/* Stock Compensation (Full-time only) */}
              {type === "fulltime" && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <DollarSign className="w-4 h-4" />
                    Stock Compensation (Rs)
                  </label>
                  <input
                    type="number"
                    name="stockCompensation"
                    value={formData.stockCompensation}
                    onChange={handleChange}
                    placeholder="e.g., 500000"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 placeholder-slate-400 transition-all"
                  />
                </div>
              )}

              {/* Total Compensation (Full-time and University) */}
              {(type === "fulltime" || type === "university") && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <DollarSign className="w-4 h-4" />
                    Total Compensation (Rs) *
                  </label>
                  <input
                    type="number"
                    name="totalCompensation"
                    value={formData.totalCompensation}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 2200000"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 placeholder-slate-400 transition-all"
                  />
                </div>
              )}

              {/* Stipend (Internship only) */}
              {type === "internship" && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <DollarSign className="w-4 h-4" />
                    Monthly Stipend (Rs) *
                  </label>
                  <input
                    type="number"
                    name="stipend"
                    value={formData.stipend}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 50000"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900 placeholder-slate-400 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t-2 border-slate-100">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-slate-600 to-slate-700 text-white py-4 px-8 rounded-xl font-bold text-lg hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                {user ? (
                  <>
                    <span>Submit & Contribute</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <span>Sign In to Contribute</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Shield className="w-4 h-4 text-green-600" />
                <span>Your data is encrypted and 100% anonymous</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}
