export interface SalaryPayload {
  company: string;
  role: string;
  location: string;
  yearsOfExperience?: string;
  baseSalary?: string;
  bonus?: string;
  stockCompensation?: string;
  totalCompensation: string;
  type: "fulltime" | "internship" | "university";
  employmentType?: "Full-time" | "Internship";
  duration?: string;
  stipend?: string;
  university?: string;
  year?: string;
}


