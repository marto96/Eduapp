'use client';

import { useEffect, useState } from 'react';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function DashboardGreeting({ fullName }: { fullName: string }) {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  if (!greeting) return null;

  const firstName = fullName.trim().split(/\s+/)[0];

  return (
    <h1 className="text-xl font-medium">
      {greeting}, {firstName}
    </h1>
  );
}
