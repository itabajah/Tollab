'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, isToday, isTomorrow, differenceInDays, differenceInHours } from 'date-fns';
import { he } from 'date-fns/locale';
import { useDataStore } from '@/stores';
import { Course, Homework, ScheduleItem, DAYS_OF_WEEK_HE } from '@/types';
import { cn } from '@/lib/utils';

interface TickerMessage {
  text: string;
  priority: number;
}

// Get current hour for time-based messages
const getHour = () => new Date().getHours();

// Time-based greeting messages
const getGreetingMessage = (): TickerMessage | null => {
  const hour = getHour();

  if (hour >= 5 && hour < 12) {
    return { text: 'בוקר טוב! יום פרודוקטיבי מתחיל 🌅', priority: 1 };
  }
  if (hour >= 12 && hour < 17) {
    return { text: 'צהריים טובים! המשך יום מוצלח 🌤️', priority: 1 };
  }
  if (hour >= 17 && hour < 21) {
    return { text: 'ערב טוב! זמן מצוין ללמידה 🌆', priority: 1 };
  }
  if (hour >= 21 || hour < 5) {
    return { text: 'לילה טוב! אל תשכח לנוח 🌙', priority: 1 };
  }

  return null;
};

// Get upcoming class message
const getUpcomingClassMessage = (
  courses: Course[],
  now: Date
): TickerMessage | null => {
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  // Find next class today
  let nextClass: { course: Course; schedule: ScheduleItem } | null = null;
  let minMinutesUntil = Infinity;

  for (const course of courses) {
    for (const schedule of course.schedule) {
      if (schedule.day === currentDay) {
        const [startH, startM] = schedule.start.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const minutesUntil = startMinutes - currentTime;

        if (minutesUntil > 0 && minutesUntil < minMinutesUntil) {
          minMinutesUntil = minutesUntil;
          nextClass = { course, schedule };
        }
      }
    }
  }

  if (nextClass && minMinutesUntil <= 120) {
    const hours = Math.floor(minMinutesUntil / 60);
    const minutes = minMinutesUntil % 60;
    const timeStr = hours > 0 ? `${hours} שעות ו-${minutes} דקות` : `${minutes} דקות`;

    return {
      text: `🎓 ${nextClass.course.name} מתחיל בעוד ${timeStr}`,
      priority: 8,
    };
  }

  return null;
};

