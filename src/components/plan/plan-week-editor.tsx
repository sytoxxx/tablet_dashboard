"use client";

import { useState } from "react";
import type {
  PersonProfile,
  Schedule,
  SchoolLesson,
  WeekdayKey,
  WorkShiftDay,
  PersonalBlock,
} from "@/lib/types";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Copy, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PlanWeekEditorProps = {
  person: PersonProfile;
  onChange: (schedule: Schedule) => void;
};

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function PlanWeekEditor({ person, onChange }: PlanWeekEditorProps) {
  const [day, setDay] = useState<WeekdayKey>("mon");
  const schedule = person.schedule;

  const setScheduleType = (type: Schedule["type"]) => {
    if (schedule.type === type) return;
    onChange({ type, week: {} });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "school", label: "Stundenplan" },
            { id: "work", label: "Arbeitsplan" },
            { id: "personal", label: "Persönlich" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={cn(
              "min-h-12 rounded-2xl px-4",
              schedule.type === opt.id
                ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                : "bg-[color:var(--surface)]",
            )}
            onClick={() => setScheduleType(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {WEEKDAY_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            className={cn(
              "min-h-12 min-w-14 shrink-0 rounded-2xl px-3 text-sm font-medium",
              day === key
                ? "bg-[color:var(--brand)] text-white"
                : "bg-[color:var(--surface)]",
            )}
            onClick={() => setDay(key)}
          >
            {WEEKDAY_LABELS[key].slice(0, 2)}
          </button>
        ))}
      </div>

      <p className="text-sm text-[color:var(--quiet)]">{WEEKDAY_LABELS[day]}</p>

      {schedule.type === "school" ? (
        <SchoolDayEditor
          lessons={schedule.week[day]?.lessons ?? []}
          onChange={(lessons) => {
            const week = { ...schedule.week };
            if (lessons.length === 0) delete week[day];
            else week[day] = { lessons };
            onChange({ type: "school", week });
          }}
          onDuplicateToNext={() => {
            const lessons = schedule.week[day]?.lessons ?? [];
            if (!lessons.length) return;
            const idx = WEEKDAY_ORDER.indexOf(day);
            const nextDay = WEEKDAY_ORDER[(idx + 1) % 7];
            onChange({
              type: "school",
              week: {
                ...schedule.week,
                [nextDay]: {
                  lessons: lessons.map((l) => ({ ...l, id: newId("lesson") })),
                },
              },
            });
            setDay(nextDay);
          }}
        />
      ) : null}

      {schedule.type === "work" ? (
        <WorkDayEditor
          shift={schedule.week[day]}
          onChange={(shift) => {
            const week = { ...schedule.week };
            if (!shift) delete week[day];
            else week[day] = shift;
            onChange({ type: "work", week });
          }}
          onDuplicateToNext={() => {
            const shift = schedule.week[day];
            if (!shift) return;
            const idx = WEEKDAY_ORDER.indexOf(day);
            const nextDay = WEEKDAY_ORDER[(idx + 1) % 7];
            onChange({
              type: "work",
              week: { ...schedule.week, [nextDay]: { ...shift } },
            });
            setDay(nextDay);
          }}
        />
      ) : null}

      {schedule.type === "personal" ? (
        <PersonalDayEditor
          blocks={schedule.week[day]?.blocks ?? []}
          onChange={(blocks) => {
            const week = { ...schedule.week };
            if (blocks.length === 0) delete week[day];
            else week[day] = { blocks };
            onChange({ type: "personal", week });
          }}
        />
      ) : null}
    </div>
  );
}

