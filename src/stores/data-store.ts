import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import {
  AppData,
  Semester,
  Course,
  Homework,
  Recording,
  RecordingTab,
  ScheduleItem,
  Settings,
  DEFAULT_SETTINGS,
  DEFAULT_CALENDAR_SETTINGS,
  STORAGE_KEYS,
  NewCourse,
  NewHomework,
  NewRecording,
} from '@/types';

// Helper to generate course colors using golden angle
const generateCourseColor = (index: number, totalCourses: number, colorTheme: string, baseHue: number): string => {
  if (colorTheme === 'mono') {
    const lightness = 85 - (index * 15) % 30;
    return `hsl(0, 0%, ${lightness}%)`;
  }

  if (colorTheme === 'single') {
    const lightness = 85 - (index * 10) % 25;
    const saturation = 60 + (index * 5) % 20;
    return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
  }

  // Colorful: golden angle distribution
  const goldenAngle = 137.508;
  const hue = (index * goldenAngle) % 360;
  return `hsl(${hue}, 70%, 85%)`;
};

// Create default app data
const createDefaultAppData = (): AppData => ({
  semesters: [],
  settings: DEFAULT_SETTINGS,
  lastModified: new Date().toISOString(),
});

interface DataState {
  // Data
  data: AppData;
  activeSemesterId: string | null;

  // Computed getters
  getActiveSemester: () => Semester | null;
  getCourse: (courseId: string) => Course | null;
  getAllHomework: () => { homework: Homework; course: Course }[];
  getUpcomingHomework: () => { homework: Homework; course: Course }[];
  getOverdueHomework: () => { homework: Homework; course: Course }[];

  // Semester actions
  addSemester: (name: string, code?: string) => string;
  updateSemester: (id: string, updates: Partial<Semester>) => void;
  deleteSemester: (id: string) => void;
  setActiveSemester: (id: string | null) => void;

  // Course actions
  addCourse: (semesterId: string, course: NewCourse) => string;
  updateCourse: (courseId: string, updates: Partial<Course>) => void;
  deleteCourse: (courseId: string) => void;
  reorderCourses: (semesterId: string, courseIds: string[]) => void;

  // Homework actions
  addHomework: (courseId: string, homework: NewHomework) => string;
  updateHomework: (courseId: string, homeworkId: string, updates: Partial<Homework>) => void;
  deleteHomework: (courseId: string, homeworkId: string) => void;
  toggleHomeworkComplete: (courseId: string, homeworkId: string) => void;

  // Recording actions
  addRecordingTab: (courseId: string, name: string) => string;
  updateRecordingTab: (courseId: string, tabId: string, name: string) => void;
  deleteRecordingTab: (courseId: string, tabId: string) => void;
  addRecording: (courseId: string, tabId: string, recording: NewRecording) => string;
  updateRecording: (courseId: string, tabId: string, recordingId: string, updates: Partial<Recording>) => void;
  deleteRecording: (courseId: string, tabId: string, recordingId: string) => void;
  toggleRecordingWatched: (courseId: string, tabId: string, recordingId: string) => void;
  importRecordings: (courseId: string, tabId: string, recordings: NewRecording[]) => void;

  // Schedule actions
  addScheduleItem: (courseId: string, item: Omit<ScheduleItem, 'id'>) => string;
  updateScheduleItem: (courseId: string, itemId: string, updates: Partial<ScheduleItem>) => void;
  deleteScheduleItem: (courseId: string, itemId: string) => void;

  // Settings actions
  updateSettings: (updates: Partial<Settings>) => void;

  // Data actions
  setData: (data: AppData) => void;
  resetData: () => void;
  importData: (data: Partial<AppData>) => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      data: createDefaultAppData(),
      activeSemesterId: null,

      // Computed getters
      getActiveSemester: () => {
        const { data, activeSemesterId } = get();
        if (!activeSemesterId) return data.semesters[0] || null;
        return data.semesters.find((s) => s.id === activeSemesterId) || null;
      },

      getCourse: (courseId: string) => {
        const { data } = get();
        for (const semester of data.semesters) {
          const course = semester.courses.find((c) => c.id === courseId);
          if (course) return course;
        }
        return null;
      },

