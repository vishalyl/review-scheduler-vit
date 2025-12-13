'use client';

import { useState } from 'react';
import { getDayStringFromDate, formatDateForInput } from '@/lib/utils';
import { IoChevronBack, IoChevronForward, IoCheckmark, IoClose } from 'react-icons/io5';
import { format, addMonths, subMonths } from 'date-fns';

interface DateSelectorFirstProps {
  onDatesSelected: (dates: Date[], duration: number) => void;
  onCancel: () => void;
  initialDuration?: number;
}

export default function DateSelectorFirst({
  onDatesSelected,
  onCancel,
  initialDuration = 10
}: DateSelectorFirstProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slotDuration, setSlotDuration] = useState(initialDuration);
  
  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Select Dates for Review Slots</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white"
        >
          <IoClose size={20} />
        </button>
      </div>
      
      <div className="mb-4">
        <p className="text-gray-400 text-sm mb-2">
          Select the specific dates when you want to publish review slots and choose your preferred slot duration.
          The system will generate slots based on your timetable and the selected duration.
        </p>
        
        {/* Slot Duration Selector */}
        <div className="mt-4 bg-gray-800 border border-gray-700 rounded-lg p-3">
          <label className="text-sm font-medium text-gray-300 mb-2 block">Slot Duration (minutes)</label>
          <div className="flex gap-2">
            {[5, 10, 15, 20, 30].map(duration => (
              <button
                key={duration}
                onClick={() => setSlotDuration(duration)}
                className={`px-3 py-2 rounded-lg text-sm ${slotDuration === duration 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
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
            <h4 className="text-sm font-medium text-gray-400 mb-2">Select Dates</h4>
            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden p-4">
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 rounded-full hover:bg-gray-700"
                >
                  <IoChevronBack size={20} className="text-gray-400" />
                </button>

                <h3 className="text-white font-medium">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>

                <button 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1 rounded-full hover:bg-gray-700"
                >
                  <IoChevronForward size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
                  <div key={index} className="text-center text-xs text-gray-400 py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const today = new Date();
                  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

                  const daysFromPrevMonth = firstDay.getDay();
                  const daysInMonth = lastDay.getDate();
                  const totalDays = daysFromPrevMonth + daysInMonth;
                  const totalCells = Math.ceil(totalDays / 7) * 7;

                  const days = [];

                  for (let i = 0; i < daysFromPrevMonth; i++) {
                    days.push(
                      <div key={`prev-${i}`} className="text-center py-2 text-gray-600 opacity-30">
                        {new Date(currentMonth.getFullYear(), currentMonth.getMonth(), -daysFromPrevMonth + i + 1).getDate()}
                      </div>
                    );
                  }

                  for (let i = 1; i <= daysInMonth; i++) {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
                    const isToday = date.toDateString() === today.toDateString();
                    const isSelected = isDateSelected(date);
                    const isPast = date < new Date(today.setHours(0, 0, 0, 0));

                    days.push(
                      <button
                        key={`current-${i}`}
                        disabled={isPast}
                        onClick={() => handleDateSelect(date)}
                        className={`
                          relative w-full h-10 rounded-full flex items-center justify-center text-sm
                          ${isPast ? 'text-gray-600 cursor-not-allowed' : 'hover:bg-gray-700'}
                          ${isToday ? 'text-indigo-400 font-medium' : ''}
                          ${isSelected ? 'bg-indigo-500 text-white hover:bg-indigo-600' : ''}
                        `}
                      >
                        {i}
                      </button>
                    );
                  }

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
            <h4 className="text-sm font-medium text-gray-400 mb-2">Selected Dates</h4>
            {selectedDates.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                <p className="text-gray-400">No dates selected yet</p>
                <p className="text-xs text-gray-500 mt-1">Select dates from the calendar</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {selectedDates
                  .sort((a, b) => a.getTime() - b.getTime())
                  .map((date, index) => (
                    <div 
                      key={index}
                      className="bg-indigo-900/30 border border-indigo-800 rounded-lg p-3 flex justify-between items-center"
                    >
                      <div>
                        <div className="text-indigo-300 font-medium">
                          {date.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Day: {getDayStringFromDate(date)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDateSelect(date)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <IoClose size={16} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={() => onDatesSelected(selectedDates, slotDuration)}
            disabled={selectedDates.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedDates.length === 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            Continue with {selectedDates.length} {selectedDates.length === 1 ? 'date' : 'dates'}
          </button>
        </div>
      </div>
    </div>
  );
}
