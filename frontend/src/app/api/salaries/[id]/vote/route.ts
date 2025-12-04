import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@backend/supabase/server";

/**
 * Get user's vote and current vote counts for a salary entry
 * GET /api/salaries/[id]/vote
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: salaryId } = await params;

    // Get user from Authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      // Return vote counts without user vote if not authenticated
      const { data: salary, error: salaryError } = await supabaseServer
        .from("salaries")
        .select("upvotes, downvotes")
        .eq("id", salaryId)
        .single();

      if (salaryError || !salary) {
        return NextResponse.json(
          { error: "Salary not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        userVote: null,
        upvotes: salary.upvotes || 0,
        downvotes: salary.downvotes || 0,
      });
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      // Return vote counts without user vote if auth fails
      const { data: salary, error: salaryError } = await supabaseServer
        .from("salaries")
        .select("upvotes, downvotes")
        .eq("id", salaryId)
        .single();

      if (salaryError || !salary) {
        return NextResponse.json(
          { error: "Salary not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        userVote: null,
        upvotes: salary.upvotes || 0,
        downvotes: salary.downvotes || 0,
      });
    }

    // Get user's vote
    const { data: userVote, error: voteError } = await supabaseServer
      .from("salary_votes")
      .select("vote_type")
      .eq("salary_id", salaryId)
      .eq("user_id", user.id)
      .maybeSingle();

    // Get current vote counts
    const { data: salary, error: salaryError } = await supabaseServer
      .from("salaries")
      .select("upvotes, downvotes")
      .eq("id", salaryId)
      .single();

    if (salaryError || !salary) {
      return NextResponse.json(
        { error: "Salary not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userVote: userVote?.vote_type || null,
      upvotes: salary.upvotes || 0,
      downvotes: salary.downvotes || 0,
    });
  } catch (error: any) {
    console.error("Error in GET /api/salaries/[id]/vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Create a new vote (upvote or downvote)
 * POST /api/salaries/[id]/vote
 * Body: { voteType: "up" | "down" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: salaryId } = await params;
    const body = await request.json();
    const { voteType } = body;

    if (!voteType || (voteType !== "up" && voteType !== "down")) {
      return NextResponse.json(
        { error: "Invalid voteType. Must be 'up' or 'down'" },
        { status: 400 }
      );
    }

    // Get user from Authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized. Must be logged in to vote" },
        { status: 401 }
      );
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid token" },
        { status: 401 }
      );
    }

    // Verify salary exists
    const { data: salary, error: salaryError } = await supabaseServer
      .from("salaries")
      .select("id")
      .eq("id", salaryId)
      .single();

    if (salaryError || !salary) {
      return NextResponse.json(
        { error: "Salary not found" },
        { status: 404 }
      );
    }

    // Check if user has already voted
    const { data: existingVote, error: voteCheckError } = await supabaseServer
      .from("salary_votes")
      .select("vote_type")
      .eq("salary_id", salaryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (voteCheckError && voteCheckError.code !== "PGRST116") {
      console.error("Error checking existing vote:", voteCheckError);
      return NextResponse.json(
        { error: "Error checking existing vote" },
        { status: 500 }
      );
    }

    if (existingVote) {
      return NextResponse.json(
        {
          error: "User has already voted. Use PUT to update or DELETE to remove vote",
        },
        { status: 409 }
      );
    }

    // Insert the vote
    const { error: insertError } = await supabaseServer
      .from("salary_votes")
      .insert({
        salary_id: salaryId,
        user_id: user.id,
        vote_type: voteType,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "User has already voted on this salary entry" },
          { status: 409 }
        );
      }
      console.error("Error inserting vote:", insertError);
      return NextResponse.json(
        { error: "Error submitting vote" },
        { status: 500 }
      );
    }

    // Wait a bit for trigger to complete, then get updated counts
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { data: updatedSalary, error: fetchError } = await supabaseServer
      .from("salaries")
      .select("upvotes, downvotes")
      .eq("id", salaryId)
      .single();

    if (fetchError) {
      console.error("Error fetching updated vote counts:", fetchError);
    }

    return NextResponse.json(
      {
        success: true,
        userVote: voteType,
        upvotes: updatedSalary?.upvotes || 0,
        downvotes: updatedSalary?.downvotes || 0,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/salaries/[id]/vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Update existing vote (change from up to down or vice versa)
 * PUT /api/salaries/[id]/vote
 * Body: { voteType: "up" | "down" }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: salaryId } = await params;
    const body = await request.json();
    const { voteType } = body;

    if (!voteType || (voteType !== "up" && voteType !== "down")) {
      return NextResponse.json(
        { error: "Invalid voteType. Must be 'up' or 'down'" },
        { status: 400 }
      );
    }

    // Get user from Authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized. Must be logged in to vote" },
        { status: 401 }
      );
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid token" },
        { status: 401 }
      );
    }

    // Verify salary exists
    const { data: salary, error: salaryError } = await supabaseServer
      .from("salaries")
      .select("id")
      .eq("id", salaryId)
      .single();

    if (salaryError || !salary) {
      return NextResponse.json(
        { error: "Salary not found" },
        { status: 404 }
      );
    }

    // Check if user has an existing vote
    const { data: existingVote, error: voteCheckError } = await supabaseServer
      .from("salary_votes")
      .select("vote_type")
      .eq("salary_id", salaryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (voteCheckError && voteCheckError.code !== "PGRST116") {
      console.error("Error checking existing vote:", voteCheckError);
      return NextResponse.json(
        { error: "Error checking existing vote" },
        { status: 500 }
      );
    }

    if (!existingVote) {
      return NextResponse.json(
        { error: "No existing vote found. Use POST to create a new vote" },
        { status: 404 }
      );
    }

    // If voting the same type, return success (no change needed)
    if (existingVote.vote_type === voteType) {
      const { data: currentSalary } = await supabaseServer
        .from("salaries")
        .select("upvotes, downvotes")
        .eq("id", salaryId)
        .single();

      return NextResponse.json({
        success: true,
        userVote: voteType,
        upvotes: currentSalary?.upvotes || 0,
        downvotes: currentSalary?.downvotes || 0,
      });
    }

    // Update the vote
    const { error: updateError } = await supabaseServer
      .from("salary_votes")
      .update({ vote_type: voteType })
      .eq("salary_id", salaryId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating vote:", updateError);
      return NextResponse.json(
        { error: "Error updating vote" },
        { status: 500 }
      );
    }

    // Wait a bit for trigger to complete, then get updated counts
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { data: updatedSalary, error: fetchError } = await supabaseServer
      .from("salaries")
      .select("upvotes, downvotes")
      .eq("id", salaryId)
      .single();

    if (fetchError) {
      console.error("Error fetching updated vote counts:", fetchError);
    }

    return NextResponse.json({
      success: true,
      userVote: voteType,
      upvotes: updatedSalary?.upvotes || 0,
      downvotes: updatedSalary?.downvotes || 0,
    });
  } catch (error: any) {
    console.error("Error in PUT /api/salaries/[id]/vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Delete user's vote (remove vote)
 * DELETE /api/salaries/[id]/vote
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: salaryId } = await params;

    // Get user from Authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized. Must be logged in to remove vote" },
        { status: 401 }
      );
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid token" },
        { status: 401 }
      );
    }

    // Verify salary exists
    const { data: salary, error: salaryError } = await supabaseServer
      .from("salaries")
      .select("id")
      .eq("id", salaryId)
      .single();

    if (salaryError || !salary) {
      return NextResponse.json(
        { error: "Salary not found" },
        { status: 404 }
      );
    }

    // Check if user has an existing vote
    const { data: existingVote, error: voteCheckError } = await supabaseServer
      .from("salary_votes")
      .select("vote_type")
      .eq("salary_id", salaryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (voteCheckError && voteCheckError.code !== "PGRST116") {
      console.error("Error checking existing vote:", voteCheckError);
      return NextResponse.json(
        { error: "Error checking existing vote" },
        { status: 500 }
      );
    }

    if (!existingVote) {
      return NextResponse.json(
        { error: "No vote found to delete" },
        { status: 404 }
      );
    }

    // Delete the vote
    const { error: deleteError } = await supabaseServer
      .from("salary_votes")
      .delete()
      .eq("salary_id", salaryId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting vote:", deleteError);
      return NextResponse.json(
        { error: "Error removing vote" },
        { status: 500 }
      );
    }

    // Wait a bit for trigger to complete, then get updated counts
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { data: updatedSalary, error: fetchError } = await supabaseServer
      .from("salaries")
      .select("upvotes, downvotes")
      .eq("id", salaryId)
      .single();

    if (fetchError) {
      console.error("Error fetching updated vote counts:", fetchError);
    }

    return NextResponse.json({
      success: true,
      userVote: null,
      upvotes: updatedSalary?.upvotes || 0,
      downvotes: updatedSalary?.downvotes || 0,
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/salaries/[id]/vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

