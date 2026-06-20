import { type Exercise } from "../common/exercises";
import { css } from "solid-styled";
import { HighlightedText } from "../common/HighlightedText";

export function ExerciseCard(props: { exercise: Exercise; query: string }) {
  css`
    .exercise-card {
      background: #fffaf2;
      border: 1px solid #dfd1bf;
      border-radius: 1.25rem;
      box-shadow: 0 18px 50px rgba(47, 37, 29, 0.08);
      padding: 1rem;
    }

    .exercise-card h2 {
      font-size: 1.4rem;
      letter-spacing: -0.04em;
      margin: 0.6rem 0;

      &:hover {
        text-decoration: underline;
      }
    }

    .exercise-card a {
      text-decoration: none;
    }

    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .card-meta span {
      background: #efe1cf;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 800;
      padding: 0.22rem 0.5rem;
    }
  `;

  const typeLabel = () => (props.exercise.type === "scale" ? "Scale" : "Arpeggio");

  return (
    <article class="exercise-card" >
        <a href={`/exercises/${props.exercise.id}`}>
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
          <HighlightedText text={props.exercise.title} query={props.query} />
      </h2>
      <p>
        <HighlightedText text={props.exercise.notes.join(" - ")} query={props.query} />
      </p>
        </a>
    </article>
  );
}
