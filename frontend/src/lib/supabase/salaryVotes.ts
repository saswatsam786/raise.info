import { supabase } from "./config";

/**
 * Vote on a salary entry (upvote or downvote)
 * Users can only vote once per salary entry
 */
export const voteOnSalary = async (
  salaryId: string,
  voteType: "up" | "down"
): Promise<{ success: boolean; message?: string }> => {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Must be logged in to vote" };
    }

    // Check if user has already voted
    const { data: existingVote, error: voteCheckError } = await supabase
      .from("salary_votes")
      .select("vote_type")
      .eq("salary_id", salaryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (voteCheckError && voteCheckError.code !== "PGRST116") {
      // PGRST116 is "not found" which is fine, but other errors are not
      console.error("Error checking existing vote:", voteCheckError);
      return { success: false, message: "Error checking existing vote" };
    }

    // If user has already voted, prevent voting again
    if (existingVote) {
      return { 
        success: false, 
        message: "You have already voted on this salary entry" 
      };
    }

    // Get the salary record to verify it exists
    const { data: salary, error: salaryError } = await supabase
      .from("salaries")
      .select("id")
      .eq("id", salaryId)
      .single();

    if (salaryError || !salary) {
      console.error("Salary not found:", salaryError);
      return { success: false, message: "Salary not found" };
    }

    // Insert the vote into salary_votes table
    // The database trigger will automatically update upvotes/downvotes in salaries table
    const { error: insertError } = await supabase
      .from("salary_votes")
      .insert({
        salary_id: salaryId,
        user_id: user.id,
        vote_type: voteType,
      });

    if (insertError) {
      // Check if it's a unique constraint violation (user already voted)
      if (insertError.code === "23505") {
        return { 
          success: false, 
          message: "You have already voted on this salary entry" 
        };
      }
      console.error("Error inserting vote:", insertError);
      return { success: false, message: "Error submitting vote" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error voting on salary:", error);
    return { success: false, message: "An unexpected error occurred" };
  }
};

/**
 * Get user's current vote on a salary entry
 */
export const getUserVote = async (
  salaryId: string
): Promise<"up" | "down" | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from("salary_votes")
      .select("vote_type")
      .eq("salary_id", salaryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.vote_type as "up" | "down";
  } catch (error) {
    console.error("Error getting user vote:", error);
    return null;
  }
};
