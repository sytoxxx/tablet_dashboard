import type { TaskItem } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";

export function TasksSection({ tasks }: { tasks: TaskItem[] }) {
  return (
    <Section title="To-dos">
      {tasks.length === 0 ? (
        <EmptyState title="Alles erledigt" description="Keine offenen Aufgaben." />
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={
                task.done ? "text-[color:var(--quiet)] line-through" : "text-[color:var(--ink)]"
              }
            >
              {task.label}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
