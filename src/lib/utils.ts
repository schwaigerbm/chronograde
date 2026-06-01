export const formatDate = (dateString: string | undefined, includeYear: boolean = true): string => {
  if (!dateString) return '';
  
  // Try to parse YYYY-MM-DD
  const parts = dateString.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0].substring(2);
    const month = parts[1];
    const day = parts[2];
    return includeYear ? `${day}.${month}.${year}` : `${day}.${month}.`;
  }

  // Fallback for other formats or if already formatted
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).substring(2);
    return includeYear ? `${day}.${month}.${year}` : `${day}.${month}.`;
  } catch (e) {
    return dateString;
  }
};
