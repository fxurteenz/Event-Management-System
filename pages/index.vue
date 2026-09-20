<template>
  <div class="home-container">
    <!-- Navigation Bar -->
    <header class="navbar">
      <div class="nav-brand">
        <span class="logo-icon">🏛️</span>
        <div>
          <h2>ระบบสารสนเทศเพื่อการจัดการกิจกรรมนักศึกษา</h2>
          <p class="brand-sub">สโมสรนักศึกษาคณะวิทยาศาสตร์ มหาวิทยาลัยราชภัฏบุรีรัมย์</p>
        </div>
      </div>

      <div class="nav-actions">
        <template v-if="currentUser">
          <NuxtLink v-if="isOrgPresident" to="/activities" class="btn-nav btn-org">
            📋 จัดการกิจกรรม (องค์การ)
          </NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin" class="btn-nav btn-admin">
            ⚙️ เมนูผู้ดูแลระบบ
          </NuxtLink>
          <span class="user-chip">
            👤 {{ currentUser.username }} ({{ currentUser.role }})
          </span>
          <button @click="handleLogout" class="btn-logout">ออกจากระบบ</button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="btn-login">เข้าสู่ระบบ (Login)</NuxtLink>
        </template>
      </div>
    </header>

    <!-- Main Content Layout -->
    <main class="main-layout">
      <!-- Left Column: Calendar Section -->
      <section class="calendar-section card">
        <div class="calendar-header">
          <div class="month-title">
            <h3>{{ monthNamesThai[currentMonth] }} {{ currentYear + 543 }}</h3>
            <button class="btn-today" @click="goToToday">วันนี้</button>
          </div>
          <div class="month-nav">
            <button class="btn-arrow" @click="prevMonth">&lt;</button>
            <button class="btn-arrow" @click="nextMonth">&gt;</button>
          </div>
        </div>

        <!-- Category Filter Pills -->
        <div class="filter-bar">
          <button 
            class="filter-pill" 
            :class="{ active: selectedCategory === '' }"
            @click="selectedCategory = ''"
          >
            ทั้งหมด
          </button>
          <button 
            v-for="cat in categories" 
            :key="cat.category_id" 
            class="filter-pill"
            :class="{ active: selectedCategory === cat.category_name }"
            @click="selectedCategory = cat.category_name"
          >
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
          <div 
            v-for="(cell, idx) in calendarCells" 
            :key="idx"
            class="day-cell"
            :class="{
              'other-month': !cell.isCurrentMonth,
              'is-today': cell.isToday,
              'is-selected': isSelectedDate(cell.dateStr),
              'has-events': cell.events.length > 0
            }"
            @click="selectDate(cell.dateStr)"
          >
            <div class="day-number">{{ cell.day }}</div>
            
            <!-- Event indicator dots / badges -->
            <div class="event-dots" v-if="cell.events.length > 0">
              <span 
                v-for="ev in cell.events.slice(0, 2)" 
                :key="ev.activity_id" 
                class="event-pill"
                :title="ev.title"
              >
                {{ ev.title }}
              </span>
              <span v-if="cell.events.length > 2" class="more-badge">
                +{{ cell.events.length - 2 }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Column: Activities for Selected Date or Upcoming -->
      <section class="events-section card">
        <div class="events-header">
          <div>
            <h3>
              {{ selectedDateStr ? 'กิจกรรมวันที่ ' + formatThaiDate(selectedDateStr) : 'กิจกรรมในเดือนนี้' }}
            </h3>
            <p class="events-subtitle">
              พบ {{ displayedActivities.length }} กิจกรรม
            </p>
          </div>
          <button v-if="selectedDateStr" class="btn-clear" @click="selectedDateStr = ''">
            ดูทั้งเดือน
          </button>
        </div>

        <!-- Activity List -->
        <div v-if="displayedActivities.length > 0" class="events-list">
          <div 
            v-for="act in displayedActivities" 
            :key="act.activity_id" 
            class="event-item"
          >
            <div class="event-item-top">
              <span class="category-badge">{{ act.category_name || 'กิจกรรมทั่วไป' }}</span>
              <span class="hours-tag">⭐ {{ act.activity_hours }} ชม.</span>
            </div>

            <h4 class="event-title">{{ act.title }}</h4>
            <p v-if="act.description" class="event-desc">{{ act.description }}</p>

            <div class="event-time">
              <span>🕒 <strong>เริ่ม:</strong> {{ formatDateTime(act.start_time) }}</span>
              <span>⏳ <strong>สิ้นสุด:</strong> {{ formatDateTime(act.end_time) }}</span>
            </div>

            <!-- เงื่อนไขสิทธิ์และจำนวนรับสมัคร -->
            <div class="event-scope-box">
              <div class="scope-row">
                <span class="label">👥 จำนวนรับ:</span>
                <span class="val">{{ act.max_participants ? act.max_participants + ' คน' : 'ไม่จำกัดจำนวน' }}</span>
              </div>
              <div class="scope-row">
                <span class="label">🎯 สิทธิ์เข้าร่วม:</span>
                <span v-if="(!act.target_faculties || act.target_faculties.length === 0) && (!act.target_majors || act.target_majors.length === 0)" class="scope-pill scope-all">
                  🌍 ทุกคณะและสาขา
                </span>
                <template v-else>
                  <span v-for="fac in act.target_faculties" :key="'f-'+fac.faculty_id" class="scope-pill scope-faculty">
                    🏢 {{ fac.faculty_name }}
                  </span>
                  <span v-for="maj in act.target_majors" :key="'m-'+maj.major_id" class="scope-pill scope-major">
                    🎓 {{ maj.major_name }}
                  </span>
                </template>
              </div>
            </div>

            <!-- Student Action (Register / Status) -->
            <div class="event-item-footer">
              <span class="qr-info">รหัส: {{ act.qr_code_data }}</span>
              <NuxtLink 
                v-if="!currentUser" 
                to="/login" 
                class="btn-login-to-reg"
              >
                เข้าสู่ระบบเพื่อลงทะเบียน
              </NuxtLink>
              <button 
                v-else-if="isStudent" 
                class="btn-register"
                @click="alert('ระบบลงทะเบียนกิจกรรมจะเปิดในเฟสถัดไปครับ')"
              >
                📝 ลงทะเบียนกิจกรรม
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="empty-events">
          <span class="empty-icon">📅</span>
          <h4>ไม่มีกิจกรรมในวันที่เลือก</h4>
          <p>ลองเลือกวันอื่นบนปฏิทิน หรือเลือกดูทั้งหมด</p>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const authCookie = useCookie('auth_user')
const currentUser = computed(() => authCookie.value || null)
const userRole = computed(() => (currentUser.value?.role || '').toLowerCase())

const isStudent = computed(() => userRole.value === 'student')
const isOrgPresident = computed(() => userRole.value === 'org_president' || userRole.value === 'admin')
const isAdmin = computed(() => userRole.value === 'admin')

const handleLogout = () => {
  authCookie.value = null
  const router = useRouter()
  router.push('/login')
}

// Fetch Activities
const { data: activitiesRes } = await useFetch('/api/activities')
const allActivities = computed(() => activitiesRes.value?.data || [])

// Fetch Categories
const { data: catRes } = await useFetch('/api/categories')
const categories = computed(() => catRes.value?.data || [])

const selectedCategory = ref('')
const selectedDateStr = ref('')

// Calendar State (Defaults to current month)
const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth()) // 0 - 11

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
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  selectedDateStr.value = `${y}-${m}-${d}`
}

