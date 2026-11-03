export const useStudentActivity = () => {
    const authCookie = useCookie<any>('auth_user')
    const currentUser = computed(() => authCookie.value || null)
    const studentId = computed(() => currentUser.value?.student_id || '')
    const isStudent = computed(() => (currentUser.value?.role || '').toLowerCase() === 'student')

    const studentSummary = useState<any>('student_summary_data', () => null)
    const attendedActivities = useState<any[]>('student_attended_activities', () => [])
    const allActivities = useState<any[]>('student_all_activities', () => [])
    const isLoading = useState<boolean>('student_summary_loading', () => false)
    const lastError = useState<string | null>('student_summary_error', () => null)

    const fetchSummary = async (targetStudentId?: string, force = false) => {
        const id = targetStudentId || studentId.value
        if (!id) {
            studentSummary.value = null
            attendedActivities.value = []
            allActivities.value = []
            return
        }

        if (studentSummary.value && studentSummary.value.student?.student_id === id && !force) {
            return
        }

        isLoading.value = true
        lastError.value = null

        try {
            const res = await $fetch<any>(`/api/student/summary?student_id=${encodeURIComponent(id)}`)
            if (res.success) {
                studentSummary.value = res
                attendedActivities.value = res.attended_activities || []
                allActivities.value = res.all_activities || []

                // Update auth_user cookie if accumulated_hours changed
                if (authCookie.value && authCookie.value.student_id === id) {
                    authCookie.value = {
                        ...authCookie.value,
                        accumulated_hours: res.summary?.total_hours ?? authCookie.value.accumulated_hours
                    }
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch student activity summary:', err)
            lastError.value = err.data?.statusMessage || err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลชั่วโมงกิจกรรม'
        } finally {
            isLoading.value = false
        }
    }

    const refreshSummary = async () => {
        await fetchSummary(studentId.value, true)
    }

    return {
        currentUser,
        studentId,
        isStudent,
        studentSummary,
        attendedActivities,
        allActivities,
        isLoading,
        lastError,
        fetchSummary,
        refreshSummary
    }
}
