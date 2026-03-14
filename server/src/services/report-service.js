import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

export function createReportService({
  paths,
  getModuleName,
  getModuleRule,
  moduleLogicService,
  securityService,
  dataRepository,
}) {
  function escapeHtml(input = '') {
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function inferReportFormat(url) {
    if (!url) return 'html'
    const cleanUrl = url.split('?')[0]
    const ext = cleanUrl.split('.').pop()?.toLowerCase() ?? 'html'
    if (ext === 'pdf' || ext === 'xlsx' || ext === 'docx' || ext === 'txt' || ext === 'html') {
      return ext
    }
    return 'html'
  }

  function extractKeywords(text) {
    return [...new Set(String(text ?? '').replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter((item) => item.length > 1))]
      .slice(0, 8)
  }

  function normalizeArray(value, fallback = []) {
    if (!Array.isArray(value)) return [...fallback]
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean).slice(0, 100))]
  }

  async function resolveModuleRule(moduleKey, tenantId = 't-platform') {
    const baseRule = getModuleRule(moduleKey) ?? {
      focusChecks: [],
      riskSignals: [],
      failSignals: [],
      nextActions: [],
    }

    try {
      const settings = await dataRepository?.findModuleSettings?.(moduleKey, tenantId)
      const override = settings?.config?.rule
      return {
        focusChecks: normalizeArray(override?.focusChecks, baseRule.focusChecks),
        riskSignals: normalizeArray(override?.riskSignals, baseRule.riskSignals),
        failSignals: normalizeArray(override?.failSignals, baseRule.failSignals),
        nextActions: normalizeArray(override?.nextActions, baseRule.nextActions),
      }
    } catch {
      return {
        focusChecks: normalizeArray(baseRule.focusChecks, []),
        riskSignals: normalizeArray(baseRule.riskSignals, []),
        failSignals: normalizeArray(baseRule.failSignals, []),
        nextActions: normalizeArray(baseRule.nextActions, []),
      }
    }
  }

  async function buildTaskInsights(task) {
    const moduleName = getModuleName(task.moduleKey)
    const moduleRule = await resolveModuleRule(task.moduleKey, task.tenantId)
    const keywords = extractKeywords(task.inputText)
    const textLength = String(task.inputText ?? '').length
    const attachmentCount = Array.isArray(task.attachments) ? task.attachments.length : 0
    const hasRiskSignal = moduleRule.riskSignals.some((item) =>
      String(task.inputText ?? '').toLowerCase().includes(String(item).toLowerCase()),
    )
    const confidence = Math.min(99, 64 + Math.floor(textLength / 20) + attachmentCount * 3 + moduleRule.focusChecks.length)
    const priority = hasRiskSignal ? 'high' : textLength > 120 ? 'medium' : 'normal'
    const moduleResult = moduleLogicService?.analyzeTask?.(task) ?? null

    return {
      moduleName,
      moduleRule,
      keywords,
      priority: moduleResult?.priority ?? priority,
      confidence: Math.max(confidence, moduleResult?.score ?? 0),
      nextActions: [
        ...(moduleResult?.recommendations ?? []),
        ...moduleRule.nextActions,
        'Sync this result to customer center and continue iterative optimization.',
      ].slice(0, 6),
      summary:
        moduleResult?.summary ??
        `${moduleName} scenario \"${task.scenario}\" completed with ${keywords.length} keyword(s), priority ${priority}.`,
      moduleResult,
    }
  }

  function renderReportHtml(task, insight) {
    const keywordsHtml =
      insight.keywords.length > 0
        ? insight.keywords.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>No obvious keyword extracted. Please provide more specific input.</li>'
    const actionsHtml = insight.nextActions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    const focusChecksHtml = insight.moduleRule.focusChecks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    const riskSignalsHtml = insight.moduleRule.riskSignals.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    const attachmentsHtml =
      task.attachments.length > 0
        ? task.attachments.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>No attachments.</li>'
    const metricRows =
      insight.moduleResult?.metricCards?.length > 0
        ? insight.moduleResult.metricCards
            .map((item) => {
              const unit = item.unit ? ` ${escapeHtml(item.unit)}` : ''
              return `<tr><td>${escapeHtml(item.label ?? item.key)}</td><td>${escapeHtml(item.value)}</td><td>${unit}</td></tr>`
            })
            .join('')
        : '<tr><td colspan="3">No module metrics generated.</td></tr>'
    const findingsHtml =
      insight.moduleResult?.findings?.length > 0
        ? insight.moduleResult.findings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>No explicit findings.</li>'
    const riskLevel = insight.moduleResult?.riskLevel ?? 'unknown'
    const score = insight.moduleResult?.score ?? '-'

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(insight.moduleName)} - Task Report</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; padding: 24px; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; background: #f5f7fb; color: #12284a; }
    .page { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #dbe4f0; border-radius: 14px; padding: 22px; box-shadow: 0 14px 34px rgba(18, 40, 74, 0.08); }
    h1, h2 { margin: 0 0 12px; }
    .meta { display: grid; gap: 6px; margin-bottom: 16px; color: #5b6f92; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #e8f0ff; color: #0f4fd1; font-size: 12px; margin-right: 6px; }
    section { margin-top: 18px; }
    p { line-height: 1.7; margin: 8px 0; }
    ul { margin: 8px 0; }
    code { background: #f0f4fa; padding: 2px 6px; border-radius: 6px; }
  </style>
</head>
<body>
  <article class="page">
    <h1>${escapeHtml(insight.moduleName)} - Automation Task Report</h1>
    <div class="meta">
      <div><span class="badge">Task ID</span><code>${escapeHtml(task.taskId)}</code></div>
      <div><span class="badge">Scenario</span>${escapeHtml(task.scenario)}</div>
      <div><span class="badge">Updated At</span>${escapeHtml(task.updatedAt)}</div>
      <div><span class="badge">Confidence</span>${insight.confidence}%</div>
      <div><span class="badge">Priority</span>${escapeHtml(insight.priority)}</div>
    </div>

    <section>
      <h2>Summary</h2>
      <p>${escapeHtml(insight.summary)}</p>
    </section>

    <section>
      <h2>Module Assessment</h2>
      <p><span class="badge">Risk Level</span>${escapeHtml(riskLevel)} &nbsp; <span class="badge">Score</span>${escapeHtml(score)}</p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr><th style="text-align:left;border-bottom:1px solid #dbe4f0;padding:6px 0">Metric</th><th style="text-align:left;border-bottom:1px solid #dbe4f0;padding:6px 0">Value</th><th style="text-align:left;border-bottom:1px solid #dbe4f0;padding:6px 0">Unit</th></tr>
        </thead>
        <tbody>${metricRows}</tbody>
      </table>
      <h3>Findings</h3>
      <ul>${findingsHtml}</ul>
    </section>

    <section>
      <h2>Focus Checks</h2>
      <ul>${focusChecksHtml}</ul>
    </section>

    <section>
      <h2>Input Content</h2>
      <p>${escapeHtml(task.inputText)}</p>
    </section>

    <section>
      <h2>Attachments</h2>
      <ul>${attachmentsHtml}</ul>
    </section>

    <section>
      <h2>Extracted Keywords</h2>
      <ul>${keywordsHtml}</ul>
    </section>

    <section>
      <h2>Risk Signals</h2>
      <ul>${riskSignalsHtml}</ul>
    </section>

    <section>
      <h2>Next Actions</h2>
      <ul>${actionsHtml}</ul>
    </section>
  </article>
</body>
</html>`
  }

  async function ensureTaskReport(task) {
    if (task.status !== 'completed') {
      return false
    }

    const reportFileName = `${task.taskId}.html`
    const reportFsPath = path.join(paths.reportsDir, reportFileName)
    const expectedReportUrl = `/reports/${reportFileName}`
    if (task.reportUrl === expectedReportUrl && existsSync(reportFsPath)) {
      return false
    }

    const insight = await buildTaskInsights(task)
    const html = renderReportHtml(task, insight)
    await writeFile(reportFsPath, html, 'utf8')
    task.summary = insight.summary
    task.reportUrl = expectedReportUrl
    task.reportFormat = 'html'
    task.errorMessage = undefined
    return true
  }

  function buildAuthorizedReportUrl(task, viewerId) {
    if (!task.reportUrl) {
      return ''
    }
    const token = securityService.signReportAccessToken({
      ownerId: viewerId,
      taskId: task.taskId,
    })
    const separator = task.reportUrl.includes('?') ? '&' : '?'
    return `${task.reportUrl}${separator}access=${encodeURIComponent(token)}`
  }

  function verifyAccessToken(token) {
    return securityService.verifyReportAccessToken(token)
  }

  function resolveReportFilePath(fileName) {
    return path.join(paths.reportsDir, path.basename(fileName))
  }

  return {
    inferReportFormat,
    ensureTaskReport,
    buildAuthorizedReportUrl,
    verifyAccessToken,
    resolveReportFilePath,
  }
}
