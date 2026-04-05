import type { DraftDate } from "../../types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  dates: DraftDate[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export function ContentCalendar({ dates, selectedDate, onSelectDate }: Props) {
  // Build a week view centered around selectedDate or today
  const center = selectedDate ? new Date(selectedDate + "T12:00:00") : new Date();
  const dayOfWeek = center.getDay(); // 0=Sun
  const monday = new Date(center);
  monday.setDate(center.getDate() - ((dayOfWeek + 6) % 7)); // Go back to Monday

  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDays.push(d);
  }

  const dateMap = new Map(dates.map((d) => [d.date, d]));

  const goWeek = (dir: number) => {
    const newCenter = new Date(center);
    newCenter.setDate(center.getDate() + dir * 7);
    const iso = formatDate(newCenter);
    // Find closest date with content, or just navigate
    const closest = dates
      .map((d) => ({ ...d, diff: Math.abs(new Date(d.date + "T12:00:00").getTime() - newCenter.getTime()) }))
      .sort((a, b) => a.diff - b.diff)[0];
    onSelectDate(closest ? closest.date : iso);
  };

  const today = formatDate(new Date());

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => goWeek(-1)}
        className="p-1.5 rounded-md text-el-low hover:bg-overlay hover:text-el-high transition cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex gap-1.5 flex-1">
        {weekDays.map((day) => {
          const iso = formatDate(day);
          const draft = dateMap.get(iso);
          const isSelected = iso === selectedDate;
          const isToday = iso === today;

          return (
            <button
              key={iso}
              onClick={() => draft ? onSelectDate(iso) : undefined}
              className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg transition cursor-pointer ${
                isSelected
                  ? "bg-violet-lighter-ext text-violet-darker-ext ring-1 ring-violet-darker/30"
                  : draft
                    ? "bg-surface border border-outline hover:bg-overlay text-el-high"
                    : "text-el-disabled"
              } ${isToday && !isSelected ? "ring-1 ring-violet-lighter" : ""}`}
              disabled={!draft}
            >
              <span className="label-md uppercase">{DAY_NAMES[day.getDay()]}</span>
              <span className={`title-sm ${isSelected ? "text-violet-darker-ext" : ""}`}>
                {day.getDate()}
              </span>
              {draft ? (
                <span className={`label-md mt-0.5 ${isSelected ? "text-violet-darker-ext" : "text-el-low"}`}>
                  {draft.postCount}p
                </span>
              ) : (
                <span className="label-md mt-0.5 text-transparent">-</span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => goWeek(1)}
        className="p-1.5 rounded-md text-el-low hover:bg-overlay hover:text-el-high transition cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}
