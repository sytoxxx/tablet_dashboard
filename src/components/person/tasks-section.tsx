import type { TaskItem } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Section } from "@/components/section";

export function TasksSection({
  tasks,
  morningOnly = false,
}: {
  tasks: TaskItem[];
  morningOnly?: boolean;
}) {
  return (
    <Section title={morningOnly ? "Wichtig" : "To-dos"}>
      {tasks.length === 0 ? (
        <EmptyState
          title="Heute nichts Wichtiges offen."
          description={
            morningOnly
              ? "Keine markierten To-dos für den Morgen."
              : "Keine offenen Aufgaben."
          }
        />
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={
                task.done
                  ? "text-[color:var(--quiet)] line-through"
                  : "text-[color:var(--ink)]"
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
