import { supabase } from "@/integrations/supabase/client";

/**
 * Service to handle uploading, fetching, and deleting evidence files
 * in Supabase Storage.
 *
 * Bucket Name: "evidence-vault"
 * Folder Structure: "user_id/evidence_id/filename"
 */
export const storageService = {
  /**
   * Uploads an evidence file (audio, video, image, text, etc.) to the
   * "evidence-vault" bucket inside the folder for the logged-in user.
   */
  uploadEvidence: async (
    file: File | Blob,
    filename: string,
    evidenceId: string
  ): Promise<string> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Path structure: user_id/evidence_id/filename
    const storagePath = `${userId}/${evidenceId}/${filename}`;

    const { data, error } = await supabase.storage
      .from("evidence-vault")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("[storageService] uploadError:", error.message);
      throw error;
    }

    return data?.path ?? storagePath;
  },

  /**
   * Generates a temporary signed URL (valid for 1 hour) to securely access a file.
   * Ensures the file path belongs to the logged-in user before making the request.
   */
  getEvidence: async (storagePath: string): Promise<string> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Client-side guard: path must start with user's ID
    if (!storagePath.startsWith(`${userId}/`)) {
      throw new Error("Unauthorized: Cannot access other users' evidence");
    }

    const { data, error } = await supabase.storage
      .from("evidence-vault")
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) {
      console.error("[storageService] getError:", error.message);
      throw error;
    }

    if (!data?.signedUrl) {
      throw new Error("Failed to generate signed URL");
    }

    return data.signedUrl;
  },

  /**
   * Deletes a file from the bucket.
   * Ensures the file path belongs to the logged-in user before making the request.
   */
  deleteEvidence: async (storagePath: string): Promise<void> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Client-side guard: path must start with user's ID
    if (!storagePath.startsWith(`${userId}/`)) {
      throw new Error("Unauthorized: Cannot delete other users' evidence");
    }

    const { error } = await supabase.storage
      .from("evidence-vault")
      .remove([storagePath]);

    if (error) {
      console.error("[storageService] deleteError:", error.message);
      throw error;
    }
  },
};
