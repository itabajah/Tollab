/**
 * Fetch Data tab in the settings modal.
 *
 * Features:
 * - ICS URL input with "Import" button (single mode)
 * - Batch import toggle + textarea for multiple URLs
 * - Technion course ID input with "Fetch Info" button
 * - Status/progress indicators
 */

import { useCallback, useState } from 'preact/hooks';

import { Button } from '@/components/ui';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FetchDataTab() {
  const [icsUrl, setIcsUrl] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [batchStartSemester, setBatchStartSemester] = useState('winter');
  const [batchStartYear, setBatchStartYear] = useState('');
  const [batchEndSemester, setBatchEndSemester] = useState('winter');
  const [batchEndYear, setBatchEndYear] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const [technionStatus, setTechnionStatus] = useState('');
  const [isFetchingTechnion, setIsFetchingTechnion] = useState(false);

  const handleFetchSchedule = useCallback(async () => {
    if (!icsUrl.trim() && !batchMode) {
      setImportStatus('Please enter an ICS URL.');
      return;
    }

    setIsFetching(true);
    setImportStatus('Fetching schedule...');

    try {
      // Wave 9+ will wire this to the actual ICS import service.
      // For now, show a placeholder message.
      await new Promise((resolve) => setTimeout(resolve, 500));
      setImportStatus('ICS import will be wired in a future wave.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setImportStatus(`Error: ${message}`);
    } finally {
      setIsFetching(false);
    }
  }, [icsUrl, batchMode]);

  const handleFetchTechnion = useCallback(async () => {
    setIsFetchingTechnion(true);
    setTechnionStatus('Fetching course data...');

    try {
      // Wave 9+ will wire this to the actual Technion catalog fetch service.
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTechnionStatus('Technion data fetch will be wired in a future wave.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setTechnionStatus(`Error: ${message}`);
    } finally {
      setIsFetchingTechnion(false);
    }
  }, []);

  return (
    <div class="settings-tab-content">
      <h3 class="settings-section-title">Fetch Data</h3>
      <p class="settings-description">
        Import your schedule and update course info from external sources.
      </p>

      {/* Schedule (Cheesefork ICS) */}
      <h4 class="settings-subsection-title">Schedule (Cheesefork ICS)</h4>
      <p class="settings-description">
        Paste your <b>iCalendar (ICS)</b> link to import classes into the calendar.
      </p>

      <div class="form-group">
        <a
          href="https://cheesefork.cf"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-secondary settings-external-link"
        >
          Get ICS link from Cheesefork ↗
        </a>
      </div>

      <div class="form-group">
        <input
          type="url"
          id="ics-link-input"
          placeholder="https://files.cheesefork.cf/.../term-year.ics"
          value={icsUrl}
          onInput={(e) => setIcsUrl((e.target as HTMLInputElement).value)}
        />
      </div>

      {/* Batch Import Toggle */}
      <div class="form-group">
        <label class="settings-day-checkbox">
          <input
            type="checkbox"
            checked={batchMode}
            onChange={() => setBatchMode(!batchMode)}
          />
          <span>Fetch multiple semesters (Batch)</span>
        </label>

        {batchMode && (
          <div class="form-group">
            <div class="form-row">
              <label class="settings-batch-label">Start:</label>
              <select
                value={batchStartSemester}
                onChange={(e) => setBatchStartSemester((e.target as HTMLSelectElement).value)}
              >
                <option value="winter">Winter</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
              </select>
              <input
                type="number"
                placeholder="Year"
                class="settings-batch-year"
                value={batchStartYear}
                onInput={(e) => setBatchStartYear((e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="form-row">
              <label class="settings-batch-label">End:</label>
              <select
                value={batchEndSemester}
                onChange={(e) => setBatchEndSemester((e.target as HTMLSelectElement).value)}
              >
                <option value="winter">Winter</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
              </select>
              <input
                type="number"
                placeholder="Year"
                class="settings-batch-year"
                value={batchEndYear}
                onInput={(e) => setBatchEndYear((e.target as HTMLInputElement).value)}
              />
            </div>
            <p class="settings-description settings-batch-hint">
              Fetches all semesters from start to end in chronological order.
            </p>
          </div>
        )}
      </div>

      <div class="form-group">
        <Button variant="primary" onClick={handleFetchSchedule} loading={isFetching}>
          Fetch Schedule
        </Button>
      </div>

      {importStatus && (
        <div class="form-group">
          <p class="settings-status">{importStatus}</p>
        </div>
      )}

      <hr class="settings-divider" />

      {/* Course Catalog (Technion) */}
      <h4 class="settings-subsection-title">Course Catalog (Technion)</h4>
      <p class="settings-description">
        Fetch the latest course catalog to enrich course details (name, lecturer, etc.).
      </p>

      <div class="form-group">
        <Button variant="secondary" onClick={handleFetchTechnion} loading={isFetchingTechnion}>
          Fetch Course Data
        </Button>
      </div>

      {technionStatus && (
        <div class="form-group">
          <p class="settings-status">{technionStatus}</p>
        </div>
      )}
    </div>
  );
}
