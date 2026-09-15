import type { CoffeePersonId } from "@/lib/contract/types";

/**
 * Minimal learning domain shapes for the Coffee Morning digest.
 * These mirror what a future full School Jarvis store would expose —
 * not a second production database of invented content.
 */

export type ExamRecord = {
  personId: CoffeePersonId;
  subject: string;
  /** ISO date YYYY-MM-DD */
  date: string;
};

export type FlashcardRecord = {
  personId: CoffeePersonId;
  /** ISO date YYYY-MM-DD when the card becomes due */
  dueDate: string;
};

export type WeakTopicRecord = {
  personId: CoffeePersonId;
  topic: string;
};

export type StudyRecommendationRecord = {
  personId: CoffeePersonId;
  /** ISO date the recommendation applies to */
  focusDate: string;
  recommendedStudyMinutes: number;
  recommendation: string;
};

/**
 * Read-only learning snapshot used to build SchoolJarvisDailySummary.
 * Implementations must use real School Jarvis sources when they exist.
 */
export type LearningSnapshot = {
  exams: ExamRecord[];
  flashcards: FlashcardRecord[];
  weakTopics: WeakTopicRecord[];
  recommendations: StudyRecommendationRecord[];
};

export interface LearningDataSource {
  /**
   * Load learning signals for one person.
   * Returns null when the underlying store is temporarily unavailable.
   */
  loadForPerson(personId: CoffeePersonId): Promise<LearningSnapshot | null>;
}

/**
 * Default Phase-14 source: empty in-memory store.
 * No invented production exams/cards — available:false until real data is wired.
 * Tests inject a fixture source instead.
 */
export class EmptyLearningDataSource implements LearningDataSource {
  async loadForPerson(_personId: CoffeePersonId): Promise<LearningSnapshot> {
    void _personId;
    return {
      exams: [],
      flashcards: [],
      weakTopics: [],
      recommendations: [],
    };
  }
}

/** In-memory fixture source for tests only — never used as production fake data. */
export class MemoryLearningDataSource implements LearningDataSource {
  constructor(private readonly snapshot: LearningSnapshot) {}

  async loadForPerson(personId: CoffeePersonId): Promise<LearningSnapshot> {
    return {
      exams: this.snapshot.exams.filter((e) => e.personId === personId),
      flashcards: this.snapshot.flashcards.filter((c) => c.personId === personId),
      weakTopics: this.snapshot.weakTopics.filter((t) => t.personId === personId),
      recommendations: this.snapshot.recommendations.filter(
        (r) => r.personId === personId,
      ),
    };
  }
}

export class UnavailableLearningDataSource implements LearningDataSource {
  async loadForPerson(_personId: CoffeePersonId): Promise<null> {
    void _personId;
    return null;
  }
}

let defaultSource: LearningDataSource = new EmptyLearningDataSource();

export function getLearningDataSource(): LearningDataSource {
  return defaultSource;
}

/** Test / future wiring helper. */
export function setLearningDataSource(source: LearningDataSource): void {
  defaultSource = source;
}

export function resetLearningDataSource(): void {
  defaultSource = new EmptyLearningDataSource();
}
