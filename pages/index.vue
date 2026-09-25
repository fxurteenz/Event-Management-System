<template>
    <div class="home-container">
        <!-- Navigation Bar: BRU Themed (ม่วง - เหลืองทอง - ขาว) -->
        <AppNavbar />

        <!-- Main Content Layout -->
        <main class="main-layout">
            <!-- Left Column: Calendar Section -->
            <section class="calendar-section card">
                <div class="calendar-header">
                    <div class="month-title">
                        <div class="month-badge-icon">
                            <AppIcon name="calendar" :size="20" class="cal-header-icon" />
                        </div>
                        <h3>{{ monthNamesThai[currentMonth] }} {{ currentYear + 543 }}</h3>
                        <button class="btn-today" @click="goToToday">วันนี้</button>
                    </div>
                    <div class="month-nav">
                        <button class="btn-arrow" @click="prevMonth" title="เดือนก่อนหน้า" aria-label="เดือนก่อนหน้า">
                            <AppIcon name="chevron-left" :size="18" />
                        </button>
                        <button class="btn-arrow" @click="nextMonth" title="เดือนถัดไป" aria-label="เดือนถัดไป">
                            <AppIcon name="chevron-right" :size="18" />
                        </button>
                    </div>
                </div>

                <!-- Category Filter Pills -->
                <div class="filter-bar">
                    <button class="filter-pill" :class="{ active: selectedCategory === '' }"
                        @click="selectedCategory = ''">
                        ทั้งหมด
                    </button>
                    <button v-for="cat in categories" :key="cat.category_id" class="filter-pill"
                        :class="{ active: selectedCategory === cat.category_name }"
                        @click="selectedCategory = cat.category_name">
                        {{ cat.category_name }}
                    </button>
                </div>

                <!-- Calendar Grid -->
                <div class="calendar-grid">
                    <!-- Day of week headers -->
                    <div class="weekday-header" v-for="day in weekDaysThai" :key="day">
                        {{ day }}
                    </div>

                    <!-- Calendar Days -->
                    <div v-for="(cell, idx) in calendarCells" :key="idx" class="day-cell" :class="{
                        'other-month': !cell.isCurrentMonth,
                        'is-today': cell.isToday,
                        'is-selected': isSelectedDate(cell.dateStr),
                        'has-events': cell.events.length > 0
                    }" @click="selectDate(cell.dateStr)">
                        <div class="day-number">{{ cell.day }}</div>

                        <!-- Desktop Event Pills -->
                        <div class="event-dots desktop-events" v-if="cell.events.length > 0">
                            <span v-for="ev in cell.events.slice(0, 2)" :key="ev.activity_id" class="event-pill"
                                :title="ev.title">
                                {{ ev.title }}
                            </span>
                            <span v-if="cell.events.length > 2" class="more-badge">
                                +{{ cell.events.length - 2 }}
                            </span>
                        </div>

                        <!-- Mobile Event Indicator Dots (Clean & No Overflow) -->
                        <div class="mobile-dots" v-if="cell.events.length > 0">
                            <span v-for="(ev, evIdx) in cell.events.slice(0, 3)" :key="'m-' + ev.activity_id"
                                class="mobile-dot" :class="{ 'dot-mandatory': isMandatoryActivity(ev) }"></span>
                            <span v-if="cell.events.length > 3" class="mobile-plus-count">
                                •
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Right Column: Activities for Selected Date or Month -->
            <section class="events-section card" id="events-list-section">
                <div class="events-header">
                    <div>
                        <h3 class="events-heading">
                            {{ selectedDateStr ? 'กิจกรรมวันที่ ' + formatThaiDate(selectedDateStr) :
                                'กิจกรรมในเดือนนี้' }}
                        </h3>
                        <p class="events-subtitle">
                            พบ {{ displayedActivities.length }} กิจกรรม
                        </p>
                    </div>
                    <button v-if="selectedDateStr" class="btn-clear" @click="selectedDateStr = ''">
                        <AppIcon name="arrow-path" :size="13" />
                        <span>ดูทั้งเดือน</span>
                    </button>
                </div>

                <!-- Activity List -->
                <div v-if="displayedActivities.length > 0" class="events-list">
                    <article v-for="act in displayedActivities" :key="act.activity_id" class="event-item">
                        <div class="event-item-top">
                            <span class="category-badge">{{ act.category_name || 'กิจกรรมทั่วไป' }}</span>
                            <span class="hours-tag">
                                <AppIcon name="sparkles" :size="13" class="star-icon" />
                                <span>{{ act.activity_hours }} ชม.</span>
                            </span>
                        </div>

                        <h4 class="event-title">{{ act.title }}</h4>
                        <p v-if="act.description" class="event-desc">{{ act.description }}</p>

                        <div class="event-time">
                            <div class="time-row">
                                <AppIcon name="clock" :size="14" class="time-icon" />
                                <span><strong>เริ่ม:</strong> {{ formatDateTime(act.start_time) }}</span>
                            </div>
                            <div class="time-row">
                                <AppIcon name="clock" :size="14" class="time-icon" />
                                <span><strong>สิ้นสุด:</strong> {{ formatDateTime(act.end_time) }}</span>
                            </div>
                        </div>

                        <!-- เงื่อนไขสิทธิ์และจำนวนรับสมัคร -->
                        <div class="event-scope-box">
                            <div class="scope-row">
                                <span class="label">
                                    <AppIcon name="users" :size="14" class="scope-icon" />
                                    จำนวนรับ:
                                </span>
                                <span class="val">
                                    {{ act.registered_count || 0 }} / {{ act.max_participants ? act.max_participants +
                                        'คน' :
                                        'ไม่จำกัด' }}
                                </span>
                                <span v-if="isActivityFull(act)" class="tag-full">
                                    <AppIcon name="no-symbol" :size="12" />
                                    ที่นั่งเต็มแล้ว
                                </span>
                            </div>
                            <div class="scope-row">
                                <span class="label">
                                    <AppIcon name="target" :size="14" class="scope-icon" />
                                    สิทธิ์เข้าร่วม:
                                </span>
                                <span
                                    v-if="(!act.target_faculties || act.target_faculties.length === 0) && (!act.target_majors || act.target_majors.length === 0)"
                                    class="scope-pill scope-all">
                                    <AppIcon name="globe" :size="12" />
                                    ทุกคณะและสาขา
                                </span>
                                <template v-else>
                                    <span v-for="fac in act.target_faculties" :key="'f-' + fac.faculty_id"
                                        class="scope-pill scope-faculty">
                                        <AppIcon name="building-office" :size="12" />
                                        {{ fac.faculty_name }}
                                    </span>
                                    <span v-for="maj in act.target_majors" :key="'m-' + maj.major_id"
                                        class="scope-pill scope-major">
                                        <AppIcon name="academic-cap" :size="12" />
                                        {{ maj.major_name }}
                                    </span>
                                </template>
                            </div>
                        </div>

                        <!-- Student Action (Register / Status / Ticket) -->
                        <div class="event-item-footer">
                            <span class="qr-info">รหัส: {{ act.qr_code_data }}</span>

                            <ClientOnly>
                                <NuxtLink v-if="!currentUser" to="/login" class="btn-login-to-reg">
                                    <AppIcon name="arrow-left-on-rectangle" :size="14" />
                                    <span>เข้าสู่ระบบเพื่อลงทะเบียน</span>
                                </NuxtLink>

                                <!-- สำหรับนักศึกษา -->
                                <div v-else-if="isStudent" class="student-action-area">
                                    <!-- กรณีลงทะเบียนแล้ว -->
                                    <template v-if="isStudentRegistered(act.activity_id)">
                                        <span class="reg-status-badge" :class="[
                                            'badge-' + getRegistrationStatus(act.activity_id),
                                            { 'badge-attended': isStudentCheckedIn(act.activity_id) }
                                        ]">
                                            <AppIcon
                                                :name="isStudentCheckedIn(act.activity_id) ? 'badge-check' : (isStudentConfirmed(act.activity_id) ? 'check-circle' : 'clock')"
                                                :size="14" />
                                            <span>{{ getRegistrationStatusText(act.activity_id) }}</span>
                                        </span>

                                        <!-- ปุ่ม QR เช็คชื่อ: แสดงให้กดได้เฉพาะเมื่อสถานะเป็น Confirmed แล้วเท่านั้น -->
                                        <button v-if="isStudentConfirmed(act.activity_id)" class="btn-show-ticket"
                                            @click="openTicketModal(act)"
                                            title="เปิดแสดง QR Code สำหรับเช็คชื่อเข้าร่วมกิจกรรม">
                                            <AppIcon :name="isStudentCheckedIn(act.activity_id) ? 'ticket' : 'qr-code'"
                                                :size="14" />
                                            <span>{{ isStudentCheckedIn(act.activity_id) ? 'ตั๋ว/หลักฐาน' :
                                                'QR เช็คชื่อ' }}</span>
                                        </button>
                                        <span v-else class="badge-pending-qr"
                                            title="สโมสรยังไม่ยืนยันสิทธิ์ จึงยังไม่มี QR เช็คชื่อสำหรับกิจกรรมนี้">
                                            <AppIcon name="lock-closed" :size="13" />
                                            <span>รอสโมสรยืนยันสิทธิ์</span>
                                        </span>

                                        <!-- ปุ่มยกเลิก: ยกเลิกได้เฉพาะเมื่อไม่ใช่กิจกรรมบังคับ และยังไม่ได้เช็คชื่อ -->
                                        <button v-if="!isMandatoryActivity(act) && !isStudentCheckedIn(act.activity_id)"
                                            class="btn-cancel-reg" :disabled="actionLoading[act.activity_id]"
                                            @click="handleCancelRegistration(act)">
                                            <AppIcon name="x-circle" :size="14" />
                                            <span>{{ actionLoading[act.activity_id] ? 'กำลังดำเนินการ...' : 'ยกเลิก'
                                            }}</span>
                                        </button>
                                        <span v-else-if="isMandatoryActivity(act)" class="btn-mandatory-locked"
                                            title="กิจกรรมบังคับไม่สามารถยกเลิกการลงทะเบียนได้">
                                            <AppIcon name="lock-closed" :size="13" />
                                            <span>กิจกรรมบังคับ</span>
                                        </span>
                                    </template>

                                    <!-- กรณียังไม่ได้ลงทะเบียน -->
                                    <template v-else>
                                        <button v-if="isActivityFull(act)" class="btn-disabled" disabled>
                                            <AppIcon name="no-symbol" :size="14" />
                                            <span>เต็มแล้ว</span>
                                        </button>
                                        <button v-else-if="!isEligible(act)" class="btn-disabled" disabled
                                            title="กิจกรรมนี้เฉพาะคณะหรือสาขาวิชาที่กำหนด">
                                            <AppIcon name="no-symbol" :size="14" />
                                            <span>สิทธิ์ไม่ตรงคณะ/สาขา</span>
                                        </button>
                                        <button v-else class="btn-register" :disabled="actionLoading[act.activity_id]"
                                            @click="handleRegister(act)">
                                            <AppIcon name="pencil-square" :size="14" />
                                            <span>{{ actionLoading[act.activity_id] ? 'กำลังบันทึก...' :
                                                'ลงทะเบียนเข้าร่วม' }}</span>
                                        </button>
                                    </template>
                                </div>

                                <!-- สำหรับ Org / Club / Admin -->
                                <div v-else class="admin-quick-action">
                                    <NuxtLink to="/activities" class="btn-goto-activities">
                                        <span>ดูผู้ลงทะเบียน</span>
                                        <AppIcon name="chevron-right" :size="14" />
                                    </NuxtLink>
                                </div>

                                <template #fallback>
                                    <div class="action-skeleton"></div>
                                </template>
                            </ClientOnly>
                        </div>
                    </article>
                </div>

                <!-- Skeleton Loading State when fetching activities -->
                <div v-else-if="pendingActivities" class="events-list">
                    <div v-for="i in 3" :key="'skel-' + i" class="event-item skeleton-card">
                        <div class="event-item-top">
                            <div class="skel-pill skel-pill-category"></div>
                            <div class="skel-pill skel-pill-hours"></div>
                        </div>
                        <div class="skel-line skel-title"></div>
                        <div class="skel-line skel-desc"></div>
                        <div class="skel-box skel-time"></div>
                        <div class="skel-box skel-scope"></div>
                        <div class="event-item-footer">
                            <div class="skel-line skel-qr"></div>
                            <div class="skel-btn"></div>
                        </div>
                    </div>
                </div>

                <!-- Empty state -->
                <div v-else class="empty-events">
                    <div class="empty-icon-wrap">
                        <AppIcon name="calendar" :size="44" class="empty-icon" />
                    </div>
                    <h4>ไม่มีกิจกรรมในวันที่เลือก</h4>
                    <p>ลองเลือกวันอื่นบนปฏิทิน หรือเลือกดูทั้งหมด</p>
                </div>
            </section>
        </main>

        <!-- Component: Activity Ticket & Check-in QR Modal for Confirmed Students -->
        <ActivityTicketModal :show="showTicketModal" :activity="currentTicketActivity"
            :student-id="currentUser?.student_id" @close="closeTicketModal" />
    </div>
