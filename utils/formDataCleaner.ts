/**
 * Cleans formData to remove values that Convex doesn't support:
 * - Empty objects {}
 * - null values
 * - undefined values
 * - Empty arrays
 * - Nested empty objects
 */
export function cleanFormData(formData: Record<string, any>): Record<string, any> {
  if (!formData || typeof formData !== 'object') {
    return {};
  }

  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(formData)) {
    // Skip null and undefined
    if (value === null || value === undefined) {
      continue;
    }

    // Handle empty objects
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Check if object is empty
      if (Object.keys(value).length === 0) {
        continue; // Skip empty objects
      }
      
      // Recursively clean nested objects
      const cleanedNested = cleanFormData(value);
      // Only include if the cleaned object is not empty
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    }
    // Handle arrays
    else if (Array.isArray(value)) {
      // Filter out null/undefined and clean array items
      const cleanedArray = value
        .filter(item => item !== null && item !== undefined)
        .map(item => {
          if (typeof item === 'object' && !Array.isArray(item)) {
            return cleanFormData(item);
          }
          return item;
        })
        .filter(item => {
          // Remove empty objects from array
          if (typeof item === 'object' && !Array.isArray(item)) {
            return Object.keys(item).length > 0;
          }
          return true;
        });
      
      // Only include non-empty arrays
      if (cleanedArray.length > 0) {
        cleaned[key] = cleanedArray;
      }
    }
    // Handle primitive values (string, number, boolean)
    else {
      // Skip empty strings
      if (typeof value === 'string' && value.trim().length === 0) {
        continue;
      }
      cleaned[key] = value;
    }
  }

  return cleaned;
}
