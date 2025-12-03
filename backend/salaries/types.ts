import type { SalaryPayload } from "../payloads/salaries";

export type CreateSalaryInput = SalaryPayload;

export interface SalaryRecord {
  id: string;
  company_name: string;
  designation: string;
  location: string;
  years_of_experience: number | null;
  avg_salary: number | null;
  data_points_count: number | null;
  base_salary?: number | null;
  bonus?: number | null;
  stock_compensation?: number | null;
  total_compensation?: number | null;
  upvotes?: number | null;
  downvotes?: number | null;
  additional_data?: any;
}