</template>

<script setup>
import AppNavbar from "~/components/AppNavbar.vue"
import { ref, computed, onMounted, watch } from 'vue'
import ActivityTicketModal from '~/components/activities/ActivityTicketModal.vue'
import AppIcon from '~/components/common/AppIcon.vue'

const authCookie = useCookie('auth_user')
const currentUser = computed(() => authCookie.value || null)
const userRole = computed(() => (currentUser.value?.role || '').toLowerCase())

const isStudent = computed(() => userRole.value === 'student')
const isOrgPresident = computed(() => userRole.value === 'org_president' || userRole.value === 'admin')
const isClubPresident = computed(() => userRole.value === 'club_president')
const isAdmin = computed(() => userRole.value === 'admin')

// Mobile Navigation Drawer Toggle State
const isMobileMenuOpen = ref(false)

const handleLogout = () => {
    authCookie.value = null
    isMobileMenuOpen.value = false
    const router = useRouter()
    router.push('/login')
}

// Fetch Activities
const { data: activitiesRes, pending: pendingActivities, refresh: refreshActivities } = await useFetch('/api/activities')
const allActivities = computed(() => activitiesRes.value?.data || [])

// Fetch Categories
const { data: catRes } = await useFetch('/api/categories')
const categories = computed(() => catRes.value?.data || [])