      getAllHomework: () => {
        const semester = get().getActiveSemester();
        if (!semester) return [];

        const result: { homework: Homework; course: Course }[] = [];
        for (const course of semester.courses) {
          for (const homework of course.homework) {
            result.push({ homework, course });
          }
        }
        return result.sort((a, b) =>
          new Date(a.homework.dueDate).getTime() - new Date(b.homework.dueDate).getTime()
        );
      },

      getUpcomingHomework: () => {
        const all = get().getAllHomework();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return all.filter(({ homework }) => {
          const dueDate = new Date(homework.dueDate);
          return !homework.completed && dueDate >= today;
        });
      },

      getOverdueHomework: () => {
        const all = get().getAllHomework();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return all.filter(({ homework }) => {
          const dueDate = new Date(homework.dueDate);
          return !homework.completed && dueDate < today;
        });
      },

      // Semester actions
      addSemester: (name: string, code?: string) => {
        const id = uuid();
        set((state) => ({
          data: {
            ...state.data,
            semesters: [
              ...state.data.semesters,
              {
                id,
                name,
                code, // Cheesefork semester code (e.g., "202501")
                courses: [],
                calendarSettings: { ...DEFAULT_CALENDAR_SETTINGS },
              },
            ],
            lastModified: new Date().toISOString(),
          },
          activeSemesterId: id,
        }));
        return id;
      },

      updateSemester: (id: string, updates: Partial<Semester>) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      deleteSemester: (id: string) => {
        set((state) => {
          const newSemesters = state.data.semesters.filter((s) => s.id !== id);
          return {
            data: {
              ...state.data,
              semesters: newSemesters,
              lastModified: new Date().toISOString(),
            },
            activeSemesterId:
              state.activeSemesterId === id
                ? newSemesters[0]?.id || null
                : state.activeSemesterId,
          };
        });
      },

      setActiveSemester: (id: string | null) => {
        set({ activeSemesterId: id });
      },

      // Course actions
      addCourse: (semesterId: string, course: NewCourse) => {
        const id = uuid();
        set((state) => {
          const semester = state.data.semesters.find((s) => s.id === semesterId);
          const courseCount = semester?.courses.length || 0;
          const color = course.color || generateCourseColor(
            courseCount,
            courseCount + 1,
            state.data.settings.colorTheme,
            state.data.settings.baseColorHue
          );

          return {
            data: {
              ...state.data,
              semesters: state.data.semesters.map((s) =>
                s.id === semesterId
                  ? {
                      ...s,
                      courses: [
                        ...s.courses,
                        {
                          ...course,
                          id,
                          color,
                          recordings: course.recordings || {
                            tabs: [
                              { id: 'lectures', name: 'הרצאות', items: [] },
                              { id: 'tutorials', name: 'תרגולים', items: [] },
                            ],
                          },
                          homework: course.homework || [],
                          schedule: course.schedule || [],
                        },
                      ],
                    }
                  : s
              ),
              lastModified: new Date().toISOString(),
            },
          };
        });
        return id;
      },

