/**
 * Fetch Data tab in the settings modal.
 *
 * Features:
 * - ICS URL input with "Import" button (single mode)
 * - Batch import toggle + semester range selectors
 * - Technion course catalog enrichment
 * - Progress indicators and toast notifications
 */

import { useCallback, useState } from 'preact/hooks';

import { Button } from '@/components/ui';
import { useToast } from '@/components/toast/ToastContext';
import { useImportExport } from '@/hooks/useImportExport';
import { ToastType } from '@/types';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FetchDataTab() {
  const { showToast } = useToast();
  const {
    isImporting,
    importProgress,
    isFetchingCatalog,
    catalogProgress,
    importSingleICS,
    importBatchICS,
    fetchTechnionCatalog,
  } = useImportExport();

  const [icsUrl, setIcsUrl] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [batchStartSemester, setBatchStartSemester] = useState('winter');
  const [batchStartYear, setBatchStartYear] = useState('');
  const [batchEndSemester, setBatchEndSemester] = useState('winter');
  const [batchEndYear, setBatchEndYear] = useState('');
  const [importStatus, setImportStatus] = useState('');

  const [technionStatus, setTechnionStatus] = useState('');

  const handleFetchSchedule = useCallback(async () => {
    const trimmedUrl = icsUrl.trim();
    if (!trimmedUrl && !batchMode) {
      setImportStatus('Please enter an ICS URL.');
      return;
    }

    setImportStatus('');

    try {
      if (batchMode) {
        const startYearNum = parseInt(batchStartYear, 10);
        const endYearNum = parseInt(batchEndYear, 10);

        if (!startYearNum || !endYearNum) {
          setImportStatus('Please enter valid start and end years.');
          return;
        }
        if (!trimmedUrl) {
          setImportStatus('Please enter a base ICS URL for batch import.');
          return;
        }

        const results = await importBatchICS(
          trimmedUrl,
          batchStartSemester,
          startYearNum,
          batchEndSemester,
          endYearNum,
        );

        const succeeded = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        if (succeeded.length > 0) {
          const totalCourses = succeeded.reduce(
            (sum, r) => sum + (r.count ?? 0),
            0,
          );
          showToast(
            `Imported ${String(succeeded.length)} semester(s) with ${String(totalCourses)} courses`,
            ToastType.Success,
          );
        }
        if (failed.length > 0) {
          showToast(
            `${String(failed.length)} semester(s) failed to import`,
            ToastType.Warning,
            { description: failed.map((r) => r.error).join('; ') },
          );
        }

        setImportStatus(
          `Batch complete: ${String(succeeded.length)} succeeded, ${String(failed.length)} failed.`,
        );
      } else {
        const result = await importSingleICS(trimmedUrl);
        showToast(
          `Imported "${result.semesterName}" with ${String(result.count)} courses`,
          ToastType.Success,
        );
        setImportStatus(
          `Imported "${result.semesterName}" — ${String(result.count)} courses.`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setImportStatus(`Error: ${message}`);
      showToast('Import failed', ToastType.Error, { description: message });
    }
  }, [
    icsUrl,
    batchMode,
    batchStartSemester,
    batchStartYear,
    batchEndSemester,
    batchEndYear,
    importSingleICS,
    importBatchICS,
    showToast,
  ]);

  const handleFetchTechnion = useCallback(async () => {
    setTechnionStatus('');

    try {
      const { updatedCount, catalogSize } = await fetchTechnionCatalog();

      if (updatedCount > 0) {
        showToast(
          `Enriched ${String(updatedCount)} course(s) from catalog (${String(catalogSize)} entries)`,
          ToastType.Success,
        );
        setTechnionStatus(
          `Updated ${String(updatedCount)} course(s) from ${String(catalogSize)} catalog entries.`,
        );
      } else {
        showToast('No courses needed updating', ToastType.Info);
        setTechnionStatus(
          `Catalog fetched (${String(catalogSize)} entries) — no courses needed updating.`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setTechnionStatus(`Error: ${message}`);
      showToast('Catalog fetch failed', ToastType.Error, {
        description: message,
      });
    }
  }, [fetchTechnionCatalog, showToast]);

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
        <Button variant="primary" onClick={handleFetchSchedule} loading={isImporting}>
          Fetch Schedule
        </Button>
      </div>

      {(importProgress || importStatus) && (
        <div class="form-group">
          <p class="settings-status">{importProgress || importStatus}</p>
        </div>
      )}

      <hr class="settings-divider" />

      {/* Course Catalog (Technion) */}
      <h4 class="settings-subsection-title">Course Catalog (Technion)</h4>
      <p class="settings-description">
        Fetch the latest course catalog to enrich course details (name, lecturer, etc.).
      </p>

      <div class="form-group">
        <Button variant="secondary" onClick={handleFetchTechnion} loading={isFetchingCatalog}>
          Fetch Course Data
        </Button>
      </div>

      {(catalogProgress || technionStatus) && (
        <div class="form-group">
          <p class="settings-status">{catalogProgress || technionStatus}</p>
        </div>
      )}
    </div>
  );
}
