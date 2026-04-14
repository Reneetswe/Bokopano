import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function validateFile(file: File, maxSize: number = 10485760): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/pdf', 'application/pdf']
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and PDF files are allowed' }
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: `File size must be less than ${formatFileSize(maxSize)}` }
  }
  
  return { valid: true }
}

export function getStatusColor(status: string): string {
  const colors = {
    'DRAFT': 'bg-gray-100 text-gray-800',
    'SUBMITTED': 'bg-blue-100 text-blue-800',
    'UNDER_REVIEW': 'bg-yellow-100 text-yellow-800',
    'NEEDS_INFO': 'bg-orange-100 text-orange-800',
    'APPROVED': 'bg-green-100 text-green-800',
    'REJECTED': 'bg-red-100 text-red-800',
    'SUSPENDED': 'bg-red-100 text-red-800',
  }
  
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

export function getStatusText(status: string): string {
  const texts = {
    'DRAFT': 'Draft',
    'SUBMITTED': 'Submitted',
    'UNDER_REVIEW': 'Under Review',
    'NEEDS_INFO': 'Needs Information',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected',
    'SUSPENDED': 'Suspended',
  }
  
  return texts[status as keyof typeof texts] || status
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}
