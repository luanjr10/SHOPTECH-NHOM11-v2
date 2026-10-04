import { useEffect, useState } from "react";

interface CountdownTimerProps {
  endsAt: string;
}

function getRemaining(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  const total = Math.max(diff, 0);

  const hours = Math.floor(total / (1000 * 60 * 60));
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);

  return { total, hours, minutes, seconds };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function CountdownTimer({ endsAt }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => getRemaining(endsAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(getRemaining(endsAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (remaining.total <= 0) {
    return null;
  }

  const cells = [remaining.hours, remaining.minutes, remaining.seconds];

  return (
    <div className="flex items-center gap-2 font-sans">
      <span className="text-[13px] font-bold uppercase text-white">
        Kết thúc sau
      </span>
      <div className="flex items-center gap-1">
        {cells.map((cell, index) => (
          <div key={index} className="flex items-center gap-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-[15px] font-bold text-primary500">
              {pad(cell)}
            </span>
            {index < cells.length - 1 && (
              <span className="font-bold text-white">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
