import { type Exercise } from "../common/exercises";
import { HighlightedText } from "../common/HighlightedText";

export function ExerciseCard(props: { exercise: Exercise; query: string }) {
  const typeLabel = () => (props.exercise.type === "scale" ? "Scale" : "Arpeggio");

  return (
    <article class="exercise-card">
      <div class="card-meta">
        <span>
          <HighlightedText text={typeLabel()} query={props.query} />
        </span>
        <span>
          <HighlightedText text={props.exercise.tonic} query={props.query} />
        </span>
        <span>
          <HighlightedText text={props.exercise.quality} query={props.query} />
        </span>
      </div>
      <h2>
        <a href={`/exercises/${props.exercise.id}`}>
          <HighlightedText text={props.exercise.title} query={props.query} />
        </a>
      </h2>
      <p>
        <HighlightedText text={props.exercise.notes.join(" - ")} query={props.query} />
      </p>
    </article>
  );
}