// Get homework reminder messages
const getHomeworkMessages = (
  homeworkList: { homework: Homework; course: Course }[]
): TickerMessage[] => {
  const messages: TickerMessage[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const { homework, course } of homeworkList) {
    if (homework.completed) continue;

    const dueDate = new Date(homework.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const daysUntil = differenceInDays(dueDate, now);

    if (daysUntil < 0) {
      messages.push({
        text: `⚠️ מטלה באיחור: ${homework.title} (${course.name})`,
        priority: 10,
      });
    } else if (daysUntil === 0) {
      messages.push({
        text: `🔔 היום: ${homework.title} (${course.name})`,
        priority: 9,
      });
    } else if (daysUntil === 1) {
      messages.push({
        text: `📅 מחר: ${homework.title} (${course.name})`,
        priority: 7,
      });
    } else if (daysUntil <= 3) {
      messages.push({
        text: `📋 בעוד ${daysUntil} ימים: ${homework.title} (${course.name})`,
        priority: 5,
      });
    }
  }

  return messages;
};

// Get exam reminder messages
const getExamMessages = (courses: Course[]): TickerMessage[] => {
  const messages: TickerMessage[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const course of courses) {
    if (course.exams.moedA) {
      const examDate = new Date(course.exams.moedA);
      examDate.setHours(0, 0, 0, 0);
      const daysUntil = differenceInDays(examDate, now);

      if (daysUntil >= 0 && daysUntil <= 14) {
        messages.push({
          text: `📚 מועד א׳ ב${course.name} בעוד ${daysUntil} ימים`,
          priority: daysUntil <= 3 ? 9 : 4,
        });
      }
    }

    if (course.exams.moedB) {
      const examDate = new Date(course.exams.moedB);
      examDate.setHours(0, 0, 0, 0);
      const daysUntil = differenceInDays(examDate, now);

      if (daysUntil >= 0 && daysUntil <= 14) {
        messages.push({
          text: `📚 מועד ב׳ ב${course.name} בעוד ${daysUntil} ימים`,
          priority: daysUntil <= 3 ? 9 : 4,
        });
      }
    }
  }

  return messages;
};

// Get progress messages
const getProgressMessages = (courses: Course[]): TickerMessage[] => {
  const messages: TickerMessage[] = [];

  for (const course of courses) {
    let totalRecordings = 0;
    let watchedRecordings = 0;

    for (const tab of course.recordings.tabs) {
      totalRecordings += tab.items.length;
      watchedRecordings += tab.items.filter((r) => r.watched).length;
    }

    if (totalRecordings > 0) {
      const progress = Math.round((watchedRecordings / totalRecordings) * 100);

      if (progress === 100) {
        messages.push({
          text: `🎉 סיימת את כל ההקלטות ב${course.name}!`,
          priority: 3,
        });
      } else if (progress >= 75) {
        messages.push({
          text: `💪 ${progress}% ב${course.name} - כמעט שם!`,
          priority: 2,
        });
      }
    }
  }

  return messages;
};

// Motivational quotes
const motivationalQuotes: string[] = [
  '💡 "ההצלחה היא סכום של מאמצים קטנים, שחוזרים על עצמם יום אחר יום"',
  '🚀 "הדרך להצלחה מתחילה בצעד הראשון"',
  '⭐ "אל תפחד להיכשל, פחד לא לנסות"',
  '🎯 "המטרה שלך היא לא להיות הכי טוב, אלא להיות טוב יותר ממה שהיית אתמול"',
  '📖 "למידה היא אוצר שילווה אותך לכל מקום"',
  '🌟 "התמדה מנצחת כישרון כשכישרון לא מתמיד"',
  '💪 "אתה יכול יותר ממה שאתה חושב"',
  '🎓 "כל שעת לימוד היום היא השקעה בעתיד שלך"',
];

export function HeaderTicker() {
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { getActiveSemester, getAllHomework } = useDataStore();

  const generateMessages = useCallback(() => {
    const semester = getActiveSemester();
    const homeworkList = getAllHomework();
    const courses = semester?.courses || [];
    const allMessages: TickerMessage[] = [];

    // Add greeting
    const greeting = getGreetingMessage();
    if (greeting) allMessages.push(greeting);

    // Add upcoming class
    const upcomingClass = getUpcomingClassMessage(courses, new Date());
    if (upcomingClass) allMessages.push(upcomingClass);

    // Add homework messages
    allMessages.push(...getHomeworkMessages(homeworkList));

    // Add exam messages
    allMessages.push(...getExamMessages(courses));

    // Add progress messages
    allMessages.push(...getProgressMessages(courses));

    // Add a random motivational quote if we have few messages
    if (allMessages.length < 3) {
      const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
      allMessages.push({ text: randomQuote, priority: 0 });
    }

    // Sort by priority (higher first) and take top messages
    allMessages.sort((a, b) => b.priority - a.priority);

    return allMessages.slice(0, 10);
  }, [getActiveSemester, getAllHomework]);

  // Generate messages on mount and periodically
  useEffect(() => {
    setMessages(generateMessages());

    const interval = setInterval(() => {
      setMessages(generateMessages());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [generateMessages]);

  // Rotate through messages
  useEffect(() => {
    if (messages.length <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setIsTransitioning(false);
      }, 300);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [messages.length]);

  if (messages.length === 0) {
    return null;
  }

  const currentMessage = messages[currentIndex] || messages[0];

  return (
    <div className="relative h-8 overflow-hidden bg-muted/50 rounded-lg px-4 py-1" dir="rtl">
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center text-sm text-muted-foreground transition-opacity duration-300',
          isTransitioning ? 'opacity-0' : 'opacity-100'
        )}
      >
        {currentMessage?.text}
      </div>

      {/* Dots indicator */}
      {messages.length > 1 && (
        <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 flex gap-1">
          {messages.slice(0, 5).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1 h-1 rounded-full transition-colors',
                i === currentIndex % 5 ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