// Student Registrations State
const myRegistrations = ref([])
const actionLoading = ref({})

const fetchMyRegistrations = async () => {
    if (!isStudent.value || !currentUser.value?.student_id) {
        myRegistrations.value = []
        return
    }
    try {
        const res = await $fetch(`/api/activities/my-registrations?student_id=${currentUser.value.student_id}`)
        myRegistrations.value = res.data || []
    } catch (err) {
        console.error('Failed to fetch my registrations:', err)
    }
}

onMounted(() => {
    if (isStudent.value) {
        fetchMyRegistrations()
    }
})

watch(() => currentUser.value?.student_id, () => {
    if (isStudent.value) {
        fetchMyRegistrations()
    }
})

const myRegistrationsMap = computed(() => {
    const map = {}
    for (const reg of myRegistrations.value) {
        map[reg.activity_id] = reg
    }
    return map
})

const isStudentRegistered = (activityId) => {
    return !!myRegistrationsMap.value[activityId]
}

const getRegistrationStatus = (activityId) => {
    return (myRegistrationsMap.value[activityId]?.status || '').toLowerCase()
}

const isStudentConfirmed = (activityId) => {
    return getRegistrationStatus(activityId) === 'confirmed'
}

const isStudentCheckedIn = (activityId) => {
    return !!myRegistrationsMap.value[activityId]?.check_in_time
}

const getRegistrationStatusText = (activityId) => {
    const reg = myRegistrationsMap.value[activityId]
    if (reg?.check_in_time) {
        return `เข้าร่วมแล้ว (+${reg.activity_hours || 0} ชม.)`
    }
    const status = getRegistrationStatus(activityId)
    if (status === 'confirmed') return 'ยืนยันสิทธิ์แล้ว'
    if (status === 'registered') return 'รอสโมสรยืนยัน'
    return 'ลงทะเบียนแล้ว'
}

// Student Activity Ticket & Check-in QR Modal State
const showTicketModal = ref(false)
const currentTicketActivity = ref(null)

