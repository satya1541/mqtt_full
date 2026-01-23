import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDecimalTime = (val: number) => {
    const h = Math.floor(val);
    const m = Math.floor((val * 60) % 60);
    const s = Math.floor((val * 3600) % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
