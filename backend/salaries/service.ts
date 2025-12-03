import { CreateSalaryInput, SalaryRecord } from "./types";
import { insertSalary } from "./repository";
import { supabaseServer } from "../supabase/server";

function toNumberOrNull(value?: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function createSalaryFromUserInput(
  input: CreateSalaryInput
): Promise<SalaryRecord> {
  const {
    company,
    role,
    location,
    yearsOfExperience,
    baseSalary,
    bonus,
    stockCompensation,
    totalCompensation,
    type,
    employmentType,
    duration,
    stipend,
    university,
    year,
  } = input;

  if (!company || !role || !location || !totalCompensation) {
    throw new Error("Missing required fields");
  }

  const totalComp = Number(totalCompensation);
  if (Number.isNaN(totalComp) || totalComp <= 0) {
    throw new Error("Invalid total compensation");
  }

  const jobType =
    type === "internship"
      ? "internship"
      : employmentType === "Internship"
      ? "internship"
      : "full-time";

  const yearsOfExpNumber =
    type === "fulltime" ? toNumberOrNull(yearsOfExperience) : null;

  const additional: Record<string, any> = {};

  if (type === "internship") {
    if (duration) additional.duration = duration;
    if (stipend) additional.stipend = stipend;
  }

  if (type === "university") {
    if (university) additional.university = university;
    if (year) additional.year = year;
    if (employmentType) additional.employment_type = employmentType;
  }

  const payload = {
    company_name: company,
    designation: role,
    location,
    years_of_experience: yearsOfExpNumber,
    base_salary: toNumberOrNull(baseSalary),
    bonus: toNumberOrNull(bonus) ?? 0,
    stock_compensation: toNumberOrNull(stockCompensation) ?? 0,
    total_compensation: totalComp,
    avg_salary: totalComp,
    min_salary: totalComp,
    max_salary: totalComp,
    data_points_count: 1,
    source_platform: "manual",
    job_type: jobType,
    currency: "INR",
    additional_data: Object.keys(additional).length ? additional : undefined,
  };

  // Build aggregation key query based on type
  let query = supabaseServer
    .from("salaries")
    .select(
      "id, avg_salary, min_salary, max_salary, data_points_count, total_compensation"
    )
    .eq("company_name", company)
    .eq("designation", role);

  if (type === "fulltime") {
    // Full-time: (company_name, designation, location, years_of_experience, job_type='full-time')
    query = query.eq("location", location).eq("job_type", "full-time");
    // Include years_of_experience in the aggregation key
    if (yearsOfExpNumber !== null) {
      query = query.eq("years_of_experience", yearsOfExpNumber);
    } else {
      // If years_of_experience is null, only match other null entries
      query = query.is("years_of_experience", null);
    }
  } else if (type === "internship") {
    // Internship: (company_name, role) → designation + job_type='internship'
    query = query.eq("job_type", "internship");
  } else if (type === "university") {
    // University: (university, company, role, employment_type, year)
    if (!university || !employmentType || !year) {
      throw new Error(
        "University, employment type, and year are required for university entries"
      );
    }

    query = query
      .eq("job_type", jobType)
      .eq("additional_data->>university", university)
      .eq("additional_data->>employment_type", employmentType)
      .eq("additional_data->>year", String(year));
  }

  // Use the most recent row for this key as the aggregate base
  const { data: existing, error: selectError } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  // No existing row for this key → insert fresh aggregated row
  if (!existing) {
    // Ensure data_points_count is set to 1 for new entries
    payload.data_points_count = 1;
    return insertSalary(payload);
  }

  // Existing aggregated row → update with new mean and counts
  const oldCount = existing.data_points_count ?? 0;
  // If oldCount is 0 or null, treat it as 1 (shouldn't happen, but safety check)
  const safeOldCount = oldCount > 0 ? oldCount : 1;

  const baseForAvg =
    existing.avg_salary ??
    existing.total_compensation ??
    totalComp;

  const newCount = safeOldCount + 1;
  const newAvg = (baseForAvg * safeOldCount + totalComp) / newCount;

  const currentMin =
    existing.min_salary !== null && existing.min_salary !== undefined
      ? existing.min_salary
      : baseForAvg;
  const currentMax =
    existing.max_salary !== null && existing.max_salary !== undefined
      ? existing.max_salary
      : baseForAvg;

  const newMin = Math.min(currentMin, totalComp);
  const newMax = Math.max(currentMax, totalComp);

  const { data: updated, error: updateError } = await supabaseServer
    .from("salaries")
    .update({
      avg_salary: newAvg,
      total_compensation: newAvg,
      min_salary: newMin,
      max_salary: newMax,
      data_points_count: newCount,
    })
    .eq("id", existing.id)
    .select(
      "id, company_name, designation, location, years_of_experience, avg_salary, data_points_count, base_salary, bonus, stock_compensation, total_compensation, upvotes, downvotes, additional_data"
    )
    .single();

  if (updateError || !updated) {
    throw updateError || new Error("Failed to update aggregated salary");
  }

  return updated as SalaryRecord;
}


