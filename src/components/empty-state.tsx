type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="rounded-2xl bg-[color:var(--surface)] px-5 py-6 text-[color:var(--quiet)]"
    >
      <p className="font-medium text-[color:var(--ink)]">{title}</p>
      <p className="mt-1 text-sm sm:text-base">{description}</p>
    </div>
  );
}
