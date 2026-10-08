export default function Loading() {
  return (
    <div className="space-y-4 pt-2" aria-busy aria-label="Loading">
      <div className="skeleton h-9 w-56 rounded-xl" />
      <div className="skeleton h-4 w-32 rounded" />
      <div className="skeleton h-80 rounded-3xl" />
      <div className="skeleton h-40 rounded-3xl" />
    </div>
  );
}