      updateCourse: (courseId: string, updates: Partial<Course>) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId ? { ...c, ...updates } : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      deleteCourse: (courseId: string) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.filter((c) => c.id !== courseId),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      reorderCourses: (semesterId: string, courseIds: string[]) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => {
              if (s.id !== semesterId) return s;
              const courseMap = new Map(s.courses.map((c) => [c.id, c]));
              const reordered = courseIds
                .map((id) => courseMap.get(id))
                .filter((c): c is Course => c !== undefined);
              return { ...s, courses: reordered };
            }),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      // Homework actions
      addHomework: (courseId: string, homework: NewHomework) => {
        const id = uuid();
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? { ...c, homework: [...c.homework, { ...homework, id }] }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
        return id;
      },

      updateHomework: (courseId: string, homeworkId: string, updates: Partial<Homework>) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      homework: c.homework.map((h) =>
                        h.id === homeworkId ? { ...h, ...updates } : h
                      ),
                    }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      deleteHomework: (courseId: string, homeworkId: string) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? { ...c, homework: c.homework.filter((h) => h.id !== homeworkId) }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      toggleHomeworkComplete: (courseId: string, homeworkId: string) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      homework: c.homework.map((h) =>
                        h.id === homeworkId ? { ...h, completed: !h.completed } : h
                      ),
                    }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      // Recording actions
      addRecordingTab: (courseId: string, name: string) => {
        const id = uuid();
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      recordings: {
                        tabs: [...c.recordings.tabs, { id, name, items: [] }],
                      },
                    }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
        return id;
      },

      updateRecordingTab: (courseId: string, tabId: string, name: string) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      recordings: {
                        tabs: c.recordings.tabs.map((t) =>
                          t.id === tabId ? { ...t, name } : t
                        ),
                      },
                    }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      deleteRecordingTab: (courseId: string, tabId: string) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      recordings: {
                        tabs: c.recordings.tabs.filter((t) => t.id !== tabId),
                      },
                    }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      addRecording: (courseId: string, tabId: string, recording: NewRecording) => {
        const id = uuid();
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      recordings: {
                        tabs: c.recordings.tabs.map((t) =>
                          t.id === tabId
                            ? { ...t, items: [...t.items, { ...recording, id }] }
                            : t
                        ),
                      },
                    }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
        return id;
      },

      updateRecording: (
        courseId: string,
        tabId: string,
        recordingId: string,
        updates: Partial<Recording>
      ) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      recordings: {
                        tabs: c.recordings.tabs.map((t) =>
                          t.id === tabId
                            ? {
                                ...t,
                                items: t.items.map((r) =>
                                  r.id === recordingId ? { ...r, ...updates } : r
                                ),
                              }
                            : t
                        ),
                      },
                    }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      deleteRecording: (courseId: string, tabId: string, recordingId: string) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      recordings: {
                        tabs: c.recordings.tabs.map((t) =>
                          t.id === tabId
                            ? { ...t, items: t.items.filter((r) => r.id !== recordingId) }
                            : t
                        ),
                      },
                    }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      toggleRecordingWatched: (courseId: string, tabId: string, recordingId: string) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      recordings: {
                        tabs: c.recordings.tabs.map((t) =>
                          t.id === tabId
                            ? {
                                ...t,
                                items: t.items.map((r) =>
                                  r.id === recordingId ? { ...r, watched: !r.watched } : r
                                ),
                              }
                            : t
                        ),
                      },
                    }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      importRecordings: (courseId: string, tabId: string, recordings: NewRecording[]) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      recordings: {
                        tabs: c.recordings.tabs.map((t) =>
                          t.id === tabId
                            ? {
                                ...t,
                                items: [
                                  ...t.items,
                                  ...recordings.map((r) => ({ ...r, id: uuid() })),
                                ],
                              }
                            : t
                        ),
                      },
                    }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      // Schedule actions
      addScheduleItem: (courseId: string, item: Omit<ScheduleItem, 'id'>) => {
        const id = uuid();
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? { ...c, schedule: [...c.schedule, { ...item, id }] }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
        return id;
      },

      updateScheduleItem: (courseId: string, itemId: string, updates: Partial<ScheduleItem>) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      schedule: c.schedule.map((item) =>
                        item.id === itemId ? { ...item, ...updates } : item
                      ),
                    }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      deleteScheduleItem: (courseId: string, itemId: string) => {
        set((state) => ({
          data: {
            ...state.data,
            semesters: state.data.semesters.map((s) => ({
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId
                  ? { ...c, schedule: c.schedule.filter((item) => item.id !== itemId) }
                  : c
              ),
            })),
            lastModified: new Date().toISOString(),
          },
        }));
      },

      // Settings actions
      updateSettings: (updates: Partial<Settings>) => {
        set((state) => ({
          data: {
            ...state.data,
            settings: { ...state.data.settings, ...updates },
            lastModified: new Date().toISOString(),
          },
        }));
      },

      // Data actions
      setData: (data: AppData) => {
        set({ data });
      },

      resetData: () => {
        set({
          data: createDefaultAppData(),
          activeSemesterId: null,
        });
      },

      importData: (importedData: Partial<AppData>) => {
        set((state) => ({
          data: {
            ...state.data,
            ...importedData,
            lastModified: new Date().toISOString(),
          },
        }));
      },
    }),
    {
      name: `${STORAGE_KEYS.DATA_PREFIX}default`,
      partialize: (state) => ({ data: state.data, activeSemesterId: state.activeSemesterId }),
    }
  )
);
