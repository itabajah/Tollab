'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  X,
  Plus,
  Trash2,
  ExternalLink,
  Play,
  FileText,
  Save,
  Video,
  BookOpen,
  ClipboardList,
  Info,
  Link as LinkIcon,
  Calendar,
  MapPin,
  User,
  Hash,
  GraduationCap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataStore, useUIStore } from '@/stores';
import { Course, Recording, Homework, RecordingTab } from '@/types';
import { cn } from '@/lib/utils';
import { getVideoEmbedUrl, isYouTubeUrl } from '@/lib/video-fetch';

// Recording Item Component
interface RecordingItemProps {
  recording: Recording;
  courseId: string;
  tabId: string;
  onToggle: () => void;
  onUpdate: (updates: Partial<Recording>) => void;
  onDelete: () => void;
}

function RecordingItem({ recording, courseId, tabId, onToggle, onUpdate, onDelete }: RecordingItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editValues, setEditValues] = useState({
    name: recording.name,
    videoLink: recording.videoLink,
    slideLink: recording.slideLink,
  });

  const handleSave = () => {
    onUpdate(editValues);
    setIsEditing(false);
  };

  const embedUrl = getVideoEmbedUrl(recording.videoLink);
  const hasVideo = !!recording.videoLink;

  return (
    <div
      className={cn(
        'group flex flex-col gap-2 p-3 rounded-lg border transition-colors',
        recording.watched && 'opacity-60 bg-muted/30'
      )}
    >
      {/* Main row */}
      <div className="flex items-start gap-3">
        <div className="pt-0.5" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          <Checkbox checked={recording.watched} />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editValues.name}
                onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                placeholder="שם ההקלטה"
              />
              <Input
                value={editValues.videoLink}
                onChange={(e) => setEditValues({ ...editValues, videoLink: e.target.value })}
                placeholder="קישור לוידאו"
                dir="ltr"
              />
              <Input
                value={editValues.slideLink}
                onChange={(e) => setEditValues({ ...editValues, slideLink: e.target.value })}
                placeholder="קישור למצגת"
                dir="ltr"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3 w-3 ml-1" />
                  שמור
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h4
                className={cn(
                  'font-medium text-sm cursor-pointer hover:text-primary',
                  recording.watched && 'line-through'
                )}
                onClick={() => setIsEditing(true)}
              >
                {recording.name}
              </h4>

              {/* Links */}
              <div className="flex gap-3 mt-1">
                {recording.videoLink && (
                  <a
                    href={recording.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Video className="h-3 w-3" />
                    צפה
                  </a>
                )}
                {recording.slideLink && (
                  <a
                    href={recording.slideLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <FileText className="h-3 w-3" />
                    מצגת
                  </a>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {hasVideo && embedUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Video Preview */}
      {showPreview && embedUrl && (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}
    </div>
  );
}

// Homework Item Component
interface HomeworkItemEditProps {
  homework: Homework;
  courseId: string;
  onToggle: () => void;
  onUpdate: (updates: Partial<Homework>) => void;
  onDelete: () => void;
}

function HomeworkItemEdit({ homework, courseId, onToggle, onUpdate, onDelete }: HomeworkItemEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    title: homework.title,
    dueDate: homework.dueDate,
    notes: homework.notes,
    links: [...homework.links],
  });

  const handleSave = () => {
    onUpdate(editValues);
    setIsEditing(false);
  };

  const addLink = () => {
    setEditValues({
      ...editValues,
      links: [...editValues.links, { label: '', url: '' }],
    });
  };

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    const newLinks = [...editValues.links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setEditValues({ ...editValues, links: newLinks });
  };

  const removeLink = (index: number) => {
    setEditValues({
      ...editValues,
      links: editValues.links.filter((_, i) => i !== index),
    });
  };

  return (
    <div
      className={cn(
        'group flex flex-col gap-2 p-3 rounded-lg border transition-colors',
        homework.completed && 'opacity-60 bg-muted/30'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          <Checkbox checked={homework.completed} />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <Input
                value={editValues.title}
                onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                placeholder="כותרת המטלה"
              />
              <Input
                type="date"
                value={editValues.dueDate}
                onChange={(e) => setEditValues({ ...editValues, dueDate: e.target.value })}
              />
              <textarea
                className="w-full min-h-[60px] p-2 text-sm border rounded-md resize-y"
                value={editValues.notes}
                onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                placeholder="הערות..."
              />

              {/* Links */}
              <div className="space-y-2">
                <Label className="text-xs">קישורים</Label>
                {editValues.links.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={link.label}
                      onChange={(e) => updateLink(i, 'label', e.target.value)}
                      placeholder="שם"
                      className="w-24"
                    />
                    <Input
                      value={link.url}
                      onChange={(e) => updateLink(i, 'url', e.target.value)}
                      placeholder="כתובת URL"
                      className="flex-1"
                      dir="ltr"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => removeLink(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addLink}>
                  <Plus className="h-3 w-3 ml-1" />
                  הוסף קישור
                </Button>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3 w-3 ml-1" />
                  שמור
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h4
                    className={cn(
                      'font-medium text-sm cursor-pointer hover:text-primary',
                      homework.completed && 'line-through'
                    )}
                    onClick={() => setIsEditing(true)}
                  >
                    {homework.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(homework.dueDate), 'd בMMMM yyyy', { locale: he })}
                  </p>
                </div>
              </div>

              {homework.notes && (
                <p className="text-xs text-muted-foreground mt-1">{homework.notes}</p>
              )}

              {homework.links.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {homework.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.label || 'קישור'}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {!isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Main Course Modal
export function CourseModal() {
  const { activeModal, modalData, closeModal, activeRecordingTabId, setActiveRecordingTabId } = useUIStore();
  const {
    getCourse,
    updateCourse,
    deleteCourse,
    addHomework,
    updateHomework,
    deleteHomework,
    toggleHomeworkComplete,
    addRecordingTab,
    updateRecordingTab,
    deleteRecordingTab,
    addRecording,
    updateRecording,
    deleteRecording,
    toggleRecordingWatched,
  } = useDataStore();
  const { openConfirmModal, openPromptModal } = useUIStore();

  const [activeTab, setActiveTab] = useState<'recordings' | 'homework' | 'details'>('recordings');

  // Get course data
  const courseData = modalData as { course: Course; initialTab?: string } | null;
  const courseId = courseData?.course?.id;
  const course = courseId ? getCourse(courseId) : null;

  // Set initial tab
  useEffect(() => {
    if (courseData?.initialTab) {
      setActiveTab(courseData.initialTab as 'recordings' | 'homework' | 'details');
    }
  }, [courseData?.initialTab]);

  // Set initial recording tab
  useEffect(() => {
    if (course && course.recordings.tabs.length > 0 && !activeRecordingTabId) {
      setActiveRecordingTabId(course.recordings.tabs[0].id);
    }
  }, [course, activeRecordingTabId, setActiveRecordingTabId]);

  if (activeModal !== 'course' || !course) return null;

  const currentRecordingTab = course.recordings.tabs.find((t) => t.id === activeRecordingTabId);

  // Handlers
  const handleDeleteCourse = () => {
    openConfirmModal({
      title: 'מחיקת קורס',
      message: `האם אתה בטוח שברצונך למחוק את "${course.name}"? פעולה זו לא ניתנת לביטול.`,
      confirmLabel: 'מחק',
      variant: 'destructive',
      onConfirm: () => {
        deleteCourse(course.id);
        closeModal();
      },
    });
  };

  const handleAddRecordingTab = () => {
    openPromptModal({
      title: 'לשונית חדשה',
      placeholder: 'שם הלשונית',
      confirmLabel: 'צור',
      onConfirm: (name) => {
        if (name.trim()) {
          const tabId = addRecordingTab(course.id, name.trim());
          setActiveRecordingTabId(tabId);
        }
      },
    });
  };

  const handleAddRecording = () => {
    if (!activeRecordingTabId) return;
    addRecording(course.id, activeRecordingTabId, {
      name: `הקלטה ${(currentRecordingTab?.items.length || 0) + 1}`,
      videoLink: '',
      slideLink: '',
      watched: false,
    });
  };

  const handleAddHomework = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    addHomework(course.id, {
      title: 'מטלה חדשה',
      dueDate: tomorrow.toISOString().split('T')[0],
      completed: false,
      notes: '',
      links: [],
    });
  };

  return (
    <Dialog open={true} onOpenChange={closeModal}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: course.color || 'hsl(var(--primary))' }}
              />
              {course.name}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={handleDeleteCourse}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="recordings" className="flex items-center gap-1">
              <Video className="h-4 w-4" />
              הקלטות
            </TabsTrigger>
            <TabsTrigger value="homework" className="flex items-center gap-1">
              <ClipboardList className="h-4 w-4" />
              מטלות
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-1">
              <Info className="h-4 w-4" />
              פרטים
            </TabsTrigger>
          </TabsList>

          {/* Recordings Tab */}
          <TabsContent value="recordings" className="flex-1 overflow-hidden flex flex-col mt-4">
            {/* Recording tabs */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2 shrink-0">
              {course.recordings.tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeRecordingTabId === tab.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveRecordingTabId(tab.id)}
                  className="shrink-0"
                >
                  {tab.name}
                  <span className="mr-1 text-xs opacity-70">({tab.items.length})</span>
                </Button>
              ))}
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleAddRecordingTab}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Recordings list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {currentRecordingTab?.items.map((recording) => (
                <RecordingItem
                  key={recording.id}
                  recording={recording}
                  courseId={course.id}
                  tabId={activeRecordingTabId!}
                  onToggle={() => toggleRecordingWatched(course.id, activeRecordingTabId!, recording.id)}
                  onUpdate={(updates) => updateRecording(course.id, activeRecordingTabId!, recording.id, updates)}
                  onDelete={() => deleteRecording(course.id, activeRecordingTabId!, recording.id)}
                />
              ))}

              {currentRecordingTab?.items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>אין הקלטות בלשונית זו</p>
                </div>
              )}
            </div>

            {/* Add recording button */}
            <div className="pt-3 shrink-0 border-t">
              <Button onClick={handleAddRecording} className="w-full">
                <Plus className="h-4 w-4 ml-1" />
                הוסף הקלטה
              </Button>
            </div>
          </TabsContent>

          {/* Homework Tab */}
          <TabsContent value="homework" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {course.homework.map((hw) => (
                <HomeworkItemEdit
                  key={hw.id}
                  homework={hw}
                  courseId={course.id}
                  onToggle={() => toggleHomeworkComplete(course.id, hw.id)}
                  onUpdate={(updates) => updateHomework(course.id, hw.id, updates)}
                  onDelete={() => deleteHomework(course.id, hw.id)}
                />
              ))}

              {course.homework.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>אין מטלות בקורס זה</p>
                </div>
              )}
            </div>

            <div className="pt-3 shrink-0 border-t">
              <Button onClick={handleAddHomework} className="w-full">
                <Plus className="h-4 w-4 ml-1" />
                הוסף מטלה
              </Button>
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-y-auto mt-4">
            <CourseDetailsForm course={course} onUpdate={(updates) => updateCourse(course.id, updates)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Course Details Form
interface CourseDetailsFormProps {
  course: Course;
  onUpdate: (updates: Partial<Course>) => void;
}

function CourseDetailsForm({ course, onUpdate }: CourseDetailsFormProps) {
  const [values, setValues] = useState({
    name: course.name,
    number: course.number,
    points: course.points,
    lecturer: course.lecturer,
    faculty: course.faculty,
    location: course.location,
    grade: course.grade,
    syllabus: course.syllabus,
    notes: course.notes,
    moedA: course.exams.moedA,
    moedB: course.exams.moedB,
  });

  const handleChange = (field: string, value: string) => {
    setValues({ ...values, [field]: value });
  };

  const handleBlur = () => {
    onUpdate({
      name: values.name,
      number: values.number,
      points: values.points,
      lecturer: values.lecturer,
      faculty: values.faculty,
      location: values.location,
      grade: values.grade,
      syllabus: values.syllabus,
      notes: values.notes,
      exams: {
        moedA: values.moedA,
        moedB: values.moedB,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label className="flex items-center gap-1 mb-1">
            <BookOpen className="h-3 w-3" />
            שם הקורס
          </Label>
          <Input
            value={values.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={handleBlur}
          />
        </div>

        <div>
          <Label className="flex items-center gap-1 mb-1">
            <Hash className="h-3 w-3" />
            מספר קורס
          </Label>
          <Input
            value={values.number}
            onChange={(e) => handleChange('number', e.target.value)}
            onBlur={handleBlur}
            placeholder="234111"
          />
        </div>

        <div>
          <Label className="flex items-center gap-1 mb-1">
            <GraduationCap className="h-3 w-3" />
            נקודות זכות
          </Label>
          <Input
            value={values.points}
            onChange={(e) => handleChange('points', e.target.value)}
            onBlur={handleBlur}
            placeholder="3.0"
          />
        </div>

        <div>
          <Label className="flex items-center gap-1 mb-1">
            <User className="h-3 w-3" />
            מרצה
          </Label>
          <Input
            value={values.lecturer}
            onChange={(e) => handleChange('lecturer', e.target.value)}
            onBlur={handleBlur}
          />
        </div>

        <div>
          <Label className="flex items-center gap-1 mb-1">
            <MapPin className="h-3 w-3" />
            מיקום
          </Label>
          <Input
            value={values.location}
            onChange={(e) => handleChange('location', e.target.value)}
            onBlur={handleBlur}
          />
        </div>

        <div>
          <Label className="mb-1">פקולטה</Label>
          <Input
            value={values.faculty}
            onChange={(e) => handleChange('faculty', e.target.value)}
            onBlur={handleBlur}
          />
        </div>

        <div>
          <Label className="mb-1">ציון</Label>
          <Input
            value={values.grade}
            onChange={(e) => handleChange('grade', e.target.value)}
            onBlur={handleBlur}
            placeholder="0-100"
          />
        </div>
      </div>

      {/* Exams */}
      <div>
        <Label className="flex items-center gap-1 mb-2">
          <Calendar className="h-3 w-3" />
          מועדי בחינות
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1">מועד א׳</Label>
            <Input
              type="date"
              value={values.moedA}
              onChange={(e) => handleChange('moedA', e.target.value)}
              onBlur={handleBlur}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1">מועד ב׳</Label>
            <Input
              type="date"
              value={values.moedB}
              onChange={(e) => handleChange('moedB', e.target.value)}
              onBlur={handleBlur}
            />
          </div>
        </div>
      </div>

      {/* Syllabus */}
      <div>
        <Label className="flex items-center gap-1 mb-1">
          <LinkIcon className="h-3 w-3" />
          קישור לסילבוס
        </Label>
        <Input
          value={values.syllabus}
          onChange={(e) => handleChange('syllabus', e.target.value)}
          onBlur={handleBlur}
          placeholder="https://..."
          dir="ltr"
        />
      </div>

      {/* Notes */}
      <div>
        <Label className="mb-1">הערות</Label>
        <textarea
          className="w-full min-h-[100px] p-3 text-sm border rounded-md resize-y"
          value={values.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          onBlur={handleBlur}
          placeholder="הערות נוספות..."
        />
      </div>
    </div>
  );
}
