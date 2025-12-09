"use client";

import React, { useState, useRef } from "react";
import { Paperclip, Image as ImageIcon, AtSign, X, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { uploadImage, uploadFile, formatFileSize } from "@/lib/supabase/storage";
import { Attachment } from "@/types/comments";

interface CommentInputProps {
  onSubmit: (content: string, attachments?: Attachment[], mentions?: string[]) => Promise<void>;
  placeholder?: string;
  buttonText?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}

export default function CommentInput({
  onSubmit,
  placeholder = "Type comment here...",
  buttonText = "Comment",
  autoFocus = false,
  onCancel,
}: CommentInputProps) {
  const { user, openAuthModal } = useAuth();
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const MAX_CHARS = 100;

  const handleFileUpload = async (file: File, type: "file" | "image") => {
    if (!user) return;

    // Client-side validation before upload
    if (type === "image") {
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedImageTypes.includes(file.type)) {
        setUploadError('Invalid image type. Allowed types: JPEG, PNG, GIF, WebP.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Image size must be less than 5MB.');
        return;
      }
    } else {
      const allowedFileTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
      ];
      if (!allowedFileTypes.includes(file.type)) {
        setUploadError('Invalid file type. Allowed types: PDF, Word, Excel, Text, CSV.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB.');
        return;
      }
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      const attachment = type === "image"
        ? await uploadImage(file, user.id, setUploadProgress)
        : await uploadFile(file, user.id, setUploadProgress);

      setAttachments((prev) => [...prev, attachment]);
    } catch (error: any) {
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if ((!content.trim() && attachments.length === 0) || isSubmitting) return;

    // Require authentication before submitting
    if (!user) {
      openAuthModal();
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadError(null);
      await onSubmit(content.trim(), attachments);
      setContent("");
      setAttachments([]);
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadClick = (type: "file" | "image") => {
    if (!user) {
      openAuthModal();
      return;
    }

    if (type === "file") {
      fileInputRef.current?.click();
    } else {
      imageInputRef.current?.click();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, "file");
          e.target.value = "";
        }}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, "image");
          e.target.value = "";
        }}
        className="hidden"
      />

      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => {
            if (user) {
              setContent(e.target.value.slice(0, MAX_CHARS));
            }
          }}
          placeholder={user ? placeholder : "Sign in to post a comment..."}
          autoFocus={autoFocus}
          disabled={isSubmitting || isUploading}
          readOnly={!user}
          className="w-full p-4 text-sm text-slate-700 placeholder-slate-400 resize-none focus:outline-none rounded-t-lg disabled:opacity-50"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
          maxLength={MAX_CHARS}
          onClick={() => {
            if (!user) {
              openAuthModal();
            }
          }}
          onFocus={(e) => {
            if (!user) {
              e.target.blur();
              openAuthModal();
            }
          }}
        />
        {!user && (
          <div
            className="absolute inset-0 cursor-pointer z-10"
            onClick={() => openAuthModal()}
            onMouseDown={(e) => {
              e.preventDefault();
              openAuthModal();
            }}
          />
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="px-4 py-2 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="flex-1 bg-slate-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-600">{uploadError}</p>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-200">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs"
              >
                {attachment.type === "image" ? (
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                ) : (
                  <FileText className="w-4 h-4 text-slate-600" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 truncate font-medium">
                    {attachment.name}
                  </p>
                  <p className="text-slate-500">{formatFileSize(attachment.size)}</p>
                </div>
                <button
                  onClick={() => handleRemoveAttachment(index)}
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                >
                  <X className="w-3 h-3 text-slate-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-b-lg border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleUploadClick("file")}
            disabled={isUploading || isSubmitting}
            className={`p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              user
                ? "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                : "text-slate-400 cursor-pointer hover:bg-slate-200"
            }`}
            title={user ? "Attach file (PDF, Word, Excel, Text)" : "Sign in to attach files"}
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleUploadClick("image")}
            disabled={isUploading || isSubmitting}
            className={`p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              user
                ? "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                : "text-slate-400 cursor-pointer hover:bg-slate-200"
            }`}
            title={user ? "Add image (JPEG, PNG, GIF, WebP)" : "Sign in to add images"}
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 text-slate-400 cursor-not-allowed"
            title="Mention user (coming soon)"
            disabled
          >
            <AtSign className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {content.length}/{MAX_CHARS}
          </span>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isSubmitting || isUploading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={(!content.trim() && attachments.length === 0) || isSubmitting || isUploading || !user}
            className="px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!user ? "Sign in to post comments" : undefined}
          >
            {isSubmitting ? "Posting..." : buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

