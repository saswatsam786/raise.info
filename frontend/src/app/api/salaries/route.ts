import { NextResponse } from "next/server";
import { createSalaryFromUserInput } from "@backend/salaries/service";
import { CreateSalaryInput } from "@backend/salaries/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CreateSalaryInput>;

    const result = await createSalaryFromUserInput({
      company: body.company ?? "",
      role: body.role ?? "",
      location: body.location ?? "",
      yearsOfExperience: body.yearsOfExperience,
      baseSalary: body.baseSalary,
      bonus: body.bonus,
      stockCompensation: body.stockCompensation,
      totalCompensation: body.totalCompensation ?? "",
      type: (body.type as CreateSalaryInput["type"]) ?? "fulltime",
      employmentType: body.employmentType,
      duration: body.duration,
      stipend: body.stipend,
      university: body.university,
      year: body.year,
    });

    return NextResponse.json({ salary: result }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/salaries:", error);
    const message =
      typeof error?.message === "string"
        ? error.message
        : "Failed to create salary entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


