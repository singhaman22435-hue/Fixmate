export function formatCurrency(amount: number, currency: string = '₹'): string {
  if (isNaN(amount)) return `${currency}0.00`;
  return `${currency}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStringOrObj: string | Date | null | undefined): string {
  if (!dateStringOrObj) return 'N/A';
  try {
    const d = new Date(dateStringOrObj);
    if (isNaN(d.getTime())) return String(dateStringOrObj);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dateStringOrObj);
  }
}

export function formatDateTime(dateStringOrObj: string | Date | null | undefined): string {
  if (!dateStringOrObj) return 'N/A';
  try {
    const d = new Date(dateStringOrObj);
    if (isNaN(d.getTime())) return String(dateStringOrObj);
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStringOrObj);
  }
}

