'use client'

import { useState, useRef } from 'react'
import { cn, formatFileSize, validateFile } from '@/lib/utils'

function UploadIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V6.75m0 0l-3 3m3-3l3 3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v.75A2.25 2.25 0 005.25 19.5h13.5A2.25 2.25 0 0021 17.25v-.75" />
    </svg>
  )
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

interface FileUploadProps {
  label: string
  description: string
  accept?: string
  required?: boolean
  value?: string
  onChange: (file: File) => void
  error?: string
}

export function FileUpload({ 
  label, 
  description, 
  accept = 'image/*,.pdf', 
  required = false,
  value,
  onChange,
  error 
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    const validation = validateFile(file)
    if (!validation.valid) {
      return // Error will be handled by parent
    }

    setIsUploading(true)
    setUploadedFile(file)
    
    // Simulate upload progress
    setTimeout(() => {
      setIsUploading(false)
      onChange(file)
    }, 1500)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const removeFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <label className="form-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <p className="text-sm text-gray-600">{description}</p>

      {!uploadedFile ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragging 
              ? "border-clay bg-clay/5" 
              : "border-gray-300 hover:border-clay hover:bg-gray-50",
            error && "border-red-300 bg-red-50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
            required={required}
          />
          
          <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-clay">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, PDF up to 10MB
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-clay/10 rounded-full flex items-center justify-center">
                  <UploadIcon className="w-5 h-5 text-clay" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadedFile.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={removeFile}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
          
          {isUploading && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-clay h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Uploading...</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="form-error">{error}</p>
      )}
    </div>
  )
}