const openTicketModal = (act) => {
    currentTicketActivity.value = act
    showTicketModal.value = true
}

const closeTicketModal = () => {
    showTicketModal.value = false
    currentTicketActivity.value = null
    fetchMyRegistrations()
}

const isMandatoryActivity = (act) => {
    if (!act) return false
    const catName = act.category_name || ''
    return Number(act.category_id) === 1 || catName.includes('บังคับ')
}

const isActivityFull = (act) => {
    if (!act.max_participants || act.max_participants <= 0) return false
    return (act.registered_count || 0) >= act.max_participants
}

const isEligible = (act) => {
    const hasFac = act.target_faculties && act.target_faculties.length > 0
    const hasMaj = act.target_majors && act.target_majors.length > 0
    if (!hasFac && !hasMaj) return true

    const studentFacId = Number(currentUser.value?.faculty_id)
    const studentMajId = Number(currentUser.value?.major_id)

    if (hasMaj) {
        return act.target_majors.some(m => Number(m.major_id) === studentMajId)
    }
    if (hasFac) {
        return act.target_faculties.some(f => Number(f.faculty_id) === studentFacId)
    }
    return true
}

const handleRegister = async (act) => {
    if (!currentUser.value?.student_id) {
        alert('ไม่พบข้อมูลรหัสนักศึกษา กรุณาเข้าสู่ระบบใหม่')
        return
    }

    if (!confirm(`ยืนยันการลงทะเบียนเข้าร่วมกิจกรรม "${act.title}" ใช่หรือไม่?`)) {
        return
    }

    actionLoading.value[act.activity_id] = true
    try {
        await $fetch('/api/activities/register', {
            method: 'POST',
            body: {
                activity_id: act.activity_id,
                student_id: currentUser.value.student_id
            }
        })
        alert(`ลงทะเบียนเข้าร่วมกิจกรรม "${act.title}" สำเร็จ!`)
        await Promise.all([
            fetchMyRegistrations(),
            refreshActivities()
        ])
    } catch (err) {
        alert('ไม่สามารถลงทะเบียนได้: ' + (err.data?.statusMessage || err.message))
    } finally {
        actionLoading.value[act.activity_id] = false
    }
}

const handleCancelRegistration = async (act) => {
    if (!currentUser.value?.student_id) return

    if (!confirm(`คุณต้องการยกเลิกการลงทะเบียนกิจกรรม "${act.title}" ใช่หรือไม่?`)) {
        return
    }

    actionLoading.value[act.activity_id] = true
    try {
        await $fetch('/api/activities/cancel', {
            method: 'POST',
            body: {
                activity_id: act.activity_id,
                student_id: currentUser.value.student_id
            }
        })
        alert('ยกเลิกการลงทะเบียนเรียบร้อยแล้ว')
        await Promise.all([
            fetchMyRegistrations(),
            refreshActivities()
        ])
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการยกเลิก: ' + (err.data?.statusMessage || err.message))
    } finally {
        actionLoading.value[act.activity_id] = false
    }
}

const selectedCategory = ref('')
const selectedDateStr = ref('')

// Timezone constant for consistent SSR and Client rendering (UTC+7)
const TIMEZONE = 'Asia/Bangkok'

const bkkDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
})

// Deterministic helper to format any Date or string into YYYY-MM-DD in Asia/Bangkok
const getBkkDateKey = (dateInput) => {
    if (!dateInput) return ''
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return ''
    return bkkDateKeyFormatter.format(d)
}

// Deterministic helper to extract Bangkok year, month (0-11), and day
const getBkkYearMonth = (dateInput) => {
    const d = dateInput ? (typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput) : new Date()
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    }).formatToParts(d)
    const p = {}
    for (const part of parts) {
        p[part.type] = part.value
    }
    return {
        year: parseInt(p.year, 10),
        month: parseInt(p.month, 10) - 1, // 0 - 11
        day: parseInt(p.day, 10)
    }
}

// Calendar State (Defaults to current Bangkok month)
const initialBkk = getBkkYearMonth(new Date())
const currentYear = ref(initialBkk.year)
const currentMonth = ref(initialBkk.month) // 0 - 11

const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]
const weekDaysThai = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

const prevMonth = () => {
    if (currentMonth.value === 0) {
        currentMonth.value = 11
        currentYear.value--
    } else {
        currentMonth.value--
    }
}

const nextMonth = () => {
    if (currentMonth.value === 11) {
        currentMonth.value = 0
        currentYear.value++
    } else {
        currentMonth.value++
    }
}

const goToToday = () => {
    const nowBkk = getBkkYearMonth(new Date())
    currentYear.value = nowBkk.year
    currentMonth.value = nowBkk.month
    selectedDateStr.value = getBkkDateKey(new Date())
}

// Filtered by Category
const filteredActivities = computed(() => {
    if (!selectedCategory.value) return allActivities.value
    return allActivities.value.filter(a => a.category_name === selectedCategory.value)
})

