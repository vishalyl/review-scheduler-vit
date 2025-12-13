'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useOnboarding } from './onboarding-context';
import WelcomeScreen from './welcome-screen';
import OnboardingProgress from './onboarding-progress';
import JoinClassroomStep from './join-classroom-step';
import JoinTeamStep from './join-team-step';
import ScheduleReviewStep from './schedule-review-step';
import { IoCheckmarkCircle, IoChevronForward } from 'react-icons/io5';

export default function OnboardingController() {
  const [user, setUser] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const supabase = createClientComponentClient();
  
  const {
    hasJoinedClassroom,
    hasJoinedTeam,
    hasScheduledReview,
    isOnboardingComplete,
    showWelcomeScreen,
    markClassroomJoined,
    markTeamJoined,
    markReviewScheduled,
    completeOnboarding,
    dismissWelcomeScreen
  } = useOnboarding();
  
  // Get current user data
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user profile data
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setUser(data || { name: user.email?.split('@')[0] });
      }
    };
    
    getUser();
  }, []);
  
  // Define onboarding steps
  const steps = [
    {
      id: 'join-classroom',
      label: 'Join a Classroom',
      completed: hasJoinedClassroom
    },
    {
      id: 'join-team',
      label: 'Create or Join a Team',
      completed: hasJoinedTeam
    },
    {
      id: 'schedule-review',
      label: 'Schedule a Review',
      completed: hasScheduledReview
    }
  ];
  
  // Determine which step to show based on completion status
  useEffect(() => {
    if (hasJoinedClassroom && !hasJoinedTeam) {
      setCurrentStep(1);
    } else if (hasJoinedClassroom && hasJoinedTeam && !hasScheduledReview) {
      setCurrentStep(2);
    }
  }, [hasJoinedClassroom, hasJoinedTeam, hasScheduledReview]);
  
  // Handle step completion
  const handleClassroomJoined = (classroomId: number) => {
    markClassroomJoined();
    setCurrentStep(1);
    showStepCompletionCelebration();
  };
  
  const handleTeamJoined = () => {
    markTeamJoined();
    setCurrentStep(2);
    showStepCompletionCelebration();
  };
  
  const handleReviewScheduled = () => {
    markReviewScheduled();
    completeOnboarding();
    showStepCompletionCelebration();
  };
  
  // Open specific step modal
  const [showStepModal, setShowStepModal] = useState(false);
  
  const openCurrentStepModal = () => {
    setShowStepModal(true);
  };
  
  const showStepCompletionCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
    }, 2000);
  };
  
  // Skip current step
  const handleSkipStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };
  
  // Handle welcome screen completion
  const handleWelcomeComplete = () => {
    dismissWelcomeScreen();
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <>
      {/* Welcome screen for first-time users */}
      {showWelcomeScreen && (
        <WelcomeScreen 
          userName={user.name || 'Student'} 
          onComplete={handleWelcomeComplete}
          onSkip={() => {
            dismissWelcomeScreen();
            completeOnboarding();
          }}
        />
      )}
      
      {/* Onboarding progress tracker (only show if not complete) */}
      {!isOnboardingComplete && !showWelcomeScreen && (
        <div className="fixed bottom-6 right-6 z-40">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#141414] border border-[#1e1e1e] rounded-lg shadow-xl w-64"
          >
            <div className="p-4 border-b border-[#1e1e1e]">
              <h3 className="text-sm font-medium">Setup your account</h3>
              <p className="text-xs text-[#a0a0a0] mt-1">Complete these steps to get started</p>
            </div>
            
            <div className="p-4">
              <div className="space-y-3 mb-4">
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
              
              <button
                onClick={openCurrentStepModal}
                className="w-full py-2 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-1"
              >
                Continue Setup
                <IoChevronForward size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Step completion celebration */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ 
                scale: [0.8, 1.1, 1],
                transition: { duration: 0.5, times: [0, 0.6, 1] }
              }}
              className="bg-[#141414] border border-[#1e1e1e] rounded-full p-8 flex items-center justify-center"
            >
              <IoCheckmarkCircle size={48} className="text-green-500" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Current step modal (only show if not in welcome screen and not complete) */}
      <AnimatePresence>
        {!showWelcomeScreen && !isOnboardingComplete && showStepModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowStepModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              {currentStep === 0 && (
                <JoinClassroomStep
                  onSuccess={handleClassroomJoined}
                  onSkip={handleSkipStep}
                />
              )}
              
              {currentStep === 1 && (
                <JoinTeamStep
                  onComplete={handleTeamJoined}
                  onSkip={handleSkipStep}
                />
              )}
              
              {currentStep === 2 && (
                <ScheduleReviewStep
                  onComplete={handleReviewScheduled}
                  onSkip={handleSkipStep}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
