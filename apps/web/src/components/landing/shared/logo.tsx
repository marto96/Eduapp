export function Logo({ size = 26, dot = 9, radius = 7 }: { size?: number; dot?: number; radius?: number }) {
  return (
    <div
      className="grid flex-none place-items-center bg-[#9184d9]"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <div className="bg-white" style={{ width: dot, height: dot, borderRadius: Math.max(2, radius - 5) }} />
    </div>
  );
}