function SchoolDayEditor({
  lessons,
  onChange,
  onDuplicateToNext,
}: {
  lessons: SchoolLesson[];
  onChange: (lessons: SchoolLesson[]) => void;
  onDuplicateToNext: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="lg"
          className="h-12 gap-2 rounded-2xl"
          onClick={() =>
            onChange([
              ...lessons,
              {
                id: newId("lesson"),
                time: "08:00",
                subject: "Neues Fach",
                room: "",
              },
            ])
          }
        >
          <Plus className="size-4" /> Stunde
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="h-12 gap-2 rounded-2xl bg-[color:var(--surface)]"
          onClick={onDuplicateToNext}
          disabled={!lessons.length}
        >
          <Copy className="size-4" /> Auf nächsten Tag
        </Button>
      </div>
      {lessons.length === 0 ? (
        <p className="text-[color:var(--quiet)]">Keine Stunden an diesem Tag.</p>
      ) : (
        <ul className="space-y-3">
          {lessons.map((lesson, index) => (
            <li
              key={lesson.id}
              className="grid gap-2 rounded-2xl bg-[color:var(--surface)] p-3 sm:grid-cols-[6rem_1fr_6rem_auto]"
            >
              <input
                value={lesson.time}
                aria-label="Uhrzeit"
                className="h-11 rounded-xl bg-white/70 px-3 tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                onChange={(e) => {
                  const next = [...lessons];
                  next[index] = { ...lesson, time: e.target.value };
                  onChange(next);
                }}
              />
              <input
                value={lesson.subject}
                aria-label="Fach"
                className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                onChange={(e) => {
                  const next = [...lessons];
                  next[index] = { ...lesson, subject: e.target.value };
                  onChange(next);
                }}
              />
              <input
                value={lesson.room}
                aria-label="Raum"
                placeholder="Raum"
                className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                onChange={(e) => {
                  const next = [...lessons];
                  next[index] = { ...lesson, room: e.target.value };
                  onChange(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Löschen"
                onClick={() => onChange(lessons.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WorkDayEditor({
  shift,
  onChange,
  onDuplicateToNext,
}: {
  shift?: WorkShiftDay;
  onChange: (shift: WorkShiftDay | null) => void;
  onDuplicateToNext: () => void;
}) {
  if (!shift) {
    return (
      <Button
        type="button"
        size="lg"
        className="h-12 gap-2 rounded-2xl"
        onClick={() =>
          onChange({
            label: "Schicht",
            start: "06:30",
            end: "14:30",
            location: "",
          })
        }
      >
        <Plus className="size-4" /> Schicht anlegen
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="h-12 gap-2 rounded-2xl bg-[color:var(--surface)]"
          onClick={onDuplicateToNext}
        >
          <Copy className="size-4" /> Auf nächsten Tag
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="h-12 gap-2 rounded-2xl"
          onClick={() => onChange(null)}
        >
          <Trash2 className="size-4" /> Entfernen
        </Button>
      </div>
      <div className="grid gap-2 rounded-2xl bg-[color:var(--surface)] p-3 sm:grid-cols-2">
        <input
          value={shift.label}
          aria-label="Bezeichnung"
          className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)] sm:col-span-2"
          onChange={(e) => onChange({ ...shift, label: e.target.value })}
        />
        <input
          value={shift.start}
          aria-label="Beginn"
          className="h-11 rounded-xl bg-white/70 px-3 tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
          onChange={(e) => onChange({ ...shift, start: e.target.value })}
        />
        <input
          value={shift.end}
          aria-label="Ende"
          className="h-11 rounded-xl bg-white/70 px-3 tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
          onChange={(e) => onChange({ ...shift, end: e.target.value })}
        />
        <input
          value={shift.location}
          aria-label="Ort"
          placeholder="Ort (optional)"
          className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)] sm:col-span-2"
          onChange={(e) => onChange({ ...shift, location: e.target.value })}
        />
        <input
          value={shift.notes ?? ""}
          aria-label="Notizen"
          placeholder="Notizen (optional)"
          className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)] sm:col-span-2"
          onChange={(e) => onChange({ ...shift, notes: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}

function PersonalDayEditor({
  blocks,
  onChange,
}: {
  blocks: PersonalBlock[];
  onChange: (blocks: PersonalBlock[]) => void;
}) {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="lg"
        className="h-12 gap-2 rounded-2xl"
        onClick={() =>
          onChange([
            ...blocks,
            { id: newId("block"), time: "09:00", title: "Neuer Block", place: "" },
          ])
        }
      >
        <Plus className="size-4" /> Block
      </Button>
      <ul className="space-y-3">
        {blocks.map((block, index) => (
          <li
            key={block.id}
            className="grid gap-2 rounded-2xl bg-[color:var(--surface)] p-3 sm:grid-cols-[6rem_1fr_6rem_auto]"
          >
            <input
              value={block.time}
              className="h-11 rounded-xl bg-white/70 px-3 tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
              onChange={(e) => {
                const next = [...blocks];
                next[index] = { ...block, time: e.target.value };
                onChange(next);
              }}
            />
            <input
              value={block.title}
              className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
              onChange={(e) => {
                const next = [...blocks];
                next[index] = { ...block, title: e.target.value };
                onChange(next);
              }}
            />
            <input
              value={block.place}
              className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
              onChange={(e) => {
                const next = [...blocks];
                next[index] = { ...block, place: e.target.value };
                onChange(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(blocks.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
