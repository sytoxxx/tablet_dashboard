import type { TaskItem } from "@/lib/types";
import { Section } from "@/components/section";

export function TasksSection({
  tasks,
  morningOnly = false,
}: {
  tasks: TaskItem[];
  morningOnly?: boolean;
}) {
  if (tasks.length === 0) return null;

  return (
    <Section title={morningOnly ? "Wichtig" : "To-dos"} emphasis="tertiary">
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
    </Section>
  );
}
