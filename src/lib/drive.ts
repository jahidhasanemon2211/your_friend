export interface BackupPayload {
  exportedAt: string;
  exporterEmail: string | null;
  messagesCount: number;
  messages: any[];
}

/**
 * Creates a JSON backup file in the user's Google Drive using the REST API.
 * Uses a multipart/related POST request to upload file metadata and content in a single operation.
 */
export async function uploadBackupToDrive(
  accessToken: string,
  userEmail: string | null,
  messages: any[]
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const payload: BackupPayload = {
      exportedAt: new Date().toISOString(),
      exporterEmail: userEmail,
      messagesCount: messages.length,
      messages: messages,
    };

    const fileName = `pwa_chat_backup_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
    const metadata = {
      name: fileName,
      mimeType: "application/json",
      description: "Chat history exported from PWA Web Chat Platform.",
    };

    const boundary = "------pwa_chat_backup_boundary_123456";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(payload, null, 2) +
      closeDelimiter;

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "Content-Length": multipartRequestBody.length.toString(),
        },
        body: multipartRequestBody,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Drive API Error:", errorText);
      return { success: false, error: `Drive API status: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    return { success: true, fileId: result.id };
  } catch (error: any) {
    console.error("Failed to perform Google Drive upload:", error);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}
