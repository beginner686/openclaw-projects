import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

export function createReportService({ paths, getModuleName, getModuleRule, securityService }) {
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
    return [...new Set(text.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter((item) => item.length > 1))].slice(0, 8)
  }

  function buildTaskInsights(task) {
    const moduleName = getModuleName(task.moduleKey)
    const moduleRule = getModuleRule(task.moduleKey)
    const keywords = extractKeywords(task.inputText)
    const textLength = task.inputText.length
    const attachmentCount = Array.isArray(task.attachments) ? task.attachments.length : 0
    const hasRiskSignal = moduleRule.riskSignals.some((item) => task.inputText.toLowerCase().includes(item.toLowerCase()))
    const confidence = Math.min(99, 64 + Math.floor(textLength / 20) + attachmentCount * 3 + moduleRule.focusChecks.length)
    const priority = hasRiskSignal ? '高' : textLength > 120 ? '中' : '常规'

    return {
      moduleName,
      moduleRule,
      keywords,
      priority,
      confidence,
      nextActions: [...moduleRule.nextActions, '将结果同步到客户中心，结合历史任务做持续优化。'].slice(0, 4),
      summary: `${moduleName}场景“${task.scenario}”完成，识别到 ${keywords.length} 个关键词，优先级为${priority}。`,
    }
  }

  function renderReportHtml(task, insight) {
    const keywordsHtml =
      insight.keywords.length > 0
        ? insight.keywords.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>未提取到明显关键词，建议补充更具体输入。</li>'
    const actionsHtml = insight.nextActions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    const focusChecksHtml = insight.moduleRule.focusChecks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    const riskSignalsHtml = insight.moduleRule.riskSignals.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    const attachmentsHtml =
      task.attachments.length > 0
        ? task.attachments.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>无附件</li>'

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(insight.moduleName)} - 任务报告</title>
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
    <h1>${escapeHtml(insight.moduleName)} - 自动化任务报告</h1>
    <div class="meta">
      <div><span class="badge">任务ID</span><code>${escapeHtml(task.taskId)}</code></div>
      <div><span class="badge">执行场景</span>${escapeHtml(task.scenario)}</div>
      <div><span class="badge">更新时间</span>${escapeHtml(task.updatedAt)}</div>
      <div><span class="badge">可信度</span>${insight.confidence}%</div>
      <div><span class="badge">优先级</span>${escapeHtml(insight.priority)}</div>
    </div>

    <section>
      <h2>执行摘要</h2>
      <p>${escapeHtml(insight.summary)}</p>
      <p>系统结合模块专属规则、输入文本特征和附件信息生成本次建议。</p>
    </section>

    <section>
      <h2>模块专项检查维度</h2>
      <ul>${focusChecksHtml}</ul>
    </section>

    <section>
      <h2>输入内容</h2>
      <p>${escapeHtml(task.inputText)}</p>
    </section>

    <section>
      <h2>附件列表</h2>
      <ul>${attachmentsHtml}</ul>
    </section>

    <section>
      <h2>关键词识别</h2>
      <ul>${keywordsHtml}</ul>
    </section>

    <section>
      <h2>风险触发词库</h2>
      <ul>${riskSignalsHtml}</ul>
    </section>

    <section>
      <h2>后续建议</h2>
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

    const insight = buildTaskInsights(task)
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
