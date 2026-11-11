import { state } from "../../app/state.js";
import { toIsoDate, WEEKDAYS } from "../../utils/dates.js";

export function selectedPlanDay() {
  return state.plan.days[state.selectedDay];
}

export function selectedDayTitle() {
  return selectedPlanDay().name || WEEKDAYS[state.selectedDay];
}

export function findExercise(exerciseId) {
  return selectedPlanDay().exercises.find((exercise) => exercise.id === exerciseId) ?? null;
}

export function currentSessionId() {
  return `${toIsoDate(new Date())}_${state.selectedDay}`;
}

export function currentSession() {
  return state.sessions.find((session) => session.id === currentSessionId()) ?? null;
}

export function todaysSets(exerciseId) {
  const sets = currentSession()?.exercises[exerciseId]?.sets;
  return sets?.length ? sets : null;
}

export function exerciseHistory(exerciseId) {
  return state.sessions
    .filter((session) => session.exercises[exerciseId]?.sets?.length)
    .map((session) => ({ sessionId: session.id, date: session.date, sets: session.exercises[exerciseId].sets }));
}

export function previousEntry(exerciseId) {
  const todayId = currentSessionId();
  return exerciseHistory(exerciseId).find((entry) => entry.sessionId !== todayId) ?? null;
}

export function completedCount(day) {
  return day.exercises.filter((exercise) => todaysSets(exercise.id)).length;
}

export function isRecentlyCompleted(exerciseId) {
  return exerciseId === state.completedExerciseId && performance.now() < state.completedUntil;
}