// Generate Calendar Cells for the current month
const calendarCells = computed(() => {
    const year = currentYear.value
    const month = currentMonth.value

    const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const todayKey = getBkkDateKey(new Date())
    const cells = []

    // Preceding days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i
        const prevMonthVal = month === 0 ? 11 : month - 1
        const prevYearVal = month === 0 ? year - 1 : year
        const key = `${prevYearVal}-${String(prevMonthVal + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        cells.push({
            day: d,
            dateStr: key,
            isCurrentMonth: false,
            isToday: key === todayKey,
            events: []
        })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

        // Find events matching this day (based on start_time in Bangkok timezone)
        const eventsOnDay = filteredActivities.value.filter(act => {
            if (!act.start_time) return false
            return getBkkDateKey(act.start_time) === key
        })

        cells.push({
            day: d,
            dateStr: key,
            isCurrentMonth: true,
            isToday: key === todayKey,
            events: eventsOnDay
        })
    }

    // Trailing days from next month to fill grid (multiple of 7, 42 cells total)
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
        const nextMonthVal = month === 11 ? 0 : month + 1
        const nextYearVal = month === 11 ? year + 1 : year
        const key = `${nextYearVal}-${String(nextMonthVal + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        cells.push({
            day: d,
            dateStr: key,
            isCurrentMonth: false,
            isToday: key === todayKey,
            events: []
        })
    }

    return cells
})

const selectDate = (dateStr) => {
    selectedDateStr.value = (selectedDateStr.value === dateStr) ? '' : dateStr
    // On small screen, automatically scroll down to events list when selecting a date
    if (selectedDateStr.value && typeof window !== 'undefined' && window.innerWidth < 768) {
        setTimeout(() => {
            const el = document.getElementById('events-list-section')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
        }, 100)
    }
}

const isSelectedDate = (dateStr) => selectedDateStr.value === dateStr

// Activities displayed in the right panel
const displayedActivities = computed(() => {
    let list = filteredActivities.value

    if (selectedDateStr.value) {
        return list.filter(act => {
            if (!act.start_time) return false
            return getBkkDateKey(act.start_time) === selectedDateStr.value
        })
    }

    // If no date selected, filter by current displayed month (Bangkok timezone)
    return list.filter(act => {
        if (!act.start_time) return false
        const bkk = getBkkYearMonth(act.start_time)
        return bkk.year === currentYear.value && bkk.month === currentMonth.value
    })
})

const formatThaiDate = (dateStr) => {
    if (!dateStr) return '-'
    const parts = String(dateStr).split('T')[0].split('-')
    if (parts.length === 3) {
        const y = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10) - 1
        const d = parseInt(parts[2], 10)
        return `${d} ${monthNamesThai[m]} ${y + 543}`
    }
    const bkk = getBkkYearMonth(dateStr)
    return `${bkk.day} ${monthNamesThai[bkk.month]} ${bkk.year + 543}`
}

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('th-TH', {
        timeZone: TIMEZONE,
        dateStyle: 'medium',
        timeStyle: 'short'
    })
};
</script>

<style scoped>
.home-container {
    min-height: 100vh;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    background-color: #f8fafc;
    color: #1e293b;
    font-family: var(--font-body, sans-serif);
}

/* ========================================================
   Navbar: BRU Royal Purple & Gold (Always 100% Full Width)
======================================================== */
.navbar {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 2rem;
    background: #ffffff;
    border-bottom: 2px solid var(--bru-gold-400, #facc15);
    box-shadow: 0 2px 10px rgba(107, 33, 168, 0.06);
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
}

.nav-brand-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    gap: 0.75rem;
}

.nav-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
}

.logo-wrapper {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--bru-purple-800, #581c87) 0%, var(--bru-purple-600, #7e22ce) 100%);
    border: 2px solid var(--bru-gold-400, #facc15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-shadow: 0 4px 8px rgba(107, 33, 168, 0.2);
    flex-shrink: 0;
}

.brand-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
}

