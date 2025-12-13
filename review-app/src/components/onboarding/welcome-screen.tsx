'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoChevronForward, IoCheckmarkCircle, IoPeople, IoAlertCircle, IoCalendar } from 'react-icons/io5';
import { useRouter } from 'next/navigation';

interface WelcomeScreenProps {
  userName: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function WelcomeScreen({ userName, onComplete, onSkip }: WelcomeScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const router = useRouter();
  
  // Steps in the onboarding process
  const steps = [
    {
      title: "Join a Classroom",
      description: "Connect with your faculty by joining their classroom",
      icon: <IoPeople className="w-8 h-8 text-blue-500" />,
      action: "Join Classroom",
      step: 0 // Corresponds to the first onboarding step
    },
    {
      title: "Create or Join a Team",
      description: "Collaborate with classmates by creating or joining a team",
      icon: <IoAlertCircle className="w-8 h-8 text-purple-500" />,
      action: "Team Up",
      step: 1 // Corresponds to the second onboarding step
    },
    {
      title: "Schedule Reviews",
      description: "Book slots for your project reviews and presentations",
      icon: <IoCalendar className="w-8 h-8 text-green-500" />,
      action: "Schedule",
      step: 2 // Corresponds to the third onboarding step
    }
  ];

  const handleGetStarted = () => {
    setShowWelcome(false);
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  // Complete the welcome screen and move to the onboarding steps
  const handleActionClick = (step: number) => {
    // Just dismiss the welcome screen and let the onboarding controller handle the steps
    onComplete();
  };

  return (
    <AnimatePresence mode="wait">
      {showWelcome ? (
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { delay: 0.2 } }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-lg p-8 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#252525] shadow-2xl"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { delay: 0.4 } }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, transition: { delay: 0.6, type: "spring", stiffness: 200 } }}
                >
                  <IoCalendar className="w-8 h-8 text-white" />
                </motion.div>
              </div>
              
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { delay: 0.7 } }}
                className="text-2xl font-bold mb-2"
              >
                Welcome to Review Scheduler, {userName}!
              </motion.h2>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { delay: 0.8 } }}
                className="text-[#a0a0a0] mb-8 max-w-md"
              >
                Streamline your project reviews and collaborate seamlessly with your team and faculty
              </motion.p>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { delay: 0.9 } }}
                className="flex gap-4"
              >
                <button
                  onClick={handleGetStarted}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2"
                >
                  Get Started
                  <IoChevronForward size={16} />
                </button>
                
                <button
                  onClick={onSkip}
                  className="px-6 py-3 rounded-lg bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#252525] transition-colors duration-200"
                >
                  Skip
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl p-8 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#252525] shadow-2xl"
          >
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-[#a0a0a0]">Setup Progress</span>
                <span className="text-sm font-medium">{currentStep + 1}/{steps.length}</span>
              </div>
              <div className="h-2 bg-[#252525] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: `${(currentStep / steps.length) * 100}%` }}
                  animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                />
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={`step-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col md:flex-row gap-8 items-center"
              >
                <div className="w-24 h-24 rounded-2xl bg-[#141414] border border-[#252525] flex items-center justify-center flex-shrink-0">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, transition: { delay: 0.2 } }}
                  >
                    {steps[currentStep].icon}
                  </motion.div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{steps[currentStep].title}</h3>
                  <p className="text-[#a0a0a0] mb-6">{steps[currentStep].description}</p>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleActionClick(steps[currentStep].step)}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2"
                    >
                      {steps[currentStep].action}
                      <IoChevronForward size={16} />
                    </button>
                    
                    <button
                      onClick={handleNextStep}
                      className="px-6 py-3 rounded-lg bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#252525] transition-colors duration-200"
                    >
                      {currentStep < steps.length - 1 ? "Skip this step" : "Finish"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            
            {/* Step indicators */}
            <div className="flex justify-center gap-2 mt-8">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    currentStep === index ? "w-8 bg-blue-500" : "bg-[#252525]"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
