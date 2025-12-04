import { supabase } from "./config";

/**
 * Get the access token for API authentication
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
}

/**
 * Vote on a salary entry (upvote or downvote)
 * Handles creating new votes, updating existing votes, and removing votes
 */
export const voteOnSalary = async (
  salaryId: string,
  voteType: "up" | "down"
): Promise<{ success: boolean; message?: string; upvotes?: number; downvotes?: number; userVote?: "up" | "down" | null }> => {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Must be logged in to vote" };
    }

    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "Authentication error" };
    }

    // First, get the current vote status
    const getResponse = await fetch(`/api/salaries/${salaryId}/vote`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!getResponse.ok) {
      const errorData = await getResponse.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.error || "Error fetching vote status",
      };
    }

    const { userVote: existingVote } = await getResponse.json();

    let response: Response;

    // Determine which HTTP method to use
    if (!existingVote) {
      // No existing vote - create new vote (POST)
      response = await fetch(`/api/salaries/${salaryId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voteType }),
      });
    } else if (existingVote === voteType) {
      // Same vote type - remove vote (DELETE)
      response = await fetch(`/api/salaries/${salaryId}/vote`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } else {
      // Different vote type - update vote (PUT)
      response = await fetch(`/api/salaries/${salaryId}/vote`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voteType }),
      });
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || "Error processing vote",
      };
    }

    return {
      success: true,
      userVote: data.userVote,
      upvotes: data.upvotes,
      downvotes: data.downvotes,
    };
  } catch (error) {
    console.error("Error voting on salary:", error);
    return { success: false, message: "An unexpected error occurred" };
  }
};

/**
 * Get user's current vote on a salary entry and current vote counts
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

    const token = await getAccessToken();
    if (!token) {
      return null;
    }

    const response = await fetch(`/api/salaries/${salaryId}/vote`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("Error fetching user vote:", response.statusText);
      return null;
    }

    const data = await response.json();
    return data.userVote || null;
  } catch (error) {
    console.error("Error getting user vote:", error);
    return null;
  }
};
