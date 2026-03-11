import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { moduleCatalog } from '@/config/modules'
import type { ModuleCategory } from '@/types/domain'
import { useAuthStore } from './auth'

type FilterCategory = 'all' | ModuleCategory

export const useModuleStore = defineStore('module', () => {
  const category = ref<FilterCategory>('all')
  const searchText = ref('')
  const auth = useAuthStore()

  const allModules = computed(() => moduleCatalog)

  const enabledModules = computed(() => {
    const enabled = new Set(auth.user?.enabledModules ?? moduleCatalog.map((item) => item.moduleKey))
    return moduleCatalog.filter((module) => enabled.has(module.moduleKey))
  })

  const filteredModules = computed(() => {
    const keyword = searchText.value.trim().toLowerCase()
    return enabledModules.value.filter((module) => {
      const byCategory = category.value === 'all' || module.category === category.value
      const byKeyword = !keyword || module.name.toLowerCase().includes(keyword)
      return byCategory && byKeyword
    })
  })

  function setCategory(nextCategory: FilterCategory) {
    category.value = nextCategory
  }

  function setSearchText(keyword: string) {
    searchText.value = keyword
  }

  return {
    category,
    searchText,
    allModules,
    enabledModules,
    filteredModules,
    setCategory,
    setSearchText,
  }
})
