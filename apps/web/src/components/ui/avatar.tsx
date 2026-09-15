export function Avatar({ photoUrl, initials, alt }: { photoUrl?: string | null; initials: string; alt: string }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={alt}
        className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
      {initials}
    </div>
  );
}
