export type { CoffeeBean, CoffeeBrew, CoffeeRecipe, CoffeeCommandData } from "@/lib/coffee/types";
export {
  COFFEE_METHOD_LABELS,
  COFFEE_METHODS,
} from "@/lib/coffee/types";
export {
  COFFEE_COMMAND_STORAGE_KEY,
  emptyCoffeeCommandData,
  loadCoffeeCommandData,
  saveCoffeeCommandData,
  normalizeCoffeeCommandData,
} from "@/lib/coffee/store";
export {
  statsForToday,
  statsForWeek,
  statsForMonth,
  lastBrew,
  beanLabel,
  computePeriodStats,
} from "@/lib/coffee/stats";
export {
  buildRecommendations,
  recommendBeanForMethod,
} from "@/lib/coffee/recommendations";
export {
  guidedStepsForDrink,
  type CoffeeGuidedStep,
  type CoffeeGuidedStepKind,
} from "@/lib/coffee/guided-steps";
export {
  recipesFromDrinks,
  recipeForMethod,
  describeOptimal,
  verdictForDuration,
} from "@/lib/coffee/recipes";
export { createCoffeeId } from "@/lib/coffee/id";
