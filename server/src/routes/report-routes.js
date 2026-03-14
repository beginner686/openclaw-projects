import { Router } from 'express'
import { basename } from 'node:path'
import { existsSync } from 'node:fs'

export function createReportRoutes({ reportService, taskService, securityService }) {
  const router = Router()

  router.get('/:fileName', async (req, res) => {
    const fileName = basename(String(req.params.fileName ?? ''))
    const reportPath = reportService.resolveReportFilePath(fileName)
    if (!existsSync(reportPath)) {
      res.status(404).json({ code: 'REPORT_FILE_NOT_FOUND', message: 'Report file not found.' })
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
        res.status(401).json({ code: 'REPORT_AUTH_INVALID', message: 'Invalid report authorization.' })
        return
      }
    } else {
      const reportAccess = typeof req.query.access === 'string' ? req.query.access : ''
      if (!reportAccess) {
        res.status(401).json({ code: 'REPORT_AUTH_REQUIRED', message: 'Login required for report access.' })
        return
      }
      try {
        const payload = reportService.verifyAccessToken(reportAccess)
        if (payload.scope !== 'report') {
          res.status(401).json({ code: 'REPORT_AUTH_INVALID', message: 'Invalid report authorization.' })
          return
        }
        requesterUserId = String(payload.sub ?? '')
        scopedTaskId = String(payload.taskId ?? '')
      } catch {
        res.status(401).json({ code: 'REPORT_AUTH_EXPIRED', message: 'Report link expired. Please refresh and retry.' })
        return
      }
    }

    const task = await taskService.findTaskByReportFile(fileName)
    if (!task) {
      res.status(404).json({ code: 'REPORT_RECORD_NOT_FOUND', message: 'Report record not found.' })
      return
    }

    const permission = await taskService.canUserAccessTaskReport(task, requesterUserId)
    if (!permission.ok) {
      res.status(permission.status ?? 403).json({
        code: permission.code ?? 'REPORT_FORBIDDEN',
        message: permission.message ?? 'No permission to access this report.',
      })
      return
    }

    if (scopedTaskId && scopedTaskId !== task.taskId) {
      res.status(403).json({ code: 'REPORT_SCOPE_MISMATCH', message: 'Report token does not match task scope.' })
      return
    }

    res.sendFile(reportPath)
  })

  return router
}
