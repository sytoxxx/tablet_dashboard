import type { TaskItem } from "@/lib/types";

/** Morning strip: only explicitly important + open tasks. */
export function selectMorningTasks(tasks: TaskItem[]): TaskItem[] {
  return tasks.filter((t) => !t.done && t.important === true);
}
