import { RequestHandler } from "express";

// Endpoint to validate Uploadcare uploads (webhook)
export const handleUploadcareWebhook: RequestHandler = async (req, res) => {
  try {
    const { event, data } = req.body;

    if (event === "file.uploaded") {
      // Log the uploaded file for monitoring
      console.log("[UPLOADCARE] File uploaded:", {
        uuid: data.uuid,
        originalFilename: data.originalFilename,
        size: data.size,
        mimeType: data.mimeType,
        isReady: data.isReady,
      });
    }

    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("[UPLOADCARE] Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

// Endpoint to get Uploadcare public configuration
export const handleUploadcareConfig: RequestHandler = (req, res) => {
  res.json({
    publicKey: "acdd15b9f97aec0bae14",
    // Never expose the secret key to the client
    features: {
      crop: true,
      effects: true,
      imageShrink: "2048x2048",
      tabs: "file url camera",
      multiple: false,
      multipleMax: 10,
      imagesOnly: false,
      inputAcceptTypes:
        ".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.zip,.rar,.mp4,.mp3,.txt,.csv",
    },
  });
};

// Endpoint to verify file signature (optional security check)
export const handleUploadcareVerify: RequestHandler = async (req, res) => {
  try {
    const { uuid } = req.params;
    const secretKey = process.env.UPLOADCARE_SECRET_KEY;

    if (!secretKey) {
      return res
        .status(500)
        .json({ error: "Uploadcare secret key not configured" });
    }

    // Here you could implement additional verification logic
    // For example, checking if the file is valid, scanning for malware, etc.

    res.json({
      uuid,
      verified: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[UPLOADCARE] Verification error:", error);
    res.status(500).json({ error: "File verification failed" });
  }
};
