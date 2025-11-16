export const capitalizeFirstLetter = (str: string | null): string | null => {
  if (!str) return null;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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