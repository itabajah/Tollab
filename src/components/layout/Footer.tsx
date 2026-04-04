/**
 * Site footer — matches the legacy index.legacy.html footer exactly.
 */
export function Footer() {
  return (
    <footer class="site-footer">
      <p>
        Made by{' '}
        <a
          href="https://www.linkedin.com/in/ibraheem-tabajah/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ibrahim Tabajah
        </a>
      </p>
      <p class="credits">
        Special thanks to{' '}
        <a
          href="https://github.com/michael-maltsev"
          target="_blank"
          rel="noopener noreferrer"
        >
          Michael Maltsev
        </a>{' '}
        for{' '}
        <a
          href="https://github.com/michael-maltsev/cheese-fork"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cheesefork
        </a>{' '}
        &amp;{' '}
        <a
          href="https://github.com/michael-maltsev/technion-sap-info-fetcher"
          target="_blank"
          rel="noopener noreferrer"
        >
          Technion SAP Fetcher
        </a>
      </p>
    </footer>
  );
}
