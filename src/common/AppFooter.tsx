import { css } from "solid-styled"

const repositoryUrl = "https://github.com/niklas-e/piano"

export function AppFooter() {
  css`
    .site-footer {
      border-top: 1px solid #dfd1bf;
      color: #4f4338;
      font-size: 0.9rem;
      margin-top: 2rem;
      padding-block: 1.5rem;
    }

    /* Lines up with the page content above. */
    .footer-inner {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 2rem;
      justify-content: space-between;
      margin: 0 auto;
      max-width: 1120px;
      padding-inline: clamp(1rem, 4vw, 3rem);
    }

    @media (max-width: 420px) {
      .footer-inner {
        padding-inline: 0.85rem;
      }
    }

    .footer-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem;
      list-style: none;
    }

    .footer-links a {
      font-weight: 600;
      text-decoration-color: #b38f64;
      text-underline-offset: 0.2em;
    }

    .footer-links a:hover {
      color: #17130f;
      text-decoration-color: currentColor;
    }
  `

  return (
    <footer class="site-footer">
      <div class="footer-inner">
        <p>© 2026 Niklas Engblom · Free and open source</p>
        <ul class="footer-links">
          <li>
            <a href={repositoryUrl}>Source code</a>
          </li>
          <li>
            <a href={`${repositoryUrl}/blob/main/LICENSE`}>AGPL-3.0 license</a>
          </li>
        </ul>
      </div>
    </footer>
  )
}
