export function formatDateTime(dateString?: string | null, locale?: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    };
    return new Intl.DateTimeFormat(locale || undefined, opts).format(d);
  } catch (err) {
    return String(dateString);
  }
}

export default formatDateTime;
