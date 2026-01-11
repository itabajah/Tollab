'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Search, Plus, Loader2, BookOpen, Clock, MapPin, GraduationCap } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCourseCatalog } from '@/hooks/use-cheesefork';
import { isRTL } from '@/i18n/routing';
import type { CheeseforkCourse, CheeseforkScheduleItem } from '@/lib/cheesefork';

interface CourseSearchProps {
  semesterCode: string | null;
  onAddCourse: (course: CheeseforkCourse) => void;
  existingCourseNumbers?: string[];
  className?: string;
}

export function CourseSearch({
  semesterCode,
  onAddCourse,
  existingCourseNumbers = [],
  className,
}: CourseSearchProps) {
  const t = useTranslations();
  const locale = useLocale();
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const {
    searchCourses,
    searchResults,
    searching,
    coursesLoading,
    totalCourses,
  } = useCourseCatalog(semesterCode);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      searchCourses(value);
    },
    [searchCourses]
  );

  const handleSelectCourse = useCallback(
    (course: CheeseforkCourse) => {
      onAddCourse(course);
      setInputValue('');
      searchCourses('');
      setOpen(false);
    },
    [onAddCourse, searchCourses]
  );

  const formatScheduleTime = (item: CheeseforkScheduleItem): string => {
    const days = t.raw('days') as Record<string, string>;
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dayKeys[item.day]] || '';
    return `${dayName} ${item.startTime}-${item.endTime}`;
  };

  const formatType = (item: CheeseforkScheduleItem): string => {
    if (locale === 'he') return item.typeHe;
    const typeMap: Record<string, string> = {
      lecture: t('course.lecture'),
      tutorial: t('course.tutorial'),
      lab: t('course.lab'),
      other: t('course.other'),
    };
    return typeMap[item.type] || item.type;
  };

  const isAlreadyAdded = (courseNumber: string) => {
    return existingCourseNumbers.includes(courseNumber);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between', className)}
          disabled={!semesterCode || coursesLoading}
        >
          <Search className={cn('h-4 w-4', dir === 'rtl' ? 'ml-2' : 'mr-2')} />
          {coursesLoading ? (
            <span className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading')}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t('course.searchPlaceholder')}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-[400px] p-0" 
        align={dir === 'rtl' ? 'end' : 'start'}
        dir={dir}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('course.searchPlaceholder')}
            value={inputValue}
            onValueChange={handleInputChange}
            dir={dir}
          />
          <CommandList>
            {searching && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}

            {!searching && inputValue && searchResults.length === 0 && (
              <CommandEmpty>{t('course.noResults')}</CommandEmpty>
            )}

            {!searching && inputValue && searchResults.length > 0 && (
              <CommandGroup
                heading={`${searchResults.length} ${t('course.coursesFound')} (${totalCourses} ${t('course.total')})`}
              >
                {searchResults.map((course) => {
                  const added = isAlreadyAdded(course.courseNumber);

                  return (
                    <CommandItem
                      key={course.courseNumber}
                      value={course.courseNumber}
                      onSelect={() => !added && handleSelectCourse(course)}
                      disabled={added}
                      className={cn(
                        'flex flex-col items-start gap-1 py-3',
                        added && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{course.courseNumber}</span>
                          <span className="text-muted-foreground">•</span>
                          <span>{course.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {course.points} {t('course.points')}
                          </Badge>
                          {added ? (
                            <Badge variant="outline" className="text-xs">
                              {t('course.added')}
                            </Badge>
                          ) : (
                            <Plus className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>

                      {/* Faculty */}
                      {course.faculty && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <GraduationCap className="h-3 w-3" />
                          <span>{course.faculty}</span>
                        </div>
                      )}

                      {/* Schedule preview */}
                      {course.schedule.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {course.schedule.slice(0, 3).map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded"
                            >
                              <Clock className="h-3 w-3" />
                              {formatScheduleTime(item)}
                              <span className="text-muted-foreground">
                                ({formatType(item)})
                              </span>
                              {item.location && (
                                <>
                                  <MapPin className="h-3 w-3" />
                                  {item.location}
                                </>
                              )}
                            </span>
                          ))}
                          {course.schedule.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{course.schedule.length - 3} {t('common.more')}
                            </span>
                          )}
                        </div>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {!searching && !inputValue && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('course.startTyping')}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