// Filtered by Category
const filteredActivities = computed(() => {
  if (!selectedCategory.value) return allActivities.value
  return allActivities.value.filter(a => a.category_name === selectedCategory.value)
})

// Helper to format date into YYYY-MM-DD
const formatDateKey = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${date}`
}

// Generate Calendar Cells for the current month
const calendarCells = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value

  const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const todayKey = formatDateKey(today)
  const cells = []

  // Preceding days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const prevDate = new Date(year, month - 1, d)
    const key = formatDateKey(prevDate)
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
    const curDate = new Date(year, month, d)
    const key = formatDateKey(curDate)
    
    // Find events matching this day (based on start_time)
    const eventsOnDay = filteredActivities.value.filter(act => {
      if (!act.start_time) return false
      const actDate = new Date(act.start_time)
      return formatDateKey(actDate) === key
    })

    cells.push({
      day: d,
      dateStr: key,
      isCurrentMonth: true,
      isToday: key === todayKey,
      events: eventsOnDay
    })
  }

  // Trailing days from next month to fill grid (multiple of 7)
  const remaining = 42 - cells.length // 6 rows * 7 days
  for (let d = 1; d <= remaining; d++) {
    const nextDate = new Date(year, month + 1, d)
    const key = formatDateKey(nextDate)
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
}

const isSelectedDate = (dateStr) => selectedDateStr.value === dateStr

// Activities displayed in the right panel
const displayedActivities = computed(() => {
  let list = filteredActivities.value

  if (selectedDateStr.value) {
    return list.filter(act => {
      if (!act.start_time) return false
      return formatDateKey(new Date(act.start_time)) === selectedDateStr.value
    })
  }

  // If no date selected, filter by current displayed month
  return list.filter(act => {
    if (!act.start_time) return false
    const d = new Date(act.start_time)
    return d.getFullYear() === currentYear.value && d.getMonth() === currentMonth.value
  })
})

const formatThaiDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getDate()} ${monthNamesThai[d.getMonth()]} ${d.getFullYear() + 543}`
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #1e293b;
}

