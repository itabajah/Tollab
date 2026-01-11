'use client';

import { useMemo, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore, useUIStore } from '@/stores';
import { DAYS_OF_WEEK_HE, Course, ScheduleItem } from '@/types';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  course: Course;
  schedule: ScheduleItem;
  top: number;
  height: number;
}

export function WeeklyCalendar() {
  const { getActiveSemester } = useDataStore();
  const { calendarSingleDayView, calendarActiveDay, setCalendarActiveDay, toggleCalendarSingleDayView } = useUIStore();

  const semester = getActiveSemester();
  const calendarSettings = semester?.calendarSettings || { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] };
  const courses = semester?.courses || [];

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Calculate hours to display
  const hours = useMemo(() => {
    const result = [];
    for (let h = calendarSettings.startHour; h < calendarSettings.endHour; h++) {
      result.push(h);
    }
    return result;
  }, [calendarSettings.startHour, calendarSettings.endHour]);

  // Get visible days
  const visibleDays = calendarSingleDayView ? [calendarActiveDay] : calendarSettings.visibleDays;

  // Calculate events for each day
  const eventsByDay = useMemo(() => {
    const result: Record<number, CalendarEvent[]> = {};

    for (const day of calendarSettings.visibleDays) {
      result[day] = [];
    }

    for (const course of courses) {
      for (const schedule of course.schedule) {
        if (!calendarSettings.visibleDays.includes(schedule.day)) continue;

        const [startH, startM] = schedule.start.split(':').map(Number);
        const [endH, endM] = schedule.end.split(':').map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        const calendarStartMinutes = calendarSettings.startHour * 60;
        const minutesPerHour = 60;
        const pixelsPerMinute = 48 / 60; // 48px per hour (h-12)

        const top = (startMinutes - calendarStartMinutes) * pixelsPerMinute;
        const height = (endMinutes - startMinutes) * pixelsPerMinute;

        result[schedule.day].push({
          course,
          schedule,
          top,
          height: Math.max(height, 24), // Minimum height
        });
      }
    }

    return result;
  }, [courses, calendarSettings]);

  // Current time indicator position
  const currentTimePosition = useMemo(() => {
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const calendarStartMinutes = calendarSettings.startHour * 60;
    const calendarEndMinutes = calendarSettings.endHour * 60;

    if (currentMinutes < calendarStartMinutes || currentMinutes > calendarEndMinutes) {
      return null;
    }

    const pixelsPerMinute = 48 / 60;
    return (currentMinutes - calendarStartMinutes) * pixelsPerMinute;
  }, [currentTime, calendarSettings]);

  const today = currentTime.getDay();

  const handlePrevDay = () => {
    const currentIndex = calendarSettings.visibleDays.indexOf(calendarActiveDay);
    if (currentIndex > 0) {
      setCalendarActiveDay(calendarSettings.visibleDays[currentIndex - 1]);
    }
  };

  const handleNextDay = () => {
    const currentIndex = calendarSettings.visibleDays.indexOf(calendarActiveDay);
    if (currentIndex < calendarSettings.visibleDays.length - 1) {
      setCalendarActiveDay(calendarSettings.visibleDays[currentIndex + 1]);
    }
  };

  if (!semester) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground" dir="rtl">
        בחר סמסטר כדי לצפות במערכת
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          מערכת שעות
        </h3>

        {/* Mobile day navigation */}
        <div className="flex items-center gap-1 md:hidden">
          <Button variant="ghost" size="icon" onClick={handlePrevDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-16 text-center">
            {DAYS_OF_WEEK_HE[calendarActiveDay]}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Days header */}
          <div className="grid border-b" style={{ gridTemplateColumns: `60px repeat(${visibleDays.length}, 1fr)` }}>
            <div className="p-2 text-center text-sm font-medium text-muted-foreground border-l"></div>
            {visibleDays.map((day) => (
              <div
                key={day}
                className={cn(
                  'p-2 text-center text-sm font-medium border-l',
                  day === today && 'bg-primary/10 text-primary'
                )}
              >
                {DAYS_OF_WEEK_HE[day]}
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="relative">
            {/* Hour rows */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="grid border-b"
                style={{ gridTemplateColumns: `60px repeat(${visibleDays.length}, 1fr)`, height: '48px' }}
              >
                <div className="p-1 text-xs text-muted-foreground text-center border-l flex items-start justify-center pt-0">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {visibleDays.map((day) => (
                  <div key={day} className="border-l relative" />
                ))}
              </div>
            ))}

            {/* Events overlay */}
            <div
              className="absolute inset-0 grid pointer-events-none"
              style={{ gridTemplateColumns: `60px repeat(${visibleDays.length}, 1fr)` }}
            >
              <div /> {/* Spacer for time column */}
              {visibleDays.map((day) => (
                <div key={day} className="relative">
                  {eventsByDay[day]?.map((event, idx) => (
                    <div
                      key={`${event.course.id}-${event.schedule.id}-${idx}`}
                      className={cn(
                        'absolute inset-x-1 rounded-md p-1 text-xs overflow-hidden pointer-events-auto cursor-pointer',
                        'hover:ring-2 hover:ring-primary transition-shadow'
                      )}
                      style={{
                        top: `${event.top}px`,
                        height: `${event.height}px`,
                        backgroundColor: event.course.color || 'hsl(var(--primary))',
                      }}
                      title={`${event.course.name}\n${event.schedule.start} - ${event.schedule.end}`}
                    >
                      <div className="font-medium truncate text-gray-900">
                        {event.course.name}
                      </div>
                      {event.height > 30 && (
                        <div className="text-gray-700 truncate">
                          {event.schedule.start} - {event.schedule.end}
                        </div>
                      )}
                      {event.height > 50 && event.schedule.location && (
                        <div className="text-gray-600 truncate">
                          {event.schedule.location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Current time indicator */}
            {currentTimePosition !== null && visibleDays.includes(today) && (
              <div
                className="absolute left-0 right-0 pointer-events-none"
                style={{ top: `${currentTimePosition}px` }}
              >
                <div className="relative h-0.5 bg-red-500">
                  <div className="absolute right-14 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
