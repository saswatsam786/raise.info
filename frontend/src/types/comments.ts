export interface Attachment {
  type: "image" | "file";
  name: string;
  url: string;
  size: number;
  mimeType?: string;
}

export interface Comment {
  id: string;
  salary_id: string; // Reference to the salary entry
  user_id: string | null; // Null for anonymous users
  user_display_name: string;
  user_photo_url: string | null;
  is_anonymous: boolean;
  content: string;
  attachments?: Attachment[];
  mentions?: string[]; // User IDs of mentioned users
  created_at: string; // ISO timestamp from Supabase
  updated_at: string; // ISO timestamp from Supabase
  upvotes: number;
  downvotes: number;
  reply_count: number;
  voted_by: {
    [userId: string]: "up" | "down";
  };
}

export interface Reply {
  id: string;
  comment_id: string;
  user_id: string | null; // Null for anonymous users
  user_display_name: string;
  user_photo_url: string | null;
  is_anonymous: boolean;
  content: string;
  attachments?: Attachment[];
  mentions?: string[];
  created_at: string; // ISO timestamp from Supabase
  updated_at: string; // ISO timestamp from Supabase
  upvotes: number;
  downvotes: number;
  voted_by: {
    [userId: string]: "up" | "down";
  };
}

export type SortOption = "all" | "best" | "newest" | "oldest";

export interface CommentWithReplies extends Comment {
  replies: Reply[];
}
