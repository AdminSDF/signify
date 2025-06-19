
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
