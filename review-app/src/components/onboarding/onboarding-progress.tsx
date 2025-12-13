'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IoCheckmarkCircle, IoAlertCircle } from 'react-icons/io5';

interface OnboardingProgressProps {
  steps: {
    id: string;
    label: string;
    completed: boolean;
  }[];
  currentStep: number;
}

export default function OnboardingProgress({ steps, currentStep }: OnboardingProgressProps) {
  const [progressPercentage, setProgressPercentage] = useState(0);
  
  useEffect(() => {
    // Calculate progress percentage based on completed steps
    const completedSteps = steps.filter(step => step.completed).length;
    const percentage = (completedSteps / steps.length) * 100;
    
    // Animate progress change
    const timer = setTimeout(() => {
      setProgressPercentage(percentage);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [steps]);

  return (
    <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Setup Progress</h3>
        <span className="text-xs text-[#a0a0a0]">{Math.round(progressPercentage)}% Complete</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-[#252525] rounded-full overflow-hidden mb-4">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
        />
      </div>
      
      {/* Steps list */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={`flex items-center gap-3 ${
              currentStep === index ? 'bg-[#1a1a1a] p-2 rounded-lg -mx-2' : ''
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              step.completed 
                ? 'bg-blue-500' 
                : currentStep === index 
                  ? 'bg-[#252525]' 
                  : 'bg-[#1e1e1e]'
            }`}>
              {step.completed ? (
                <IoCheckmarkCircle size={12} className="text-white" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#a0a0a0]"></span>
              )}
            </div>
            <span className={`text-xs ${
              step.completed 
                ? 'text-white font-medium' 
                : currentStep === index 
                  ? 'text-[#e0e0e0]' 
                  : 'text-[#a0a0a0]'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
