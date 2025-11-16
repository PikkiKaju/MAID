/**
 * Capitalizes the first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export const capitalizeFirstLetter = (str: string | null): string | null => {
  if (!str) return null;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats upload date
 * @param dateString - Date to format
 * @returns Formatted date string in format "DD-MM-YYYY HH:MM"
 */
export const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Brak daty';
    try {
      return new Date(dateString).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.error("Błąd formatowania daty:", e);
      return dateString;
    }
  };

/**
 * Formats upload date
 */  
export const formatUploadDate = (dateString: string | Date): string => {
  try {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    console.error("Błąd formatowania daty uploadu:", e);
    return typeof dateString === 'string' ? dateString : 'Brak daty';
  }
};

/**
 * Formats full name from name and surname, with fallback to user label
 */
export const formatFullName = (
  name: string | null | undefined,
  surname: string | null | undefined,
  userLabel: string
): string => {
  if (name && surname) {
    return `${name} ${surname}`;
  }
  return name || surname || userLabel;
};

/**
 * Formats joined date with translated month name
 */
export const formatJoinedDate = (
  dateString: string,
  t: (key: string) => string,
  i18n: { exists: (key: string) => boolean }
): string => {
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  try {
    const joinedDate = new Date(dateString);
    const monthIndex = joinedDate.getMonth();
    const monthKey = monthNames[monthIndex];
    const year = joinedDate.getFullYear();
    
    const monthTranslationKey = `profile.months.${monthKey}`;
    const monthName = i18n.exists(monthTranslationKey)
      ? t(monthTranslationKey)
      : monthKey;
    
    const joinedText = t("profile.joined");
    return `${joinedText} ${monthName} ${year}`;
  } catch (e) {
    console.error("Błąd formatowania daty dołączenia:", e);
    return dateString;
  }
};

/**
 * Validates email format
 * @param email - Email to validate
 * @returns Error message if invalid, null if valid or empty (optional field)
 */
export const validateEmail = (email: string): string | null => {
  if (!email) {
    return null; // Empty email is OK (optional field)
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Invalid email format";
  }

  return null;
};

/**
 * Gets color classes for project status badge
 * @param status - Project status
 * @returns Tailwind CSS classes for status badge
 */
export const getProjectStatusColor = (status: string): string => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800 border-green-200";
    case "Draft":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Completed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};