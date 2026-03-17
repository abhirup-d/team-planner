"use client";

import { CalendarDays } from "lucide-react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

export function DateRangePicker({ startDate, endDate, onStartChange, onEndChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        className="border rounded-md px-2 py-1.5 text-sm bg-background w-[130px]"
      />
      <span className="text-xs text-muted-foreground">to</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        className="border rounded-md px-2 py-1.5 text-sm bg-background w-[130px]"
      />
    </div>
  );
}
