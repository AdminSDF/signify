
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns';
import { Timestamp } from '@/lib/firebase';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function copyToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (!successful) throw new Error('Fallback: Copying text command was unsuccessful');
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      throw err; // Re-throw to be caught by the caller
    }

    document.body.removeChild(textArea);
    return;
  }
  await navigator.clipboard.writeText(text);
}

export const formatDisplayDate = (dateInput: any, formatType: 'datetime' | 'date' = 'datetime'): string => {
    if (!dateInput) return 'N/A';
    let dateObj: Date;
    if (dateInput instanceof Timestamp) dateObj = dateInput.toDate();
    else if (dateInput instanceof Date) dateObj = dateInput;
    else dateObj = new Date(dateInput);
  
    if (isNaN(dateObj.getTime())) return 'N/A';
    return format(dateObj, formatType === 'date' ? "PPP" : "Pp");
};
