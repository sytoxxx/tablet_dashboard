type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="rounded-[1.25rem] bg-[color:var(--surface)]/90 px-5 py-5 text-[color:var(--quiet)] animate-soft-in"
    >
      <p className="font-medium text-[color:var(--ink)]">{title}</p>
      <p className="mt-1 text-sm leading-relaxed sm:text-base">{description}</p>
    </div>
  );
}
