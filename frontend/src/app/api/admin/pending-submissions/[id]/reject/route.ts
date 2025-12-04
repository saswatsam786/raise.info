import { NextResponse } from "next/server";
import { supabaseServer } from "@backend/supabase/server";

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
  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : null;

  const { error } = await supabaseServer
    .from("salary_submissions")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.email,
      rejection_reason: reason,
    })
    .eq("id", id);

  if (error) {
    console.error("Error rejecting submission:", error);
    return NextResponse.json(
      { error: "Failed to reject submission" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}


