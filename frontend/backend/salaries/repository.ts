import { supabaseServer } from "../supabase/server";
import { SalaryRecord } from "./types";

export async function insertSalary(
  payload: Partial<SalaryRecord> & {
    company_name: string;
    designation: string;
    location: string;
    total_compensation: number;
    source_platform: string;
  }
): Promise<SalaryRecord> {
  const { data, error } = await supabaseServer
    .from("salaries")
    .insert(payload)
    .select(
      "id, company_name, designation, location, years_of_experience, avg_salary, data_points_count, base_salary, bonus, stock_compensation, total_compensation, upvotes, downvotes, additional_data"
    )
    .single();

  if (error || !data) {
    throw error || new Error("Failed to insert salary");
  }

  return data as SalaryRecord;
}