.brand-title {
    margin: 0;
    font-size: 1.12rem;
    font-weight: 700;
    color: var(--bru-purple-900, #3b0764);
    font-family: var(--font-heading, sans-serif);
    line-height: 1.25;
    word-break: break-word;
    overflow-wrap: break-word;
}

.brand-sub {
    margin: 0.15rem 0 0;
    font-size: 0.78rem;
    color: #64748b;
    font-family: var(--font-body, sans-serif);
    word-break: break-word;
    overflow-wrap: break-word;
}

/* Mobile Hamburger Button */
.mobile-menu-btn {
    display: none;
    background: transparent;
    border: 1px solid #e2e8f0;
    color: var(--bru-purple-800, #581c87);
    padding: 0.45rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
}

.mobile-menu-btn:hover {
    background: var(--bru-purple-50, #faf5ff);
}

.nav-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.btn-nav {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    border-radius: 8px;
    font-size: 0.84rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.15s;
    font-family: var(--font-heading, sans-serif);
}

.btn-org {
    background: var(--bru-purple-100, #f3e8ff);
    color: var(--bru-purple-800, #581c87);
    border: 1px solid var(--bru-purple-200, #e9d5ff);
}

.btn-org:hover {
    background: var(--bru-purple-200, #e9d5ff);
    color: var(--bru-purple-900, #3b0764);
}

.btn-admin {
    background: #f1f5f9;
    color: #334155;
    border: 1px solid #e2e8f0;
}

.btn-admin:hover {
    background: #e2e8f0;
    color: #0f172a;
}

.user-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--bru-purple-50, #faf5ff);
    border: 1px solid var(--bru-purple-200, #e9d5ff);
    padding: 0.38rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.825rem;
    color: var(--bru-purple-900, #3b0764);
}

.user-icon {
    color: var(--bru-purple-700, #6b21a8);
}

.user-name {
    font-weight: 600;
}

.user-role-badge {
    color: #64748b;
    font-size: 0.76rem;
}

.btn-logout {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fca5a5;
    padding: 0.42rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 600;
    transition: background 0.15s;
    font-family: var(--font-body, sans-serif);
}

.btn-logout:hover {
    background: #fecaca;
}

.btn-login {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    background: linear-gradient(135deg, var(--bru-purple-700, #6b21a8) 0%, var(--bru-purple-800, #581c87) 100%);
    color: #ffffff;
    text-decoration: none;
    padding: 0.5rem 1.15rem;
    border-radius: 8px;
    font-size: 0.88rem;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(107, 33, 168, 0.25);
    transition: all 0.2s;
    font-family: var(--font-heading, sans-serif);
}

.btn-login:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(107, 33, 168, 0.35);
}

/* ========================================================
   Main Layout: Responsive Grid
======================================================== */
.main-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 1.5rem;
    padding: 2rem;
    max-width: 1440px;
    width: 100%;
    box-sizing: border-box;
    margin: 0 auto;
}

.calendar-section,
.events-section {
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
}

.card {
    background: #ffffff;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    padding: 1.5rem;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
}

/* ========================================================
   Calendar Section (Left)
======================================================== */
.calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
}

.month-title {
    display: flex;
    align-items: center;
    gap: 0.65rem;
}

.month-badge-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: var(--bru-purple-100, #f3e8ff);
    color: var(--bru-purple-700, #6b21a8);
    display: flex;
    align-items: center;
    justify-content: center;
}

.month-title h3 {
    margin: 0;
    font-size: 1.35rem;
    color: var(--bru-purple-900, #3b0764);
    font-family: var(--font-heading, sans-serif);
    font-weight: 700;
}

.btn-today {
    background: var(--bru-gold-50, #fffbeb);
    border: 1px solid var(--bru-gold-400, #facc15);
    color: var(--bru-gold-700, #a16207);
    padding: 0.25rem 0.65rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    font-family: var(--font-heading, sans-serif);
}

.btn-today:hover {
    background: var(--bru-gold-100, #fef9c3);
}

.month-nav {
    display: flex;
    gap: 0.4rem;
}

.btn-arrow {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: var(--bru-purple-800, #581c87);
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.15s;
}

.btn-arrow:hover {
    background: var(--bru-purple-50, #faf5ff);
    border-color: var(--bru-purple-200, #e9d5ff);
}

/* Filter Bar */
.filter-bar {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.75rem;
    margin-bottom: 1rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
}

.filter-bar::-webkit-scrollbar {
    height: 4px;
}

.filter-bar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}

.filter-pill {
    background: #f1f5f9;
    border: 1px solid transparent;
    padding: 0.4rem 0.85rem;
    border-radius: 9999px;
    font-size: 0.82rem;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
    font-family: var(--font-heading, sans-serif);
}

.filter-pill:hover {
    background: var(--bru-purple-50, #faf5ff);
    color: var(--bru-purple-700, #6b21a8);
}

.filter-pill.active {
    background: var(--bru-purple-700, #6b21a8);
    color: #ffffff;
    font-weight: 600;
    border-color: var(--bru-gold-400, #facc15);
    box-shadow: 0 2px 8px rgba(107, 33, 168, 0.25);
}

/* Calendar Grid */
.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
}

.weekday-header {
    text-align: center;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--bru-purple-800, #581c87);
    padding: 0.4rem 0;
    font-family: var(--font-heading, sans-serif);
}

.day-cell {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    min-height: 80px;
    padding: 0.35rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    transition: all 0.15s;
    position: relative;
}

.day-cell:hover {
    background: var(--bru-purple-50, #faf5ff);
    border-color: var(--bru-purple-200, #e9d5ff);
}

.day-cell.other-month {
    opacity: 0.35;
    background: #f8fafc;
}

.day-cell.is-today {
    border-color: var(--bru-gold-500, #eab308);
    background: var(--bru-gold-50, #fffbeb);
}

.day-cell.is-today .day-number {
    color: var(--bru-gold-700, #a16207);
    font-weight: 800;
}

.day-cell.is-selected {
    border-color: var(--bru-purple-700, #6b21a8);
    background: var(--bru-purple-100, #f3e8ff);
    box-shadow: 0 0 0 2px var(--bru-purple-600, #7e22ce);
}

.day-number {
    font-size: 0.84rem;
    font-weight: 600;
    color: #334155;
    margin-bottom: 0.2rem;
    font-family: var(--font-heading, sans-serif);
}

.event-dots {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
}

.event-pill {
    background: var(--bru-purple-700, #6b21a8);
    color: #ffffff;
    font-size: 0.65rem;
    padding: 2px 4px;
    border-radius: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
}

.more-badge {
    font-size: 0.65rem;
    color: var(--bru-purple-700, #6b21a8);
    font-weight: 700;
}

/* Mobile dots hidden on desktop */
.mobile-dots {
    display: none;
}

/* ========================================================
   Events Section (Right)
======================================================== */
.events-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 0.9rem;
    margin-bottom: 1.15rem;
}

.events-heading {
    margin: 0;
    font-size: 1.18rem;
    font-weight: 700;
    color: var(--bru-purple-900, #3b0764);
    font-family: var(--font-heading, sans-serif);
}

.events-subtitle {
    margin: 0.2rem 0 0;
    font-size: 0.82rem;
    color: #64748b;
}

.btn-clear {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: transparent;
    border: 1px solid #cbd5e1;
    color: #475569;
    padding: 0.28rem 0.65rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    font-family: var(--font-body, sans-serif);
}

.btn-clear:hover {
    background: var(--bru-purple-50, #faf5ff);
    color: var(--bru-purple-700, #6b21a8);
    border-color: var(--bru-purple-200, #e9d5ff);
}

.events-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 650px;
    overflow-y: auto;
    padding-right: 0.25rem;
}

.event-item {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 1rem 1.15rem;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    transition: transform 0.15s, box-shadow 0.15s;
}

.event-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px -2px rgba(107, 33, 168, 0.08);
    border-color: var(--bru-purple-200, #e9d5ff);
}

.event-item-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.45rem;
    gap: 0.5rem;
}

.category-badge {
    background: var(--bru-purple-100, #f3e8ff);
    color: var(--bru-purple-800, #581c87);
    border: 1px solid var(--bru-purple-200, #e9d5ff);
    font-size: 0.74rem;
    font-weight: 600;
    padding: 0.18rem 0.55rem;
    border-radius: 9999px;
    font-family: var(--font-heading, sans-serif);
}

.hours-tag {
    background: var(--bru-gold-100, #fef9c3);
    color: var(--bru-gold-700, #a16207);
    border: 1px solid var(--bru-gold-400, #facc15);
    font-size: 0.74rem;
    font-weight: 700;
    padding: 0.18rem 0.55rem;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-family: var(--font-heading, sans-serif);
}

.star-icon {
    color: var(--bru-gold-600, #ca8a04);
}

.event-title {
    margin: 0 0 0.45rem;
    font-size: 1.05rem;
    font-weight: 700;
    color: #0f172a;
    font-family: var(--font-heading, sans-serif);
    line-height: 1.35;
}

.event-desc {
    margin: 0 0 0.75rem;
    font-size: 0.85rem;
    color: #64748b;
    line-height: 1.45;
}

.event-time {
    background: var(--bru-purple-50, #faf5ff);
    border: 1px solid var(--bru-purple-200, #e9d5ff);
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    font-size: 0.8rem;
    color: #475569;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.65rem;
}

.time-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.time-icon {
    color: var(--bru-purple-600, #7e22ce);
}

.event-scope-box {
    background: #ffffff;
    border: 1px dashed #cbd5e1;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    font-size: 0.8rem;
    margin-bottom: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.scope-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
}

.scope-row .label {
    color: #475569;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.scope-icon {
    color: var(--bru-purple-600, #7e22ce);
}

.scope-row .val {
    color: #0f172a;
    font-weight: 700;
}

.scope-pill {
    font-size: 0.74rem;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
}

.scope-all {
    background: #dcfce7;
    color: #15803d;
}

.scope-faculty {
    background: var(--bru-gold-100, #fef9c3);
    color: var(--bru-gold-700, #a16207);
}

.scope-major {
    background: var(--bru-purple-100, #f3e8ff);
    color: var(--bru-purple-800, #581c87);
}

.tag-full {
    background: #fee2e2;
    color: #ef4444;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.12rem 0.45rem;
    border-radius: 4px;
    margin-left: 0.35rem;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
}

.event-item-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #f1f5f9;
    padding-top: 0.65rem;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.qr-info {
    font-size: 0.73rem;
    color: #94a3b8;
}

.btn-login-to-reg {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--bru-purple-700, #6b21a8);
    font-size: 0.82rem;
    font-weight: 600;
    text-decoration: none;
    font-family: var(--font-heading, sans-serif);
}

.btn-login-to-reg:hover {
    text-decoration: underline;
    color: var(--bru-purple-900, #3b0764);
}

.student-action-area {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
}

.reg-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.55rem;
    border-radius: 6px;
    font-family: var(--font-heading, sans-serif);
}

.badge-confirmed {
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #bbf7d0;
}

.badge-registered {
    background: var(--bru-gold-100, #fef9c3);
    color: var(--bru-gold-700, #a16207);
    border: 1px solid var(--bru-gold-400, #facc15);
}

.badge-attended {
    background: var(--bru-purple-100, #f3e8ff) !important;
    color: var(--bru-purple-800, #581c87) !important;
    border: 1px solid var(--bru-purple-200, #e9d5ff) !important;
}

.btn-show-ticket {
    background: linear-gradient(135deg, var(--bru-purple-700, #6b21a8) 0%, var(--bru-purple-900, #3b0764) 100%);
    color: #ffffff;
    border: 1px solid var(--bru-gold-400, #facc15);
    padding: 0.32rem 0.75rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    box-shadow: 0 2px 6px rgba(107, 33, 168, 0.25);
    font-family: var(--font-heading, sans-serif);
}

.btn-show-ticket:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(107, 33, 168, 0.35);
}

.badge-pending-qr {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: #f1f5f9;
    color: #64748b;
    border: 1px dashed #cbd5e1;
    padding: 0.25rem 0.55rem;
    border-radius: 6px;
    font-size: 0.73rem;
    font-weight: 500;
    cursor: default;
}

.btn-cancel-reg {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fca5a5;
    padding: 0.28rem 0.55rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: var(--font-body, sans-serif);
}

.btn-cancel-reg:hover:not(:disabled) {
    background: #fecaca;
}

.btn-cancel-reg:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-mandatory-locked {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: #f1f5f9;
    color: #64748b;
    border: 1px solid #cbd5e1;
    padding: 0.28rem 0.6rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: not-allowed;
    user-select: none;
}

.btn-register {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: var(--font-heading, sans-serif);
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
}

.btn-register:hover:not(:disabled) {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    transform: translateY(-1px);
}

.btn-register:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.btn-disabled {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: #f1f5f9;
    color: #94a3b8;
    border: 1px solid #e2e8f0;
    padding: 0.35rem 0.65rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: not-allowed;
}

.admin-quick-action {
    display: flex;
    align-items: center;
}

.btn-goto-activities {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--bru-purple-700, #6b21a8);
    font-size: 0.82rem;
    font-weight: 600;
    text-decoration: none;
    font-family: var(--font-heading, sans-serif);
}

.btn-goto-activities:hover {
    color: var(--bru-purple-900, #3b0764);
    text-decoration: underline;
}

/* Empty State */
.empty-events {
    text-align: center;
    padding: 3.5rem 1rem;
    color: #64748b;
}

.empty-icon-wrap {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: var(--bru-purple-50, #faf5ff);
    border: 1px solid var(--bru-purple-200, #e9d5ff);
    color: var(--bru-purple-600, #7e22ce);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 0.75rem;
}

.empty-events h4 {
    margin: 0 0 0.25rem;
    font-size: 1.1rem;
    color: #334155;
    font-family: var(--font-heading, sans-serif);
}

.empty-events p {
    margin: 0;
    font-size: 0.85rem;
}

/* ========================================================
   Skeleton Loader States
======================================================== */
.skeleton-card {
    pointer-events: none;
    user-select: none;
    border-color: #f1f5f9;
}

.skel-pill,
.skel-line,
.skel-box,
.skel-btn,
.action-skeleton {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
}

@keyframes shimmer {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}

.skel-pill {
    height: 22px;
    border-radius: 9999px;
}

.skel-pill-category {
    width: 90px;
}

.skel-pill-hours {
    width: 60px;
}

.skel-line {
    border-radius: 4px;
}

.skel-title {
    width: 75%;
    height: 20px;
    margin-bottom: 0.5rem;
}

.skel-desc {
    width: 90%;
    height: 14px;
    margin-bottom: 0.75rem;
}

.skel-time {
    height: 48px;
    border-radius: 8px;
    margin-bottom: 0.65rem;
}

.skel-scope {
    height: 52px;
    border-radius: 8px;
    margin-bottom: 0.75rem;
}

.skel-qr {
    width: 80px;
    height: 14px;
}

.skel-btn {
    width: 120px;
    height: 32px;
    border-radius: 6px;
}

.action-skeleton {
    width: 120px;
    height: 32px;
    display: inline-block;
}

/* ========================================================
   Responsive Breakpoints: Mobile & Tablet
======================================================== */
@media (max-width: 1024px) {
    .navbar {
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        padding: 0.75rem 1.25rem;
        flex-direction: column;
        align-items: stretch;
    }

    .nav-brand-container {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        min-width: 0;
    }

    .nav-brand {
        flex: 1;
        min-width: 0;
    }

    .brand-title {
        font-size: 1rem;
    }

    .brand-sub {
        font-size: 0.74rem;
    }

    .mobile-menu-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    /* Collapsible Navigation on Tablet & Mobile (Floating Overlay) */
    .nav-actions {
        display: none;
        flex-direction: column;
        align-items: stretch;
        gap: 0.65rem;
        padding: 1rem 1.25rem;
        width: 100%;
        box-sizing: border-box;
        position: absolute;
        top: 100%;
        /* Float below the navbar */
        left: 0;
        background: #ffffff;
        border-bottom: 2px solid var(--bru-gold-400, #facc15);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(107, 33, 168, 0.1);
        z-index: 40;
    }

    .nav-actions.mobile-open {
        display: flex;
    }

    .btn-nav,
    .btn-login,
    .btn-logout,
    .user-chip {
        justify-content: center;
        width: 100%;
        box-sizing: border-box;
        padding: 0.6rem 1rem;
    }

    .main-layout {
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        grid-template-columns: minmax(0, 1fr);
        padding: 1.25rem;
        gap: 1.25rem;
    }

    .events-list {
        max-height: none;
    }

    /* Show Dots on Tablet/Mobile instead of cramped text pills */
    .desktop-events {
        display: none !important;
    }

    .mobile-dots {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 3px;
        margin-top: auto;
    }

    .mobile-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--bru-purple-600, #7e22ce);
    }

    .mobile-dot.dot-mandatory {
        background: var(--bru-gold-600, #ca8a04);
    }

    .mobile-plus-count {
        font-size: 0.65rem;
        color: var(--bru-purple-700, #6b21a8);
        line-height: 1;
    }
}

@media (max-width: 640px) {
    .navbar {
        padding: 0.65rem 0.85rem;
    }

    .logo-wrapper {
        width: 36px;
        height: 36px;
    }

    .brand-title {
        font-size: 0.88rem;
        line-height: 1.2;
    }

    .brand-sub {
        font-size: 0.68rem;
        line-height: 1.2;
    }

    .main-layout {
        padding: 0.65rem;
        gap: 0.85rem;
    }

    .card {
        padding: 0.85rem;
        border-radius: 12px;
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
        overflow: hidden;
    }

    .month-title h3 {
        font-size: 1.05rem;
    }

    .calendar-grid {
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 3px;
    }

    .day-cell {
        min-height: 48px;
        padding: 0.2rem;
        border-radius: 6px;
        min-width: 0;
    }

    .day-number {
        font-size: 0.72rem;
        text-align: center;
        margin-bottom: 0.1rem;
    }

    .weekday-header {
        font-size: 0.72rem;
        padding: 0.25rem 0;
    }

    .event-item-footer {
        flex-direction: column;
        align-items: stretch;
    }

    .student-action-area {
        width: 100%;
        justify-content: space-between;
    }

    .btn-register,
    .btn-show-ticket,
    .btn-cancel-reg {
        flex: 1;
        justify-content: center;
        padding: 0.5rem;
    }
}
</style>