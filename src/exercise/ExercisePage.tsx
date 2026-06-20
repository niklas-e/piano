import { Show } from "solid-js";
import { getExerciseById } from "../common/exercises";
import { ExerciseDetail } from "./ExerciseDetail";

export function ExercisePage(props: { id: string }) {
  const exercise = () => getExerciseById(props.id);

  return (
    <Show when={exercise()} fallback={<ExerciseNotFoundPage />}>
      {(selectedExercise) => <ExerciseDetail exercise={selectedExercise()} />}
    </Show>
  );
}

function ExerciseNotFoundPage() {
  return (
    <section aria-labelledby="exercise-not-found-heading" class="stack">
      <h1 id="exercise-not-found-heading">Exercise not found</h1>
      <p>The selected exercise is not in the catalog.</p>
      <a class="button-link" href="/exercises">Back to exercises</a>
    </section>
  );
}
