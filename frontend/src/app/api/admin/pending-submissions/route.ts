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

export async function GET(req: Request) {
  const adminUser = await getAdminUserFromRequest(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("salary_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending submissions" },
      { status: 500 }
    );
  }

  return NextResponse.json({ submissions: data }, { status: 200 });
}


