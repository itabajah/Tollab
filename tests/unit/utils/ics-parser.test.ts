import { describe, it, expect } from 'vitest';
import { parseICS } from '@/utils/ics-parser';
import type { ParsedICSEvent } from '@/utils/ics-parser';

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20241027T103000
DTEND:20241027T120000
SUMMARY:104012 - Linear Algebra
LOCATION:Taub 2
DESCRIPTION:Dr. Cohen
END:VEVENT
BEGIN:VEVENT
DTSTART:20241028T140000
DTEND:20241028T160000
SUMMARY:234218 - Data Structures
LOCATION:CS 101
DESCRIPTION:Prof. Levi
END:VEVENT
END:VCALENDAR`;

const SINGLE_EVENT_ICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20240101T090000
DTEND:20240101T100000
SUMMARY:Intro Lecture
END:VEVENT
END:VCALENDAR`;

const EXAM_ICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20241027T103000
DTEND:20241027T120000
SUMMARY:104012 - Linear Algebra
LOCATION:Taub 2
DESCRIPTION:Dr. Cohen
END:VEVENT
BEGIN:VEVENT
DTSTART:20250201
DTEND:20250201
SUMMARY:מועד א' - Linear Algebra
END:VEVENT
END:VCALENDAR`;

describe('parseICS', () => {
  it('parses multiple VEVENT blocks into courses', () => {
    const events = parseICS(SAMPLE_ICS);
    expect(events).toHaveLength(2);
  });

  it('extracts course name (after " - " separator)', () => {
    const events = parseICS(SAMPLE_ICS);
    expect(events[0]?.name).toBe('Linear Algebra');
    expect(events[1]?.name).toBe('Data Structures');
  });

  it('extracts location', () => {
    const events = parseICS(SAMPLE_ICS);
    expect(events[0]?.location).toBe('Taub 2');
  });

  it('extracts lecturer from DESCRIPTION field', () => {
    const events = parseICS(SAMPLE_ICS);
    expect(events[0]?.lecturer).toBe('Dr. Cohen');
  });

  it('populates schedule slots', () => {
    const events = parseICS(SAMPLE_ICS);
    expect(events[0]?.schedule.length).toBeGreaterThan(0);
    const slot = events[0]!.schedule[0]!;
    expect(slot.start).toMatch(/^\d{2}:\d{2}$/);
    expect(slot.end).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns empty array for empty input', () => {
    expect(parseICS('')).toEqual([]);
  });

  it('returns empty array for ICS with no events', () => {
    const noEvents = `BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR`;
    expect(parseICS(noEvents)).toEqual([]);
  });

  it('returns empty array for malformed input', () => {
    expect(parseICS('this is not ics data')).toEqual([]);
  });

  it('handles single event correctly', () => {
    const events = parseICS(SINGLE_EVENT_ICS);
    expect(events).toHaveLength(1);
    expect(events[0]?.name).toBe('Intro Lecture');
  });

  it('assigns exam dates from Hebrew exam labels', () => {
    const events = parseICS(EXAM_ICS);
    const algebra = events.find((e: ParsedICSEvent) => e.name === 'Linear Algebra');
    expect(algebra).toBeDefined();
    expect(algebra?.moedA).toBe('2025-02-01');
  });

  it('each event has expected shape', () => {
    const events = parseICS(SAMPLE_ICS);
    for (const ev of events) {
      expect(ev).toHaveProperty('name');
      expect(ev).toHaveProperty('number');
      expect(ev).toHaveProperty('lecturer');
      expect(ev).toHaveProperty('location');
      expect(ev).toHaveProperty('schedule');
      expect(ev).toHaveProperty('moedA');
      expect(ev).toHaveProperty('moedB');
    }
  });
});
