import { NextResponse } from "next/server";
import { supabaseServer } from "@backend/supabase/server";
import { createSalaryFromUserInput } from "@backend/salaries/service";
import type { CreateSalaryInput } from "@backend/salaries/types";

async function getAdminUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return null;
  }

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("ADMIN_EMAIL is not set");
    return null;
  }

  if (data.user.email !== adminEmail) {
    return null;
  }

  return data.user;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  const adminUser = await getAdminUserFromRequest(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const { data: submission, error: fetchError } = await supabaseServer
    .from("salary_submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !submission) {
    console.error("Error fetching submission:", fetchError);
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 }
    );
  }

  const input: CreateSalaryInput = {
    company: submission.company ?? "",
    role: submission.role ?? "",
    location: submission.location ?? "",
    yearsOfExperience: submission.years_of_experience ?? undefined,
    baseSalary: submission.base_salary ?? undefined,
    bonus: submission.bonus ?? undefined,
    stockCompensation: submission.stock_compensation ?? undefined,
    totalCompensation: submission.total_compensation ?? "",
    type: submission.type ?? "fulltime",
    employmentType: submission.employment_type ?? undefined,
    duration: submission.duration ?? undefined,
    stipend: submission.stipend ?? undefined,
    university: submission.university ?? undefined,
    year: submission.year ?? undefined,
  };

  try {
    const salary = await createSalaryFromUserInput(input);

    const { error: updateError } = await supabaseServer
      .from("salary_submissions")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUser.email,
        published_salary_id: salary.id,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating submission after approval:", updateError);
    }

    return NextResponse.json({ salary }, { status: 200 });
  } catch (error: any) {
    console.error("Error approving submission:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to approve submission" },
      { status: 400 }
    );
  }
}