/* Navbar */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  flex-wrap: wrap;
  gap: 1rem;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.logo-icon {
  font-size: 2rem;
}
.nav-brand h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #0f172a;
}
.brand-sub {
  margin: 0.15rem 0 0;
  font-size: 0.825rem;
  color: #64748b;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-nav {
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
}
.btn-org {
  background: #ede9fe;
  color: #6d28d9;
}
.btn-org:hover {
  background: #ddd6fe;
}
.btn-admin {
  background: #f1f5f9;
  color: #334155;
}
.btn-admin:hover {
  background: #e2e8f0;
}

.user-chip {
  background: #f1f5f9;
  padding: 0.4rem 0.8rem;
  border-radius: 9999px;
  font-size: 0.825rem;
  color: #334155;
}

.btn-logout {
  background: #fee2e2;
  color: #dc2626;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.825rem;
}

.btn-login {
  background: #2563eb;
  color: white;
  text-decoration: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.15s;
}
.btn-login:hover {
  background: #1d4ed8;
}

/* Layout */
.main-layout {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1.5rem;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
}

.card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  padding: 1.5rem;
}

/* Calendar Section */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.month-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.month-title h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #0f172a;
}
.btn-today {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
}

.month-nav {
  display: flex;
  gap: 0.5rem;
}
.btn-arrow {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.1rem;
  cursor: pointer;
}
.btn-arrow:hover {
  background: #e2e8f0;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.75rem;
  margin-bottom: 1rem;
}
.filter-pill {
  background: #f1f5f9;
  border: none;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
}
.filter-pill.active {
  background: #2563eb;
  color: white;
  font-weight: 600;
}

/* Calendar Grid */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.weekday-header {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  padding: 0.5rem 0;
}

.day-cell {
  background: #fafafa;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  min-height: 80px;
  padding: 0.4rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: all 0.15s;
}
.day-cell:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.day-cell.other-month {
  opacity: 0.35;
}
.day-cell.is-today {
  border-color: #3b82f6;
  background: #f0f9ff;
}
.day-cell.is-today .day-number {
  color: #2563eb;
  font-weight: 800;
}
.day-cell.is-selected {
  border-color: #2563eb;
  background: #dbeafe;
  box-shadow: 0 0 0 2px #3b82f6;
}

.day-number {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.25rem;
}

.event-dots {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: auto;
}
.event-pill {
  background: #2563eb;
  color: white;
  font-size: 0.65rem;
  padding: 1px 4px;
  border-radius: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.more-badge {
  font-size: 0.65rem;
  color: #64748b;
  font-weight: 600;
}

/* Events Section (Right Column) */
.events-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1rem;
  margin-bottom: 1.25rem;
}
.events-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #0f172a;
}
.events-subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.825rem;
  color: #64748b;
}
.btn-clear {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.event-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  transition: transform 0.15s;
}
.event-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06);
}

.event-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.category-badge {
  background: #e0e7ff;
  color: #4338ca;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
}
.hours-tag {
  background: #dcfce7;
  color: #166534;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
}

.event-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  color: #0f172a;
}
.event-desc {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.4;
}

.event-time {
  background: #f8fafc;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.5rem;
}

.event-scope-box {
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
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
}
.scope-row .val {
  color: #0f172a;
  font-weight: 700;
}

.scope-pill {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
}
.scope-all {
  background: #dcfce7;
  color: #15803d;
}
.scope-faculty {
  background: #fef3c7;
  color: #b45309;
}
.scope-major {
  background: #e0e7ff;
  color: #4338ca;
}

.event-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f1f5f9;
  padding-top: 0.5rem;
}
.qr-info {
  font-size: 0.75rem;
  color: #94a3b8;
}

.btn-register {
  background: #10b981;
  color: white;
  border: none;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-register:hover {
  background: #059669;
}

.btn-login-to-reg {
  color: #2563eb;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
}
.btn-login-to-reg:hover {
  text-decoration: underline;
}

.empty-events {
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
}
.empty-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}
.empty-events h4 {
  margin: 0 0 0.25rem;
  color: #334155;
}
.empty-events p {
  margin: 0;
  font-size: 0.85rem;
}
</style>