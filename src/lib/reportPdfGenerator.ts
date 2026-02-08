import type { HomeReportData, ReportCapitalSystem } from '@/hooks/useHomeReport';
import { getConfidenceLabel } from '@/hooks/useHomeReport';
import { format, parseISO } from 'date-fns';

/**
 * Generate a self-contained HTML document from the same data structure
 * used by the on-screen report. This prevents PDF/screen drift because
 * both render from identical data.
 *
 * The output is a printable, styled HTML file with no UI chrome.
 */
export function generateHomeReportHtml(report: HomeReportData): string {
  const { property, assets, openIssues, resolvedHistory, replacements, deferredRecommendations, capitalOutlook, coverage } = report;

  const fullAddress = property
    ? `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`
    : 'Address not available';

  const reportDate = new Date().toLocaleDateString();

  const fmt = (iso: string) => {
    try {
      return format(parseISO(iso), 'MMM d, yyyy');
    } catch {
      return iso;
    }
  };

  // ─── Render sections ────────────────────────────────────────────────────

  const propertySection = property
    ? `
    <div class="section">
      <div class="section-title">Property Overview</div>
      <table class="field-table">
        <tr><td class="label">Address</td><td>${fullAddress}</td></tr>
        <tr><td class="label">Year built</td><td>${property.yearBuilt ?? 'Not available'}</td></tr>
        <tr><td class="label">Square footage</td><td>${property.squareFeet ? property.squareFeet.toLocaleString() + ' sq ft' : 'Not available'}</td></tr>
        <tr><td class="label">Bedrooms</td><td>${property.bedrooms ?? 'Not available'}</td></tr>
        <tr><td class="label">Bathrooms</td><td>${property.bathrooms ?? 'Not available'}</td></tr>
      </table>
    </div>`
    : '';

  const assetRows = (items: typeof assets.coreSystems) =>
    items
      .map(
        (a) => `
        <tr>
          <td><strong>${a.kind}</strong></td>
          <td>${[a.manufacturer, a.model].filter(Boolean).join(' · ') || (a.isSupplemental ? 'Estimated from public data' : '—')}</td>
          <td>${a.installDate ? format(parseISO(a.installDate), 'yyyy') : '—'}</td>
          <td class="badge">${getConfidenceLabel(a.confidence)}</td>
        </tr>`
      )
      .join('');

  const assetSection = `
    <div class="section">
      <div class="section-title">Asset Inventory</div>
      <h4>Core Systems</h4>
      ${
        assets.coreSystems.length > 0
          ? `<table class="data-table">
              <thead><tr><th>System</th><th>Details</th><th>Install</th><th>Confidence</th></tr></thead>
              <tbody>${assetRows(assets.coreSystems)}</tbody>
            </table>`
          : '<p class="empty">No core systems documented yet.</p>'
      }
      <h4>Appliances</h4>
      ${
        assets.appliances.length > 0
          ? `<table class="data-table">
              <thead><tr><th>Appliance</th><th>Details</th><th>Install</th><th>Confidence</th></tr></thead>
              <tbody>${assetRows(assets.appliances)}</tbody>
            </table>`
          : '<p class="empty">No appliances documented yet.</p>'
      }
    </div>`;

  // ─── Capital Outlook section ──────────────────────────────────────────────

  const capitalOutlookSection = buildCapitalOutlookHtml(capitalOutlook);

  const issuesSection =
    openIssues.length > 0
      ? `
    <div class="section">
      <div class="section-title">Open Issues</div>
      ${openIssues
        .map(
          (i) => `
        <div class="card">
          ${i.assetKind ? `<div class="meta">${i.assetKind}</div>` : ''}
          <div class="card-title">${i.title}</div>
          <div class="meta">Reported: ${fmt(i.createdAt)} · Severity: ${i.severity} · Status: ${i.status}</div>
          ${i.linkedRecommendation ? `<div class="note">Recommended: ${i.linkedRecommendation.title}</div>` : ''}
        </div>`
        )
        .join('')}
    </div>`
      : '';

  // Group resolved items by asset
  const resolvedGroups = new Map<string, typeof resolvedHistory>();
  for (const item of resolvedHistory) {
    const key = item.issue.assetKind ?? 'General';
    const g = resolvedGroups.get(key) ?? [];
    g.push(item);
    resolvedGroups.set(key, g);
  }

  const resolvedSection = `
    <div class="section">
      <div class="section-title">Resolved Issues & Work History</div>
      ${
        resolvedHistory.length === 0
          ? '<p class="empty">No resolved issues yet.</p>'
          : Array.from(resolvedGroups.entries())
              .map(
                ([kind, items]) => `
              <h4>${kind}</h4>
              ${items
                .map(
                  (item) => `
                <div class="card">
                  <div class="card-title">${item.issue.title}</div>
                  <div class="meta">
                    Reported: ${fmt(item.issue.createdAt)}
                    ${item.resolvedAt ? ` · Resolved: ${fmt(item.resolvedAt)}` : ''}
                    ${item.resolution ? ` · Outcome: ${item.resolution.title}` : ''}
                    ${item.issue.costActual || item.resolution?.costActual ? ` · Cost: $${(item.issue.costActual ?? item.resolution?.costActual ?? 0).toLocaleString()}` : ''}
                  </div>
                </div>`
                )
                .join('')}`
              )
              .join('')
      }
    </div>`;

  const replacementsSection = `
    <div class="section">
      <div class="section-title">Replacements & Major Work</div>
      ${
        replacements.length === 0
          ? '<p class="empty">No replacements recorded.</p>'
          : replacements
              .map(
                (r) => `
            <div class="card">
              ${r.assetKind ? `<div class="meta">${r.assetKind}</div>` : ''}
              <div class="card-title">${r.title}</div>
              <div class="meta">Date: ${fmt(r.createdAt)} · Source: ${r.source}${r.costActual ? ` · Cost: $${r.costActual.toLocaleString()}` : ''}</div>
            </div>`
              )
              .join('')
      }
    </div>`;

  const deferredSection = `
    <div class="section">
      <div class="section-title">Deferred Recommendations</div>
      ${
        deferredRecommendations.length === 0
          ? '<p class="empty">No deferred recommendations.</p>'
          : deferredRecommendations
              .map(
                (d) => `
            <div class="card">
              ${d.assetKind ? `<div class="meta">${d.assetKind}</div>` : ''}
              <div class="card-title">${d.title}</div>
              <div class="meta">Noted: ${fmt(d.createdAt)}${d.description ? ` · ${d.description}` : ''}</div>
            </div>`
              )
              .join('')
      }
    </div>`;

  const confidenceLabel =
    coverage.avgConfidence >= 75
      ? 'High'
      : coverage.avgConfidence >= 50
        ? 'Medium'
        : coverage.avgConfidence > 0
          ? 'Low'
          : '—';

  const coverageSection = `
    <div class="section">
      <div class="section-title">Confidence & Coverage Summary</div>
      <div class="metric-grid">
        <div class="metric"><div class="metric-value">${coverage.assetCount}</div><div class="metric-label">Assets documented</div></div>
        <div class="metric"><div class="metric-value">${coverage.issueCount}</div><div class="metric-label">Issues logged</div></div>
        <div class="metric"><div class="metric-value">${coverage.repairCount}</div><div class="metric-label">Repairs recorded</div></div>
        <div class="metric"><div class="metric-value">${confidenceLabel}</div><div class="metric-label">Overall confidence</div></div>
      </div>
      <p class="meta" style="text-align:center;margin-top:12px;">${coverage.verifiedPct}% verified · ${coverage.estimatedPct}% estimated</p>
      <p class="disclaimer">Some records are estimated or inferred. Confidence increases as systems are verified through photos, permits, or professional work.</p>
    </div>`;

  // ─── Full document ────────────────────────────────────────────────────────

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Home Report — ${fullAddress}</title>
  <style>
    body { font-family: 'IBM Plex Sans', -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 760px; margin: 0 auto; padding: 24px; }
    .header { border-bottom: 2px solid #0C3629; padding-bottom: 16px; margin-bottom: 32px; }
    .header h1 { font-family: 'IBM Plex Serif', Georgia, serif; font-size: 24px; margin: 0 0 4px; color: #0C3629; }
    .header p { font-size: 14px; color: #666; margin: 2px 0; }
    .section { margin: 28px 0; }
    .section-title { font-family: 'IBM Plex Serif', Georgia, serif; font-size: 17px; font-weight: 500; color: #0C3629; border-left: 3px solid #0C3629; padding-left: 10px; margin-bottom: 12px; }
    h4 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin: 16px 0 8px; }
    .field-table { width: 100%; border-collapse: collapse; }
    .field-table td { padding: 6px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    .field-table .label { color: #666; width: 140px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { text-align: left; padding: 6px 8px; background: #f5f5f3; border-bottom: 1px solid #ddd; font-weight: 500; }
    .data-table td { padding: 6px 8px; border-bottom: 1px solid #eee; }
    .badge { font-size: 11px; color: #666; }
    .card { background: #fafaf8; border: 1px solid #eee; border-radius: 6px; padding: 12px; margin: 8px 0; }
    .card-title { font-size: 14px; font-weight: 500; }
    .meta { font-size: 12px; color: #888; margin-top: 2px; }
    .note { font-size: 12px; background: #f0f0ee; padding: 6px 8px; border-radius: 4px; margin-top: 6px; }
    .empty { font-size: 13px; color: #999; font-style: italic; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .metric { text-align: center; background: #fafaf8; border: 1px solid #eee; border-radius: 6px; padding: 12px; }
    .metric-value { font-size: 20px; font-weight: 600; color: #0C3629; }
    .metric-label { font-size: 11px; color: #888; margin-top: 4px; }
    .disclaimer { font-size: 12px; color: #999; text-align: center; margin-top: 12px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #aaa; text-align: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Home Report</h1>
    <p>${fullAddress}${property?.yearBuilt ? ` · Built ${property.yearBuilt}` : ''}</p>
    <p>A running record of the systems, appliances, issues, and work associated with this property.</p>
  </div>

  ${propertySection}
  ${assetSection}
  ${capitalOutlookSection}
  ${issuesSection}
  ${resolvedSection}
  ${replacementsSection}
  ${deferredSection}
  ${coverageSection}

  <div class="footer">
    <p>Habitta Home Report · Generated ${reportDate}</p>
    <p>This report reflects data known to Habitta at time of generation.</p>
  </div>
</body>
</html>`;
}

// ─── Capital Outlook HTML builder ───────────────────────────────────────────

function buildCapitalOutlookHtml(systems: ReportCapitalSystem[]): string {
  const disclaimer = `<p class="meta" style="margin-bottom:12px;">Projections are estimates, not guarantees. They update as new information is added.</p>`;

  if (systems.length === 0) {
    return `
    <div class="section">
      <div class="section-title">Capital Outlook</div>
      <p class="meta" style="margin-bottom:8px;">Forward-looking planning based on system age, climate, and typical lifespans.</p>
      ${disclaimer}
      <p class="empty">No lifecycle projections available yet. As system details are added, capital planning estimates will appear here.</p>
    </div>`;
  }

  const systemCards = systems
    .map(
      (s) => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div class="card-title">${s.systemLabel}</div>
          <span class="badge">${s.installSourceLabel}</span>
        </div>
        <div class="meta" style="margin-top:4px;">
          Installed: ${s.installYear ?? 'Install year not documented'} · ${s.lifecycleStageLabel}
        </div>
        <div style="font-size:13px;margin-top:6px;">
          <div>Projected window: ${s.windowDisplay}</div>
          <div>${s.planningGuidance}</div>
          <div class="meta">Climate: ${s.climateNote}</div>
        </div>
        <div class="meta" style="margin-top:6px;padding-top:6px;border-top:1px solid #eee;">
          Confidence: ${s.confidenceDetail}
        </div>
      </div>`
    )
    .join('');

  const summaryTable =
    systems.length >= 2
      ? `
      <table class="data-table" style="margin-top:16px;">
        <thead>
          <tr>
            <th>System</th>
            <th>Status</th>
            <th>Projected Window</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          ${systems
            .map(
              (s) => `
            <tr>
              <td>${s.systemLabel}</td>
              <td>${s.lifecycleStageLabel}</td>
              <td>${s.windowDisplay}</td>
              <td>${s.confidenceLabel}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
      : '';

  return `
    <div class="section">
      <div class="section-title">Capital Outlook</div>
      <p class="meta" style="margin-bottom:8px;">Forward-looking planning based on system age, climate, and typical lifespans.</p>
      ${disclaimer}
      ${systemCards}
      ${summaryTable}
    </div>`;
}
