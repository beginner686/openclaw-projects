export function createDashboardService({ getModuleName, reportService, dataRepository, taskService }) {
  function nowIso(hoursAgo = 0) {
    return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
  }

  async function buildForUser(user) {
    const openedModules = user.enabledModules
    const recentTaskRows = await dataRepository.listRecentTasksForUser(user.id, openedModules, 8)
    const recentTasks = recentTaskRows.map((task) => taskService.toClientTask(task, user.id))

    const reports = recentTasks
      .filter((task) => task.reportUrl)
      .slice(0, 6)
      .map((task, index) => ({
        id: `report-${index + 1}`,
        title: `${getModuleName(task.moduleKey)}报告`,
        createdAt: task.updatedAt,
        format: reportService.inferReportFormat(task.reportUrl),
        url: task.reportUrl,
      }))

    return {
      openedModules,
      recentTasks,
      reports,
      notifications: [
        { id: 'notice-1', title: '任务执行引擎已启用，支持队列异步处理。', level: 'success', createdAt: nowIso(2) },
        { id: 'notice-2', title: '建议为高频业务配置标准输入模板。', level: 'info', createdAt: nowIso(8) },
        { id: 'notice-3', title: '本地数据库请按周期备份，避免数据丢失。', level: 'warning', createdAt: nowIso(20) },
      ],
    }
  }

  return {
    buildForUser,
  }
}
