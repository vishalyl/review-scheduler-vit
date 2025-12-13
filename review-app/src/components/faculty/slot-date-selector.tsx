'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { getDayStringFromDate, formatDateForInput } from '@/lib/utils';
import { motion } from 'framer-motion';
import { IoCheckmark, IoClose, IoCalendar } from 'react-icons/io5';

interface SlotDateSelectorProps {
  selectedSlots: any[];
  onDateAssign: (slotIndex: number, date: Date) => void;
  onAllDatesAssigned: () => void;
  onCancel: () => void;
}

export default function SlotDateSelector({
  selectedSlots,
  onDateAssign,
  onAllDatesAssigned,
  onCancel
}: SlotDateSelectorProps) {
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [assignedDates, setAssignedDates] = useState<(Date | null)[]>(
    Array(selectedSlots.length).fill(null)
  );

  // Get the current slot being processed
  const currentSlot = selectedSlots[currentSlotIndex];

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    // Update the assigned dates
    const newAssignedDates = [...assignedDates];
    newAssignedDates[currentSlotIndex] = date;
    setAssignedDates(newAssignedDates);

    // Call the callback
    onDateAssign(currentSlotIndex, date);

    // Move to the next slot or finish if all slots have dates
    if (currentSlotIndex < selectedSlots.length - 1) {
      setCurrentSlotIndex(currentSlotIndex + 1);
    } else {
      // All slots have dates assigned
      onAllDatesAssigned();
    }
  };

  // Function to get suggested dates based on the day of the week
  const getSuggestedDates = () => {
    if (!currentSlot) return [];

    const day = currentSlot.day;
    const dates: Date[] = [];
    const today = new Date();

    // Add the next 4 occurrences of the specified day
    for (let i = 0; i < 28; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      if (getDayStringFromDate(date) === day) {
        dates.push(date);
        if (dates.length >= 4) break;
      }
    }

    return dates;
  };

  // Get suggested dates for the current slot
  const suggestedDates = getSuggestedDates();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-gray-900 border border-gray-800 rounded-xl p-6"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Select Dates for Slots</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white"
        >
          <IoClose size={20} />
        </button>
      </div>

      <div className="mb-4">
        <p className="text-gray-400 text-sm mb-2">
          Assign a specific date to each selected time slot. This helps students know exactly when the review will take place.
        </p>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-white">
            <span className="font-bold">Current Slot:</span> {currentSlotIndex + 1} of {selectedSlots.length}
          </p>
          {currentSlot && (
            <p className="text-sm text-indigo-300 mt-1">
              {currentSlot.day}, {currentSlot.start} - {currentSlot.end}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Select a Date</h4>
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <Calendar
              mode="single"
              selected={assignedDates[currentSlotIndex] || undefined}
              onSelect={handleDateSelect}
              disabled={{ before: new Date() }}
              className="bg-gray-800"
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Suggested Dates</h4>
          <div className="space-y-2">
            {suggestedDates.map((date, index) => (
              <button
                key={index}
                onClick={() => handleDateSelect(date)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-left hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <IoCalendar size={16} className="text-indigo-400 mr-2" />
                  <span className="text-sm">
                    {date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex justify-between">
              <button
                onClick={() => {
                  if (currentSlotIndex > 0) {
                    setCurrentSlotIndex(currentSlotIndex - 1);
                  }
                }}
                disabled={currentSlotIndex === 0}
                className={`px-3 py-1 rounded-md text-sm ${currentSlotIndex === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
              >
                Previous
              </button>

              <button
                onClick={() => {
                  if (currentSlotIndex < selectedSlots.length - 1) {
                    setCurrentSlotIndex(currentSlotIndex + 1);
                  } else if (!assignedDates.includes(null)) {
                    onAllDatesAssigned();
                  }
                }}
                className="bg-indigo-600 text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-700"
              >
                {currentSlotIndex < selectedSlots.length - 1 ? 'Skip' : 'Finish'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Assigned Dates</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {selectedSlots.map((slot, index) => (
            <div
              key={index}
              className={`p-2 border rounded-lg text-sm ${assignedDates[index]
                ? 'bg-green-900/20 border-green-800 text-green-300'
                : 'bg-gray-800 border-gray-700 text-gray-400'
                }`}
            >
              <div className="flex items-center gap-2">
                {assignedDates[index] ? (
                  <IoCheckmark size={14} className="text-green-400" />
                ) : (
                  <span className="w-3 h-3 rounded-full bg-gray-600"></span>
                )}
                <span>
                  {slot.day}, {slot.start} - {slot.end}
                </span>
              </div>
              {assignedDates[index] && (
                <div className="mt-1 text-xs text-green-400 pl-5">
                  {assignedDates[index]?.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
