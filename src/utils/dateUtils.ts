/**
 * Utility functions for handling dates consistently across the app
 * Prevents timezone issues that cause dates to appear as the previous day
 */

/**
 * Formats a date string (YYYY-MM-DD) to a local Date object
 * This prevents the date from being interpreted as UTC midnight
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();

  // Handle ISO timestamp format (e.g., "2020-01-01T00:00:00.000Z")
  // Extract just the date part before any 'T'
  const datePart = dateString.split('T')[0];

  const [year, month, day] = datePart.split('-').map(Number);
  // Create date in local timezone (months are 0-indexed)
  return new Date(year, month - 1, day);
}

/**
 * Formats a Date object to YYYY-MM-DD string for input fields
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string (YYYY-MM-DD) to a localized date string
 * @param dateString - Date string in YYYY-MM-DD format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatLocalDate(
  dateString: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return '';
  
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString(undefined, options);
}

/**
 * Gets today's date as YYYY-MM-DD string
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayString(): string {
  return formatDateForInput(new Date());
}
