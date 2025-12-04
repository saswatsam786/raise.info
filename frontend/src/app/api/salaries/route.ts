import { NextResponse } from "next/server";
import { supabaseServer } from "@backend/supabase/server";
import type { CreateSalaryInput } from "@backend/salaries/types";

function toNumberOrNull(value?: string | number | null): number | null {
  if (value === undefined || value === null) return null;
  if (value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? null : n;
}

function toIntOrNull(value?: string | number | null): number | null {
  const n = toNumberOrNull(value);
  return n === null ? null : Math.trunc(n);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CreateSalaryInput>;

    // Basic validation at submission time
    if (!body.company || !body.role || !body.location || !body.totalCompensation) {
      return NextResponse.json(
        { error: "Missing required fields: company, role, location, totalCompensation" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("salary_submissions")
      .insert({
        company: body.company,
        role: body.role,
        location: body.location,
        years_of_experience: toNumberOrNull(body.yearsOfExperience as any),
        base_salary: toNumberOrNull(body.baseSalary as any),
        bonus: toNumberOrNull(body.bonus as any),
        stock_compensation: toNumberOrNull(body.stockCompensation as any),
        total_compensation: body.totalCompensation,
        type: (body.type as CreateSalaryInput["type"]) ?? "fulltime",
        employment_type: body.employmentType ?? null,
        duration: body.duration ?? null,
        stipend: body.stipend ?? null,
        university: body.university ?? null,
        year: toIntOrNull(body.year as any),
        status: "pending",
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error inserting salary submission:", error);
      return NextResponse.json(
        { error: "Failed to submit salary data" },
        { status: 500 }
      );
    }

    return NextResponse.json({ submission: data }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/salaries:", error);
    const message =
      typeof error?.message === "string"
        ? error.message
        : "Failed to submit salary entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


