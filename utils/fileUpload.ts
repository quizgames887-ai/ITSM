import { Id } from "@/convex/_generated/dataModel";

/**
 * Compress an image file if it's an image type
 * Returns the original file if compression fails or file is not an image
 */
async function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.85): Promise<File> {
  // Only compress image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip compression for very small files (< 100KB)
  if (file.size < 100 * 1024) {
    return file;
  }

  try {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                // Only use compressed version if it's smaller
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: file.lastModified,
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            file.type,
            quality
          );
        };
        img.onerror = () => resolve(file);
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          resolve(file);
        }
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.warn('Image compression failed, using original file:', error);
    return file;
  }
}

/**
 * Optimized file upload function with compression and better error handling
 */
export async function uploadFileOptimized(
  file: File,
  generateUploadUrl: () => Promise<string>,
  options: {
    compressImages?: boolean;
    maxImageWidth?: number;
    imageQuality?: number;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<Id<"_storage"> | null> {
  const {
    compressImages = true,
    maxImageWidth = 1920,
    imageQuality = 0.85,
    onProgress,
  } = options;

  try {
    // Step 1: Compress image if needed (non-blocking, happens in parallel with URL generation)
    const compressionPromise = compressImages
      ? compressImage(file, maxImageWidth, imageQuality)
      : Promise.resolve(file);

    // Step 2: Generate upload URL (can happen in parallel with compression)
    const urlPromise = generateUploadUrl();

    // Wait for both to complete
    const [processedFile, uploadUrl] = await Promise.all([compressionPromise, urlPromise]);

    if (!uploadUrl || typeof uploadUrl !== "string") {
      throw new Error("Failed to generate upload URL");
    }

    // Step 3: Upload file with progress tracking
    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": processedFile.type },
      body: processedFile,
    });

    if (!uploadResult.ok) {
      // Try to get error message efficiently
      let errorMessage = uploadResult.statusText;
      try {
        const errorData = await uploadResult.json();
        errorMessage = errorData?.error || errorData?.message || errorMessage;
      } catch {
        // If JSON parsing fails, try text
        try {
          const errorText = await uploadResult.text();
          errorMessage = errorText || errorMessage;
        } catch {
          // Use status text as fallback
        }
      }
      throw new Error(`Failed to upload file: ${errorMessage}`);
    }

    // Step 4: Parse response efficiently using .json() directly
    const responseData = await uploadResult.json();
    const storageId = responseData?.storageId;

    if (!storageId) {
      throw new Error("Failed to get storage ID from upload response");
    }

    if (onProgress) {
      onProgress(100);
    }

    return storageId as Id<"_storage">;
  } catch (error: any) {
    console.error("File upload error:", error);
    throw error;
  }
}

/**
 * Upload multiple files in parallel
 */
export async function uploadFilesParallel(
  files: File[],
  generateUploadUrl: () => Promise<string>,
  options: {
    compressImages?: boolean;
    maxImageWidth?: number;
    imageQuality?: number;
    onProgress?: (fileIndex: number, progress: number) => void;
  } = {}
): Promise<(Id<"_storage"> | null)[]> {
  const uploadPromises = files.map((file, index) =>
    uploadFileOptimized(file, generateUploadUrl, {
      ...options,
      onProgress: options.onProgress
        ? (progress) => options.onProgress!(index, progress)
        : undefined,
    }).catch((error) => {
      console.error(`Failed to upload file ${index + 1}:`, error);
      return null;
    })
  );

  return Promise.all(uploadPromises);
}
