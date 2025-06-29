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