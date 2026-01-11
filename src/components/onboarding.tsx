'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { GraduationCap, Building2, Target, CalendarDays, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProfileStore } from '@/stores';
import { TECHNION_FACULTIES } from '@/lib/cheesefork';
import { isRTL, type Locale } from '@/i18n';
import { cn } from '@/lib/utils';

const DEGREE_TYPES = [
  { value: 'bachelor', labelKey: 'onboarding.degreeBachelor' },
  { value: 'master', labelKey: 'onboarding.degreeMaster' },
  { value: 'phd', labelKey: 'onboarding.degreePhd' },
  { value: 'other', labelKey: 'onboarding.degreeOther' },
];

interface OnboardingProps {
  onComplete?: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const { completeOnboarding } = useProfileStore();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    faculty: '',
    degree: '',
    cpGoal: 120,
    startYear: new Date().getFullYear(),
  });

  const steps = [
    { icon: Building2, title: t('onboarding.stepFaculty') },
    { icon: GraduationCap, title: t('onboarding.stepDegree') },
    { icon: Target, title: t('onboarding.stepGoal') },
  ];

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!formData.faculty;
      case 1:
        return !!formData.degree;
      case 2:
        return formData.cpGoal > 0;
      default:
        return false;
    }
  };

  const handleComplete = () => {
    completeOnboarding(formData);
    onComplete?.();
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Generate year options (last 10 years)
  const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Faculty options sorted alphabetically
  const facultyOptions = Object.entries(TECHNION_FACULTIES)
    .map(([key, value]) => ({
      value: key,
      label: locale === 'he' ? value.he : locale === 'ar' ? value.ar : value.en,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4"
      dir={dir}
    >
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('onboarding.welcome')}</h1>
          <p className="text-muted-foreground">{t('onboarding.subtitle')}</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((s, index) => (
            <div key={index} className="flex items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                  index < step
                    ? 'bg-primary text-primary-foreground'
                    : index === step
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {index < step ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <s.icon className="h-5 w-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-16 h-1 mx-2 rounded transition-colors',
                    index < step ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-card border rounded-xl p-6 shadow-lg animate-fade-in-up">
          {/* Step content */}
          <div className="mb-6" key={step}>
            <h2 className="text-xl font-semibold mb-1 animate-fade-in">{steps[step].title}</h2>
            <p className="text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
              {step === 0 && t('onboarding.facultyDescription')}
              {step === 1 && t('onboarding.degreeDescription')}
              {step === 2 && t('onboarding.goalDescription')}
            </p>
          </div>

          {/* Step 0: Faculty */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="faculty">{t('course.faculty')}</Label>
                <Select
                  value={formData.faculty}
                  onValueChange={(value) => setFormData({ ...formData, faculty: value })}
                >
                  <SelectTrigger id="faculty">
                    <SelectValue placeholder={t('onboarding.selectFaculty')} />
                  </SelectTrigger>
                  <SelectContent>
                    {facultyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startYear">{t('onboarding.startYear')}</Label>
                <Select
                  value={String(formData.startYear)}
                  onValueChange={(value) => setFormData({ ...formData, startYear: parseInt(value) })}
                >
                  <SelectTrigger id="startYear">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 1: Degree */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {DEGREE_TYPES.map((deg) => (
                  <button
                    key={deg.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, degree: deg.value })}
                    className={cn(
                      'p-4 rounded-lg border text-center transition-all',
                      formData.degree === deg.value
                        ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <GraduationCap className="h-6 w-6 mx-auto mb-2" />
                    <span className="font-medium">{t(deg.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: CP Goal */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cpGoal">{t('onboarding.cpGoal')}</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="cpGoal"
                    type="number"
                    min={1}
                    max={500}
                    value={formData.cpGoal}
                    onChange={(e) => setFormData({ ...formData, cpGoal: parseInt(e.target.value) || 0 })}
                    className="text-2xl font-bold text-center w-32"
                  />
                  <span className="text-lg text-muted-foreground">{t('common.points')}</span>
                </div>
              </div>

              {/* Common presets */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{t('onboarding.commonGoals')}</Label>
                <div className="flex gap-2">
                  {[120, 140, 160, 180].map((goal) => (
                    <Button
                      key={goal}
                      variant={formData.cpGoal === goal ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, cpGoal: goal })}
                    >
                      {goal}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0}
              className={cn(step === 0 && 'invisible')}
            >
              {dir === 'rtl' ? <ArrowRight className="h-4 w-4 ml-2" /> : <ArrowLeft className="h-4 w-4 mr-2" />}
              {t('common.back')}
            </Button>

            <Button onClick={handleNext} disabled={!canProceed()}>
              {step === steps.length - 1 ? (
                <>
                  {t('onboarding.getStarted')}
                  <Check className={`h-4 w-4 ${dir === 'rtl' ? 'mr-2' : 'ml-2'}`} />
                </>
              ) : (
                <>
                  {t('common.next')}
                  {dir === 'rtl' ? <ArrowLeft className="h-4 w-4 mr-2" /> : <ArrowRight className="h-4 w-4 ml-2" />}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Skip option */}
        <div className="text-center mt-4">
          <Button variant="link" onClick={handleComplete} className="text-muted-foreground">
            {t('onboarding.skipForNow')}
          </Button>
        </div>
      </div>
    </div>
  );
}
