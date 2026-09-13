export const formatDate = (dateString: string | undefined, _includeYear: boolean = true): string => {
  if (!dateString) return '';
  
  // Try to parse YYYY-MM-DD
  const parts = dateString.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const fullYear = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}.${month}.${fullYear}`;
  }

  // Fallback for other formats or if already formatted
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const fullYear = String(d.getFullYear());
    return `${day}.${month}.${fullYear}`;
  } catch (e) {
    return dateString;
  }
};

export const formatDateWithWeekday = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const formattedDate = formatDate(dateString);
  try {
    let d: Date;
    const parts = dateString.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(dateString);
    }
    if (isNaN(d.getTime())) return formattedDate;
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const weekdayName = weekdays[d.getDay()];
    return `${weekdayName} ${formattedDate}`;
  } catch (e) {
    return formattedDate;
  }
};

export const compressImageToBase64 = (
  file: File,
  maxWidth = 120,
  maxHeight = 120,
  quality = 0.7
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas 2d context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
