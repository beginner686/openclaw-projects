import { Router } from 'express'
import { basename } from 'node:path'
import { existsSync } from 'node:fs'

export function createReportRoutes({ reportService, taskService, securityService }) {
  const router = Router()

  router.get('/:fileName', async (req, res) => {
    const fileName = basename(String(req.params.fileName ?? ''))
    const reportPath = reportService.resolveReportFilePath(fileName)
    if (!existsSync(reportPath)) {
      res.status(404).json({ code: 'REPORT_FILE_NOT_FOUND', message: '报告不存在。' })
      return
    }

    let requesterUserId = ''
    let scopedTaskId = ''
    const bearer = req.headers.authorization

    if (bearer?.startsWith('Bearer ')) {
      try {
        const payload = securityService.verifyAuthToken(bearer.slice(7))
        requesterUserId = String(payload.sub ?? '')
      } catch {
        res.status(401).json({ code: 'REPORT_AUTH_INVALID', message: '报告访问授权无效。' })
        return
      }
    } else {
      const reportAccess = typeof req.query.access === 'string' ? req.query.access : ''
      if (!reportAccess) {
        res.status(401).json({ code: 'REPORT_AUTH_REQUIRED', message: '请先登录后访问报告。' })
        return
      }
      try {
        const payload = reportService.verifyAccessToken(reportAccess)
        if (payload.scope !== 'report') {
          res.status(401).json({ code: 'REPORT_AUTH_INVALID', message: '报告访问授权无效。' })
          return
        }
        requesterUserId = String(payload.sub ?? '')
        scopedTaskId = String(payload.taskId ?? '')
      } catch {
        res.status(401).json({ code: 'REPORT_AUTH_EXPIRED', message: '报告访问链接已过期，请刷新后重试。' })
        return
      }
    }

    const task = await taskService.findTaskByReportFile(fileName)
    if (!task) {
      res.status(404).json({ code: 'REPORT_RECORD_NOT_FOUND', message: '报告记录不存在。' })
      return
    }
    if (task.ownerId !== requesterUserId) {
      res.status(403).json({ code: 'REPORT_FORBIDDEN', message: '无权访问该报告。' })
      return
    }
    if (scopedTaskId && scopedTaskId !== task.taskId) {
      res.status(403).json({ code: 'REPORT_SCOPE_MISMATCH', message: '报告授权与任务不匹配。' })
      return
    }

    res.sendFile(reportPath)
  })

  return router
}
