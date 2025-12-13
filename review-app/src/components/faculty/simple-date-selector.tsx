'use client';

import { useState } from 'react';
import { getDayStringFromDate } from '@/lib/utils';
import { IoChevronBack, IoChevronForward, IoClose } from 'react-icons/io5';
import { format, addMonths, subMonths } from 'date-fns';

interface SimpleDateSelectorProps {
  onDatesSelected: (dates: Date[], duration: number) => void;
  onCancel: () => void;
  initialDuration?: number;
}

export default function SimpleDateSelector({
  onDatesSelected,
  onCancel,
  initialDuration = 10
}: SimpleDateSelectorProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [slotDuration, setSlotDuration] = useState(initialDuration);
  
  // Handle date selection
  const handleDateSelect = (date: Date) => {
    // Check if date is already selected
    const isSelected = selectedDates.some(d => 
      d.getFullYear() === date.getFullYear() && 
      d.getMonth() === date.getMonth() && 
      d.getDate() === date.getDate()
    );
    
    if (isSelected) {
      // Remove the date if already selected
      setSelectedDates(selectedDates.filter(d => 
        !(d.getFullYear() === date.getFullYear() && 
          d.getMonth() === date.getMonth() && 
          d.getDate() === date.getDate())
      ));
    } else {
      // Add the date if not selected
      setSelectedDates([...selectedDates, date]);
    }
  };
  
  // Function to check if a date is selected
  const isDateSelected = (date: Date): boolean => {
    return selectedDates.some(d => 
      d.getFullYear() === date.getFullYear() && 
      d.getMonth() === date.getMonth() && 
      d.getDate() === date.getDate()
    );
  };
  
  return (
    <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Select Dates for Review Slots</h3>
        <button
          onClick={onCancel}
          className="text-[#a0a0a0] hover:text-white transition-colors"
        >
          <IoClose size={18} />
        </button>
      </div>
      
      <div className="mb-4">
        <p className="text-[#a0a0a0] text-sm mb-4">
          Select the specific dates when you want to publish review slots and choose your preferred slot duration.
        </p>
        
        {/* Slot Duration Selector */}
        <div className="mt-4 bg-[#141414] border border-[#1e1e1e] rounded-lg p-4">
          <label className="text-sm font-medium text-[#a0a0a0] mb-3 block">Slot Duration (minutes)</label>
          <div className="flex gap-2">
            {[5, 10, 15, 20, 30].map(duration => (
              <button
                key={duration}
                onClick={() => setSlotDuration(duration)}
                className={`px-3 py-2 rounded-lg text-sm ${slotDuration === duration 
                  ? 'bg-[#5c46f5] text-white' 
                  : 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#252525] transition-colors'}`}
              >
                {duration}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-[#a0a0a0] mb-2">Select Dates</h4>
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden p-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 rounded-full hover:bg-[#252525] transition-colors"
                >
                  <IoChevronBack size={18} className="text-[#a0a0a0]" />
                </button>
                
                <h3 className="text-white font-medium">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                
                <button 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1 rounded-full hover:bg-[#252525] transition-colors"
                >
                  <IoChevronForward size={18} className="text-[#a0a0a0]" />
                </button>
              </div>
              
              {/* Calendar Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
                  <div key={index} className="text-center text-xs text-[#a0a0a0] py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const today = new Date();
                  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                  
                  // Calculate days from previous month to fill the first row
                  const daysFromPrevMonth = firstDay.getDay();
                  
                  // Calculate total days in the current month
                  const daysInMonth = lastDay.getDate();
                  
                  // Calculate total days to display
                  const totalDays = daysFromPrevMonth + daysInMonth;
                  const totalCells = Math.ceil(totalDays / 7) * 7;
                  
                  const days = [];
                  
                  // Previous month days
                  for (let i = 0; i < daysFromPrevMonth; i++) {
                    days.push(
                      <div key={`prev-${i}`} className="text-center py-2 text-gray-600 opacity-30">
                        {new Date(currentMonth.getFullYear(), currentMonth.getMonth(), -daysFromPrevMonth + i + 1).getDate()}
                      </div>
                    );
                  }
                  
                  // Current month days
                  for (let i = 1; i <= daysInMonth; i++) {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
                    const isToday = date.toDateString() === today.toDateString();
                    const isSelected = isDateSelected(date);
                    
                    days.push(
                      <button
                        key={`current-${i}`}
                        onClick={() => handleDateSelect(date)}
                        disabled={date < today}
                        className={`
                          w-full text-center py-2 rounded-lg transition-colors
                          ${isSelected ? 'bg-[#5c46f5] text-white' : ''}
                          ${isToday && !isSelected ? 'border border-[#5c46f5] text-[#a0a0a0]' : ''}
                          ${!isSelected && !isToday ? 'hover:bg-[#252525] text-white' : ''}
                          ${date < today ? 'opacity-30 cursor-not-allowed text-[#505050]' : 'cursor-pointer'}
                        `}
                      >
                        {i}
                      </button>
                    );
                  }
                  
                  // Next month days
                  const remainingCells = totalCells - days.length;
                  for (let i = 1; i <= remainingCells; i++) {
                    days.push(
                      <div key={`next-${i}`} className="text-center py-2 text-gray-600 opacity-30">
                        {i}
                      </div>
                    );
                  }
                  
                  return days;
                })()}
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-[#a0a0a0] mb-2">Selected Dates</h4>
            {selectedDates.length === 0 ? (
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-4 text-center">
                <p className="text-[#505050] text-sm">No dates selected yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {selectedDates
                  .sort((a, b) => a.getTime() - b.getTime())
                  .map((date, index) => (
                    <div 
                      key={index}
                      className="bg-[#1a1a1a] border border-[#252525] rounded-lg p-3 flex justify-between items-center"
                    >
                      <div>
                        <div className="text-white font-medium">
                          {date.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-[#a0a0a0] mt-1">
                          Day: {getDayStringFromDate(date)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDateSelect(date)}
                        className="text-[#f87171] hover:text-[#ef4444] transition-colors"
                      >
                        <IoClose size={16} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-[#1e1e1e] flex justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg text-sm hover:bg-[#252525] transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={() => onDatesSelected(selectedDates, slotDuration)}
            disabled={selectedDates.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedDates.length === 0
                ? 'bg-[#1a1a1a] text-[#505050] cursor-not-allowed'
                : 'bg-[#5c46f5] text-white hover:bg-[#4c38e6] transition-colors'
            }`}
          >
            Continue with {selectedDates.length} {selectedDates.length === 1 ? 'date' : 'dates'}
          </button>
        </div>
      </div>
    </div>
  );
}
