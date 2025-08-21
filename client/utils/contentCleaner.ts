/**
 * Utility to clean content from edit-mode attributes when rendering in posts/comments
 */

export function cleanContentForDisplay(content: string): string {
  if (!content) return content;

  // Remove data-edit-mode attributes from video elements and containers
  let cleanedContent = content
    .replace(/data-edit-mode="true"/g, "")
    .replace(/data-edit-mode="false"/g, "")
    .replace(/data-edit-mode='true'/g, "")
    .replace(/data-edit-mode='false'/g, "")
    // Clean up any extra spaces left by attribute removal
    .replace(/\s+/g, " ")
    .replace(/\s+>/g, ">");

  return cleanedContent;
}

export function cleanContentForSaving(content: string): string {
  if (!content) return content;

  // Remove all edit-mode specific attributes before saving
  let cleanedContent = content
    .replace(/data-edit-mode="[^"]*"/g, "")
    .replace(/data-edit-mode='[^']*'/g, "")
    .replace(/data-click-handled="[^"]*"/g, "")
    .replace(/data-click-handled='[^']*'/g, "")
    // Clean up any extra spaces
    .replace(/\s+/g, " ")
    .replace(/\s+>/g, ">");

  return cleanedContent;
}
