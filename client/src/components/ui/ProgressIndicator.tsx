'use client'

import { cn } from '@/lib/utils'

interface Step {
  id: number
  title: string
  description: string
}

interface ProgressIndicatorProps {
  steps: Step[]
  currentStep: number
  progress: number
}

export function ProgressIndicator({ steps, currentStep, progress }: ProgressIndicatorProps) {
  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="relative">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-sm text-gray-600">Step {currentStep} of {steps.length}</span>
          <span className="text-sm text-gray-600">{Math.round(progress)}% Complete</span>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between items-center">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          
          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className="relative">
                <div
                  className={cn(
                    "step-indicator",
                    isActive && "active",
                    isCompleted && "completed"
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>
                
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      "absolute top-4 left-8 w-full h-0.5 -translate-y-1/2",
                      isCompleted ? "bg-clay" : "bg-gray-300"
                    )}
                    style={{ width: 'calc(100% - 2rem)' }}
                  ></div>
                )}
              </div>
              
              <div className="mt-2 text-center">
                <p className={cn(
                  "text-xs font-medium",
                  isActive ? "text-clay" : "text-gray-500"
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-400 mt-1 hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
