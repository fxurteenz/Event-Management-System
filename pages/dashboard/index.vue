<template>
    <div class="dashboard-page">
        <!-- Navigation Bar -->
        <AppNavbar />

        <main class="main-layout">
            <!-- Header Section -->
            <div class="content-header">
                <div class="header-titles">
                    <div class="title-with-badge">
                        <div class="header-icon-box">
                            <AppIcon name="chart-bar" :size="24" />
                        </div>
                        <div>
                            <h1>แดชบอร์ดติดตามชั่วโมงกิจกรรมและเกณฑ์จบการศึกษา</h1>
                            <p class="subtitle">
                                ระบบวิเคราะห์และตรวจสอบเกณฑ์การเข้าร่วมกิจกรรมของนักศึกษาสำหรับนายกองค์การนักศึกษา</p>
                        </div>
                    </div>
                </div>

                <!-- Action Toolbar -->
                <div class="header-actions">
                    <button class="btn-refresh" @click="fetchData" :disabled="isLoading" title="รีเฟรชข้อมูลล่าสุด">
                        <AppIcon name="arrow-path" :size="16" :class="{ 'spin-icon': isLoading }" />
                        <span>รีเฟรชข้อมูล</span>
                    </button>
                    <button class="btn-print-summary" @click="printSummaryReport" title="พิมพ์รายงานสรุปหน้านี้">
                        <AppIcon name="printer" :size="16" />
                        <span>พิมพ์รายงาน</span>
                    </button>
                </div>
            </div>

            <!-- Role Scope Banner -->
            <div v-if="!canAccessDashboard" class="permission-warning">
                <AppIcon name="exclamation-triangle" :size="20" class="warn-icon" />
                <div>
                    <strong>จำกัดสิทธิ์การเข้าถึง:</strong> หน้านี้สำหรับนายกองค์การนักศึกษา, ประธานสโมสรคณะ
                    และผู้ดูแลระบบเท่านั้น
                </div>
            </div>

            <template v-else>
                <!-- Club President Faculty Scope Alert -->
                <div v-if="isClubPresident" class="club-scope-banner">
                    <AppIcon name="building-office" :size="20" class="inline-icon" />
                    <div>
                        <strong>สิทธิ์ประธานสโมสรคณะ:</strong> กำลังแสดงข้อมูลเฉพาะนักศึกษา <strong>{{ userFacultyName
                        }}</strong>
                    </div>
                </div>

                <!-- Criteria Rules Explanatory Banner -->
                <div class="criteria-banner">
                    <div class="banner-title">
                        <AppIcon name="academic-cap" :size="20" class="banner-icon" />
                        <span>เกณฑ์การเข้าร่วมกิจกรรมเพื่อการสำเร็จการศึกษา (มหาวิทยาลัยราชภัฏบุรีรัมย์)</span>
                    </div>
                    <div class="criteria-grid">
                        <div class="criteria-item">
                            <div class="crit-badge crit-required">เกณฑ์ที่ 1 (บังคับ)</div>
                            <div class="crit-name">กิจกรรมเฉพาะคณะหรือสาขาวิชา</div>
                            <div class="crit-rule">ต้องเข้าร่วมไม่น้อยกว่า <strong>8 ชั่วโมง</strong></div>
                            <div class="crit-sub">(กิจกรรมที่กำหนดสโคปเฉพาะคณะ/สาขาตนเอง)</div>
                        </div>
                        <div class="criteria-item">
                            <div class="crit-badge crit-required">เกณฑ์ที่ 2 (บังคับ)</div>
                            <div class="crit-name">ชั่วโมงกิจกรรมรวมทั้งหมด</div>
                            <div class="crit-rule">ต้องเข้าร่วมไม่น้อยกว่า <strong>48 ชั่วโมง</strong></div>
                            <div class="crit-sub">(สะสมจากทุกกิจกรรมที่เช็คชื่อสำเร็จ)</div>
                        </div>
                        <div class="criteria-item">
                            <div class="crit-badge crit-optional">กองทุน กยศ. (ไม่บังคับจบ)</div>
                            <div class="crit-name">กิจกรรมบำเพ็ญประโยชน์ / จิตอาสา</div>
                            <div class="crit-rule">สะสมตามเกณฑ์การขอกู้ยืม</div>
                            <div class="crit-sub">(ใช้สำหรับประกอบการยื่นกู้ กยศ.)</div>
                        </div>
                    </div>
                </div>

                <!-- KPI / Summary Metric Cards -->
                <div class="kpi-grid">
                    <div class="kpi-card card-total">
                        <div class="kpi-icon-wrapper">
                            <AppIcon name="users" :size="22" />
                        </div>
                        <div class="kpi-info">
                            <span class="kpi-label">นักศึกษาทั้งหมด</span>
                            <span class="kpi-value">{{ summary.total_students }} <small>คน</small></span>
                            <span class="kpi-hint">เฉลี่ย {{ summary.avg_hours }} ชม./คน</span>
                        </div>
                    </div>

                    <div class="kpi-card card-passed">
                        <div class="kpi-icon-wrapper">
                            <AppIcon name="badge-check" :size="22" />
                        </div>
                        <div class="kpi-info">
                            <span class="kpi-label">ผ่านเกณฑ์จบการศึกษา</span>
                            <span class="kpi-value text-green">{{ summary.passed_count }} <small>คน</small></span>
                            <span class="kpi-hint hint-green">สำเร็จ {{ summary.pass_rate }}% ของทั้งหมด</span>
                        </div>
                    </div>

                    <div class="kpi-card card-pending">
                        <div class="kpi-icon-wrapper">
                            <AppIcon name="clock" :size="22" />
                        </div>
                        <div class="kpi-info">
                            <span class="kpi-label">ยังไม่ผ่านเกณฑ์</span>
                            <span class="kpi-value text-amber">{{ summary.pending_count }} <small>คน</small></span>
                            <span class="kpi-hint hint-amber">ต้องเก็บชั่วโมงเพิ่ม</span>
                        </div>
                    </div>

                    <div class="kpi-card card-volunteer">
                        <div class="kpi-icon-wrapper">
                            <AppIcon name="sparkles" :size="22" />
                        </div>
                        <div class="kpi-info">
                            <span class="kpi-label">ชั่วโมงจิตอาสา (กยศ.) รวม</span>
                            <span class="kpi-value text-purple">{{ summary.total_volunteer_hours }}
                                <small>ชม.</small></span>
                            <span class="kpi-hint">หมวดบำเพ็ญประโยชน์</span>
                        </div>
                    </div>
                </div>

                <!-- Filter & Search Toolbar -->
                <div class="filter-card">
                    <div class="filter-top-row">
                        <!-- Search Box -->
                        <div class="filter-field search-field">
                            <label>
                                <AppIcon name="magnifying-glass" :size="15" class="inline-icon" /> ค้นหานักศึกษา:
                            </label>
                            <input type="text" v-model="searchQuery" placeholder="พิมพ์รหัสนักศึกษา หรือชื่อ-นามสกุล..."
                                class="filter-input" @input="onFilterChange" />
                        </div>

                        <!-- Faculty Dropdown (Locked for Club President) -->
                        <div class="filter-field">
                            <label>
                                <AppIcon name="building-office" :size="15" class="inline-icon" /> คณะ:
                            </label>
                            <div v-if="isClubPresident" class="locked-faculty-badge">
                                <AppIcon name="lock-closed" :size="14" class="inline-icon" />
                                <span>{{ userFacultyName }}</span>
                            </div>
                            <select v-else v-model="selectedFacultyId" class="filter-select" @change="onFacultyChange">
                                <option value="">-- ทุกคณะ (All Faculties) --</option>
                                <option v-for="fac in faculties" :key="fac.faculty_id" :value="String(fac.faculty_id)">
                                    {{ fac.faculty_name }}
                                </option>
                            </select>
                        </div>

                        <!-- Major Dropdown -->
                        <div class="filter-field">
                            <label>
                                <AppIcon name="academic-cap" :size="15" class="inline-icon" /> สาขาวิชา:
                            </label>
                            <select v-model="selectedMajorId" class="filter-select" @change="onFilterChange">
                                <option value="">-- ทุกสาขาวิชา (All Majors) --</option>
                                <option v-for="maj in availableMajors" :key="maj.major_id"
                                    :value="String(maj.major_id)">
                                    {{ maj.major_name }}
                                </option>
                            </select>
                        </div>

                        <!-- Clear Filter Button -->
                        <div v-if="hasActiveFilters" class="filter-field filter-reset-field">
                            <label>&nbsp;</label>
                            <button class="btn-reset-filter" @click="resetFilters" title="ล้างตัวกรองทั้งหมด">
                                <AppIcon name="x-mark" :size="15" class="inline-icon" /> ล้างตัวกรอง
                            </button>
                        </div>
                    </div>

                    <!-- Status Tabs -->
                    <div class="filter-tabs-row">
                        <span class="tab-row-label">สถานะเกณฑ์:</span>
                        <div class="tabs-group">
                            <button type="button" class="status-tab-btn" :class="{ active: statusFilter === 'all' }"
                                @click="setStatusFilter('all')">
                                ทั้งหมด ({{ summary.total_students }})
                            </button>
                            <button type="button" class="status-tab-btn tab-passed"
                                :class="{ active: statusFilter === 'passed' }" @click="setStatusFilter('passed')">
                                <AppIcon name="check-circle" :size="15" class="inline-icon" />
                                ผ่านเกณฑ์แล้ว ({{ summary.passed_count }})
                            </button>
                            <button type="button" class="status-tab-btn tab-pending"
                                :class="{ active: statusFilter === 'pending' }" @click="setStatusFilter('pending')">
                                <AppIcon name="clock" :size="15" class="inline-icon" />
                                ยังไม่ผ่านเกณฑ์ ({{ summary.pending_count }})
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Students Table Section -->
                <div class="table-container card">
                    <div class="table-header-info">
                        <span class="table-title">รายชื่อนักศึกษาและผลการตรวจสอบเกณฑ์ (พบ {{ students.length }}
                            รายการ)</span>
                        <span class="table-legend">
                            <span class="legend-dot dot-green"></span> ผ่านเกณฑ์
                            <span class="legend-dot dot-amber"></span> ยังไม่ผ่าน
                        </span>
                    </div>

                    <div v-if="isLoading" class="loading-state">
                        <AppIcon name="arrow-path" :size="28" class="spin-icon text-purple" />
                        <p>กำลังคำนวณและประมวลผลข้อมูลชั่วโมงกิจกรรม...</p>
                    </div>

                    <div v-else-if="students.length === 0" class="empty-state">
                        <AppIcon name="magnifying-glass" :size="36" class="empty-icon" />
                        <h3>ไม่พบข้อมูลนักศึกษา</h3>
                        <p>ไม่มีรายชื่อนักศึกษาที่ตรงตามเงื่อนไขตัวกรองหรือคำค้นหาที่ระบุ</p>
                        <button v-if="hasActiveFilters" class="btn-clear-search" @click="resetFilters">
                            ล้างตัวกรองเพื่อดูทั้งหมด
                        </button>
                    </div>

                    <div v-else class="table-responsive">
                        <table class="dashboard-table">
                            <thead>
                                <tr>
                                    <th style="width: 50px; text-align: center;">ลำดับ</th>
                                    <th style="width: 130px; text-align: center;">รหัสนักศึกษา</th>
                                    <th>ชื่อ - นามสกุล</th>
                                    <th>คณะ / สาขาวิชา</th>
                                    <th style="width: 170px;">ชม. คณะ/สาขา (&ge; 8)</th>
                                    <th style="width: 170px;">ชม. รวมทั้งหมด (&ge; 48)</th>
                                    <th style="width: 120px; text-align: center;">กยศ. (จิตอาสา)</th>
                                    <th style="width: 140px; text-align: center;">สถานะจบการศึกษา</th>
                                    <th style="width: 90px; text-align: center;">กิจกรรม</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(stu, idx) in students" :key="stu.student_id"
                                    :class="{ 'row-passed': stu.is_grad_eligible }">
                                    <td style="text-align: center;" class="cell-idx">{{ idx + 1 }}</td>
                                    <td style="text-align: center;">
                                        <code class="student-code">{{ stu.student_id }}</code>
                                    </td>
                                    <td>
                                        <div class="stu-name">{{ stu.full_name }}</div>
                                    </td>
                                    <td>
                                        <div class="stu-fac">{{ stu.faculty_name }}</div>
                                        <div class="stu-maj">{{ stu.major_name }}</div>
                                    </td>

                                    <!-- Faculty/Major Hours -->
                                    <td>
                                        <div class="progress-wrapper">
                                            <div class="progress-labels">
                                                <span class="hours-val"
                                                    :class="{ 'text-passed': stu.is_faculty_passed }">
                                                    {{ stu.faculty_major_hours }} / 8 ชม.
                                                </span>
                                                <span v-if="stu.is_faculty_passed" class="badge-mini-pass">✓ ครบ</span>
                                            </div>
                                            <div class="progress-track">
                                                <div class="progress-fill fill-faculty"
                                                    :style="{ width: Math.min((stu.faculty_major_hours / 8) * 100, 100) + '%' }">
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <!-- Total Hours -->
                                    <td>
                                        <div class="progress-wrapper">
                                            <div class="progress-labels">
                                                <span class="hours-val" :class="{ 'text-passed': stu.is_total_passed }">
                                                    {{ stu.total_hours }} / 48 ชม.
                                                </span>
                                                <span v-if="stu.is_total_passed" class="badge-mini-pass">✓ ครบ</span>
                                            </div>
                                            <div class="progress-track">
                                                <div class="progress-fill fill-total"
                                                    :style="{ width: Math.min((stu.total_hours / 48) * 100, 100) + '%' }">
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <!-- Volunteer (กยศ.) -->
                                    <td style="text-align: center;">
                                        <span class="badge-vol" v-if="stu.volunteer_hours > 0">
                                            {{ stu.volunteer_hours }} ชม.
                                        </span>
                                        <span v-else class="text-muted">-</span>
                                    </td>

                                    <!-- Overall Eligibility Status -->
                                    <td style="text-align: center;">
                                        <span v-if="stu.is_grad_eligible" class="status-pill pill-passed">
                                            <AppIcon name="check-circle" :size="14" class="inline-icon" /> ผ่านเกณฑ์แล้ว
                                        </span>
                                        <span v-else class="status-pill pill-pending">
                                            <AppIcon name="clock" :size="14" class="inline-icon" /> ยังไม่ครบ
                                        </span>
                                    </td>

                                    <!-- Actions: View Detail History Modal -->
                                    <td style="text-align: center;">
                                        <button class="btn-view-history" @click="openStudentDetail(stu)"
                                            title="ดูประวัติการเข้าร่วมกิจกรรม">
                                            <AppIcon name="clipboard-list" :size="14" />
                                            <span>({{ stu.activities_count }})</span>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </template>
        </main>

        <!-- Student Detail Modal (Activity History) -->
        <div v-if="selectedStudent" class="modal-backdrop" @click.self="closeStudentDetail">
            <div class="modal-card">
                <div class="modal-header">
                    <div class="modal-title-box">
                        <div class="modal-avatar">
                            <AppIcon name="user" :size="24" />
                        </div>
                        <div>
                            <h3>ประวัติกิจกรรม: {{ selectedStudent.full_name }}</h3>
                            <p class="modal-subtitle">รหัสนักศึกษา: {{ selectedStudent.student_id }} | {{
                                selectedStudent.faculty_name }} - {{ selectedStudent.major_name }}</p>
                        </div>
                    </div>
                    <button class="btn-close" @click="closeStudentDetail" title="ปิดหน้าต่าง">&times;</button>
                </div>

                <div class="modal-body">
                    <!-- Student Criteria Summary in Modal -->
                    <div class="modal-summary-box">
                        <div class="m-stat-box">
                            <span class="m-stat-label">ชั่วโมงคณะ/สาขา</span>
                            <span class="m-stat-val"
                                :class="selectedStudent.is_faculty_passed ? 'text-green' : 'text-amber'">
                                {{ selectedStudent.faculty_major_hours }} / 8 ชม.
                                <small>({{ selectedStudent.is_faculty_passed ? 'ผ่าน' : 'ขาดอีก ' + (8 -
                                    selectedStudent.faculty_major_hours) + ' ชม.' }})</small>
                            </span>
                        </div>
                        <div class="m-stat-box">
                            <span class="m-stat-label">ชั่วโมงรวมทั้งหมด</span>
                            <span class="m-stat-val"
                                :class="selectedStudent.is_total_passed ? 'text-green' : 'text-amber'">
                                {{ selectedStudent.total_hours }} / 48 ชม.
                                <small>({{ selectedStudent.is_total_passed ? 'ผ่าน' : 'ขาดอีก ' + (48 -
                                    selectedStudent.total_hours) + ' ชม.' }})</small>
                            </span>
                        </div>
                        <div class="m-stat-box">
                            <span class="m-stat-label">ชั่วโมงจิตอาสา (กยศ.)</span>
                            <span class="m-stat-val text-purple">
                                {{ selectedStudent.volunteer_hours }} ชม.
                            </span>
                        </div>
                    </div>

                    <!-- Activities History Table -->
                    <h4 class="m-section-title">
                        <AppIcon name="clipboard-list" :size="16" class="inline-icon" />
                        กิจกรรมที่เช็คชื่อเข้าร่วมสำเร็จ ({{
                            selectedStudent.activities.length }} รายการ)
                    </h4>

                    <div v-if="selectedStudent.activities.length === 0" class="modal-empty-activities">
                        <p>นักศึกษายังไม่เคยเช็คชื่อเข้าร่วมกิจกรรมใดๆ ในระบบ</p>
                    </div>

                    <div v-else class="table-responsive">
                        <table class="modal-table">
                            <thead>
                                <tr>
                                    <th style="width: 40px; text-align: center;">#</th>
                                    <th>ชื่อกิจกรรม</th>
                                    <th style="width: 140px;">หมวดหมู่</th>
                                    <th style="width: 90px; text-align: center;">ชั่วโมง</th>
                                    <th style="width: 120px; text-align: center;">ประเภทสโคป</th>
                                    <th style="width: 150px;">เวลาเช็คชื่อ</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(act, aIdx) in selectedStudent.activities" :key="act.activity_id">
                                    <td style="text-align: center;">{{ aIdx + 1 }}</td>
                                    <td class="font-medium">{{ act.title }}</td>
                                    <td><span class="category-tag">{{ act.category_name }}</span></td>
                                    <td style="text-align: center;"><span class="hours-badge">+{{ act.hours }}
                                            ชม.</span></td>
                                    <td style="text-align: center;">
                                        <span v-if="act.is_faculty_major"
                                            class="scope-tag scope-faculty">เฉพาะคณะ/สาขา</span>
                                        <span v-else class="scope-tag scope-general">ทั่วไป</span>
                                    </td>
                                    <td class="text-sm text-muted">{{ formatDateTime(act.check_in_time) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-modal-close" @click="closeStudentDetail">ปิดหน้าต่าง</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppNavbar from '~/components/AppNavbar.vue'
import AppIcon from '~/components/AppIcon.vue'

// Authentication & Role
const authCookie = useCookie('auth_user')
const currentUser = computed(() => authCookie.value || null)
const userRole = computed(() => (currentUser.value?.role || '').toLowerCase())

// Allowed roles: Org President, Club President, and Admin
const canAccessDashboard = computed(() => ['org_president', 'admin', 'club_president'].includes(userRole.value))
const isClubPresident = computed(() => userRole.value === 'club_president')
const userFacultyId = computed(() => {
    if (currentUser.value?.faculty_id) return currentUser.value.faculty_id
    if (isClubPresident.value && students.value.length > 0 && students.value[0]?.faculty_id) {
        return students.value[0].faculty_id
    }
    return null
})

// State
const isLoading = ref(false)
const students = ref([])
const summary = ref({
    total_students: 0,
    passed_count: 0,
    pending_count: 0,
    pass_rate: 0,
    total_volunteer_hours: 0,
    total_activity_hours: 0,
    avg_hours: 0
})

// Filter inputs
const searchQuery = ref('')
const selectedFacultyId = ref('')
const selectedMajorId = ref('')
const statusFilter = ref('all') // 'all', 'passed', 'pending'

// Faculties & Majors master data
const { data: facResponse } = await useFetch('/api/admin/faculties', {
    key: 'dashboard-faculties',
    default: () => ({ success: true, data: [] })
})
const faculties = computed(() => facResponse.value?.data || [])

// Resolve the exact faculty name from faculties master list, cookie, or API response
const userFacultyName = computed(() => {
    // 1. Try finding by faculty_id in faculties master list
    const fid = userFacultyId.value
    if (fid && faculties.value && faculties.value.length > 0) {
        const found = faculties.value.find(f => String(f.faculty_id) === String(fid))
        if (found?.faculty_name) {
            return found.faculty_name
        }
    }

    // 2. Try currentUser.faculty_name from login/cookie
    if (currentUser.value?.faculty_name) {
        return currentUser.value.faculty_name
    }

    // 3. Try from students returned by API (since API scopes to president's faculty)
    if (students.value && students.value.length > 0) {
        const firstStu = students.value.find(s => s.faculty_name && s.faculty_name !== '-')
        if (firstStu?.faculty_name) {
            return firstStu.faculty_name
        }
    }

    return 'คณะ'
})

const { data: majResponse } = await useFetch('/api/admin/majors', {
    key: 'dashboard-majors',
    default: () => ({ success: true, data: [] })
})
const allMajors = computed(() => majResponse.value?.data || [])

const availableMajors = computed(() => {
    const effectiveFacId = isClubPresident.value ? String(userFacultyId.value || '') : selectedFacultyId.value
    if (!effectiveFacId) return allMajors.value
    return allMajors.value.filter(m => String(m.faculty_id) === String(effectiveFacId))
})

const hasActiveFilters = computed(() => {
    const hasFacultyFilter = !isClubPresident.value && selectedFacultyId.value !== ''
    return searchQuery.value.trim() !== '' || hasFacultyFilter || selectedMajorId.value !== '' || statusFilter.value !== 'all'
})

// Student Detail Modal State
const selectedStudent = ref(null)

const openStudentDetail = (stu) => {
    selectedStudent.value = stu
}

const closeStudentDetail = () => {
    selectedStudent.value = null
}

// Fetch dashboard data
let searchDebounceTimeout = null

const onFilterChange = () => {
    clearTimeout(searchDebounceTimeout)
    searchDebounceTimeout = setTimeout(() => {
        fetchData()
    }, 300)
}

const onFacultyChange = () => {
    selectedMajorId.value = ''
    fetchData()
}

const setStatusFilter = (status) => {
    statusFilter.value = status
    fetchData()
}

const resetFilters = () => {
    searchQuery.value = ''
    if (!isClubPresident.value) {
        selectedFacultyId.value = ''
    }
    selectedMajorId.value = ''
    statusFilter.value = 'all'
    fetchData()
}

const fetchData = async () => {
    if (!canAccessDashboard.value) return
    isLoading.value = true
    try {
        if (isClubPresident.value && userFacultyId.value) {
            selectedFacultyId.value = String(userFacultyId.value)
        }

        const params = new URLSearchParams()
        if (userRole.value) params.append('role', userRole.value)
        if (userFacultyId.value) params.append('user_faculty_id', String(userFacultyId.value))
        if (searchQuery.value.trim()) params.append('search', searchQuery.value.trim())
        if (selectedFacultyId.value) params.append('faculty_id', selectedFacultyId.value)
        if (selectedMajorId.value) params.append('major_id', selectedMajorId.value)
        if (statusFilter.value !== 'all') params.append('status', statusFilter.value)

        const res = await $fetch(`/api/dashboard/graduation?${params.toString()}`)
        if (res.success) {
            students.value = res.students || []
            summary.value = res.summary || summary.value
        }
    } catch (err) {
        console.error('Error fetching graduation dashboard:', err)
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด: ' + (err.data?.statusMessage || err.message))
    } finally {
        isLoading.value = false
    }
}

// Helpers
const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Print Summary Report
const printSummaryReport = () => {
    if (students.value.length === 0) {
        alert('ไม่มีข้อมูลสำหรับพิมพ์')
        return
    }

    const printedAt = formatDateTime(new Date().toISOString())
    let printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>รายงานสรุปเกณฑ์การเข้าร่วมกิจกรรมเพื่อการจบการศึกษา</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');
                body { 
                    font-family: 'Sarabun', sans-serif; 
                    padding: 24px; 
                    color: #1e293b;
                    background: #fff;
                    margin: 0;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #3b0764;
                    padding-bottom: 14px;
                }
                h2 { margin: 0 0 6px 0; font-size: 20px; color: #3b0764; }
                h3 { margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #334155; }
                .summary-stats {
                    display: flex;
                    justify-content: space-around;
                    background: #faf5ff;
                    border: 1px solid #d8b4fe;
                    border-radius: 8px;
                    padding: 10px;
                    margin-bottom: 15px;
                    font-size: 13px;
                }
                .meta { 
                    font-size: 12px; 
                    color: #64748b;
                    display: flex;
                    justify-content: space-between;
                    margin-top: 8px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    font-size: 12px; 
                    margin-top: 10px;
                }
                th, td { 
                    border: 1px solid #cbd5e1; 
                    padding: 6px 8px; 
                    text-align: left; 
                }
                th { 
                    background-color: #f8fafc; 
                    font-weight: 600; 
                    color: #334155;
                }
                tr:nth-child(even) { background-color: #fdfdfe; }
                .text-center { text-align: center; }
                .status-pass { color: #15803d; font-weight: 600; }
                .status-pend { color: #b45309; }
                @media print {
                    @page { margin: 1cm; size: A4 portrait; }
                    body { padding: 0; }
                    th { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #f1f5f9 !important; }
                    tr:nth-child(even) { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #f8fafc !important; }
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <h2>รายงานสรุปการเข้าร่วมกิจกรรมและเกณฑ์การจบการศึกษา</h2>
                <h3>${isClubPresident.value ? 'สโมสรนักศึกษา' + userFacultyName.value : 'องค์การนักศึกษา'} มหาวิทยาลัยราชภัฏบุรีรัมย์</h3>
                <div class="summary-stats">
                    <span><strong>นักศึกษาทั้งหมด:</strong> ${summary.value.total_students} คน</span>
                    <span><strong>ผ่านเกณฑ์:</strong> ${summary.value.passed_count} คน (${summary.value.pass_rate}%)</span>
                    <span><strong>ยังไม่ครบ:</strong> ${summary.value.pending_count} คน</span>
                    <span><strong>ชม. จิตอาสารวม:</strong> ${summary.value.total_volunteer_hours} ชม.</span>
                </div>
                <div class="meta">
                    <span><strong>เงื่อนไข:</strong> เฉพาะคณะ/สาขา &ge; 8 ชม. | รวม &ge; 48 ชม.</span>
                    <span><strong>พิมพ์เมื่อ:</strong> ${printedAt}</span>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th class="text-center" style="width: 35px;">#</th>
                        <th class="text-center" style="width: 100px;">รหัสนักศึกษา</th>
                        <th>ชื่อ - นามสกุล</th>
                        <th>คณะ / สาขาวิชา</th>
                        <th class="text-center" style="width: 90px;">เฉพาะคณะ/สาขา (&ge;8)</th>
                        <th class="text-center" style="width: 90px;">รวมทั้งหมด (&ge;48)</th>
                        <th class="text-center" style="width: 75px;">จิตอาสา</th>
                        <th class="text-center" style="width: 95px;">สถานะ</th>
                    </tr>
                </thead>
                <tbody>
    `

    students.value.forEach((stu, i) => {
        printContent += `
            <tr>
                <td class="text-center">${i + 1}</td>
                <td class="text-center"><code>${stu.student_id}</code></td>
                <td>${stu.full_name}</td>
                <td>${stu.faculty_name} / ${stu.major_name}</td>
                <td class="text-center">${stu.faculty_major_hours} / 8 ชม.</td>
                <td class="text-center">${stu.total_hours} / 48 ชม.</td>
                <td class="text-center">${stu.volunteer_hours > 0 ? stu.volunteer_hours + ' ชม.' : '-'}</td>
                <td class="text-center">
                    <span class="${stu.is_grad_eligible ? 'status-pass' : 'status-pend'}">
                        ${stu.is_grad_eligible ? '✓ ผ่านเกณฑ์' : '⏳ ยังไม่ครบ'}
                    </span>
                </td>
            </tr>
        `
    })

    printContent += `
                </tbody>
            </table>
        </body>
        </html>
    `

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow.document
    iframeDoc.open()
    iframeDoc.write(printContent)
    iframeDoc.close()

    setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe)
            }
        }, 1000)
    }, 500)
}

onMounted(() => {
    if (isClubPresident.value && userFacultyId.value) {
        selectedFacultyId.value = String(userFacultyId.value)
    }
    fetchData()
})
</script>

<style scoped>
/* Page Container: BRU Royal Purple & Gold */
.dashboard-page {
    min-height: 100vh;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    background-color: #f8fafc;
    color: #1e293b;
    font-family: var(--font-body, 'Sarabun', sans-serif);
}

h1,
h2,
h3,
h4,
h5,
h6 {
    font-family: var(--font-heading, 'Prompt', sans-serif);
}

.main-layout {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    box-sizing: border-box;
    padding: 2rem;
}

/* Header */
.content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1.25rem;
}

.title-with-badge {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.header-icon-box {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #581c87 0%, #3b0764 100%);
    border: 2px solid #facc15;
    color: #fef08a;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 8px rgba(59, 7, 100, 0.2);
}

.content-header h1 {
    margin: 0;
    font-size: 1.6rem;
    color: #3b0764;
    line-height: 1.3;
}

.subtitle {
    margin: 0.25rem 0 0;
    color: #64748b;
    font-size: 0.95rem;
}

.header-actions {
    display: flex;
    gap: 0.75rem;
}

.btn-refresh,
.btn-print-summary {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.6rem 1.15rem;
    border-radius: 8px;
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-heading, sans-serif);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-refresh {
    background: #ffffff;
    color: #3b0764;
    border: 1.5px solid #d8b4fe;
}

.btn-refresh:hover {
    background: #faf5ff;
    border-color: #a855f7;
    transform: translateY(-1px);
}

.btn-print-summary {
    background: #3b0764;
    color: #ffffff;
    border: none;
    box-shadow: 0 2px 4px rgba(59, 7, 100, 0.2);
}

.btn-print-summary:hover {
    background: #581c87;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(59, 7, 100, 0.3);
}

/* Club Scope Banner */
.club-scope-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #fdf4ff;
    border: 1.5px solid #f0abfc;
    border-left: 4px solid #a855f7;
    color: #6b21a8;
    padding: 0.85rem 1.25rem;
    border-radius: 12px;
    font-size: 0.95rem;
    margin-bottom: 1.25rem;
    box-shadow: 0 2px 6px rgba(168, 85, 247, 0.06);
}

/* Criteria Explanation Banner */
.criteria-banner {
    background: linear-gradient(135deg, #faf5ff 0%, #fffbeb 100%);
    border: 1.5px solid #e9d5ff;
    border-radius: 14px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.75rem;
    box-shadow: 0 2px 8px rgba(107, 33, 168, 0.04);
}

.banner-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 1.05rem;
    color: #581c87;
    margin-bottom: 0.85rem;
    font-family: var(--font-heading, sans-serif);
}

.banner-icon {
    color: #ca8a04;
}

.criteria-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
}

.criteria-item {
    background: #ffffff;
    border: 1px solid #f3e8ff;
    border-radius: 10px;
    padding: 0.9rem 1.15rem;
    position: relative;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.crit-badge {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    border-radius: 9999px;
    margin-bottom: 0.45rem;
    font-family: var(--font-heading, sans-serif);
}

.crit-required {
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
}

.crit-optional {
    background: #eff6ff;
    color: #1e40af;
    border: 1px solid #bfdbfe;
}

.crit-name {
    font-weight: 700;
    color: #1e293b;
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
}

.crit-rule {
    color: #3b0764;
    font-size: 0.92rem;
}

.crit-sub {
    color: #64748b;
    font-size: 0.78rem;
    margin-top: 0.2rem;
}

/* KPI Cards */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.25rem;
    margin-bottom: 1.75rem;
}

.kpi-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 1.25rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 1.15rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
    transition: transform 0.2s, box-shadow 0.2s;
}

.kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(107, 33, 168, 0.06);
}

.card-total {
    border-left: 4px solid #3b0764;
}

.card-passed {
    border-left: 4px solid #16a34a;
}

.card-pending {
    border-left: 4px solid #ca8a04;
}

.card-volunteer {
    border-left: 4px solid #9333ea;
}

.kpi-icon-wrapper {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.card-total .kpi-icon-wrapper {
    background: #faf5ff;
    color: #581c87;
}

.card-passed .kpi-icon-wrapper {
    background: #f0fdf4;
    color: #16a34a;
}

.card-pending .kpi-icon-wrapper {
    background: #fffbeb;
    color: #ca8a04;
}

.card-volunteer .kpi-icon-wrapper {
    background: #fdf4ff;
    color: #c026d3;
}

.kpi-info {
    display: flex;
    flex-direction: column;
}

.kpi-label {
    font-size: 0.85rem;
    color: #64748b;
    font-weight: 500;
}

.kpi-value {
    font-size: 1.65rem;
    font-weight: 800;
    color: #1e293b;
    font-family: var(--font-heading, sans-serif);
    line-height: 1.2;
    margin: 0.2rem 0;
}

.kpi-value small {
    font-size: 0.95rem;
    font-weight: 500;
    color: #64748b;
}

.kpi-hint {
    font-size: 0.8rem;
    color: #64748b;
}

.text-green {
    color: #16a34a !important;
}

.text-amber {
    color: #b45309 !important;
}

.text-purple {
    color: #7e22ce !important;
}

.hint-green {
    color: #15803d;
    font-weight: 600;
}

.hint-amber {
    color: #b45309;
    font-weight: 600;
}

/* Filter Card */
.filter-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.filter-top-row {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.15rem;
}

.filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
    min-width: 200px;
}

.filter-field label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
    font-family: var(--font-heading, sans-serif);
}

.filter-input,
.filter-select {
    padding: 0.55rem 0.85rem;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 0.92rem;
    background: #f8fafc;
    color: #1e293b;
    outline: none;
    transition: all 0.2s;
    font-family: var(--font-body, sans-serif);
}

.filter-input:focus,
.filter-select:focus {
    background: #ffffff;
    border-color: #9333ea;
    box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.12);
}

.locked-faculty-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 0.85rem;
    background: #fffbeb;
    border: 1px solid #fef08a;
    border-radius: 8px;
    color: #854d0e;
    font-size: 0.92rem;
    font-weight: 600;
}

.filter-reset-field {
    flex: 0 0 auto;
    min-width: auto;
}

.btn-reset-filter {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #475569;
    padding: 0.55rem 0.9rem;
    border-radius: 8px;
    font-size: 0.88rem;
    cursor: pointer;
    font-weight: 500;
    white-space: nowrap;
    transition: all 0.2s;
}

.btn-reset-filter:hover {
    background: #e2e8f0;
    color: #0f172a;
}

/* Filter Tabs */
.filter-tabs-row {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    border-top: 1px solid #f1f5f9;
    padding-top: 1rem;
    flex-wrap: wrap;
}

.tab-row-label {
    font-size: 0.88rem;
    font-weight: 600;
    color: #64748b;
    font-family: var(--font-heading, sans-serif);
}

.tabs-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.status-tab-btn {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
    padding: 0.45rem 1rem;
    border-radius: 9999px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-heading, sans-serif);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.status-tab-btn:hover {
    background: #e2e8f0;
}

.status-tab-btn.active {
    background: #3b0764;
    color: #ffffff;
    border-color: #3b0764;
}

.status-tab-btn.tab-passed.active {
    background: #16a34a;
    border-color: #16a34a;
}

.status-tab-btn.tab-pending.active {
    background: #d97706;
    border-color: #d97706;
}

/* Table Card */
.table-container {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.table-header-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.15rem;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.table-title {
    font-weight: 700;
    font-size: 1.05rem;
    color: #3b0764;
    font-family: var(--font-heading, sans-serif);
}

.table-legend {
    font-size: 0.85rem;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 0.85rem;
}

.legend-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.dot-green {
    background: #16a34a;
}

.dot-amber {
    background: #d97706;
}

.table-responsive {
    overflow-x: auto;
}

.dashboard-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.92rem;
}

.dashboard-table th {
    background: #f8fafc;
    border-bottom: 2px solid #e2e8f0;
    padding: 0.85rem 1rem;
    text-align: left;
    font-weight: 600;
    color: #475569;
    font-family: var(--font-heading, sans-serif);
    white-space: nowrap;
}

.dashboard-table td {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
}

.dashboard-table tbody tr:hover {
    background-color: #fdfdfe;
}

.row-passed {
    background-color: #fafdfa;
}

.cell-idx {
    color: #94a3b8;
    font-size: 0.85rem;
}

.student-code {
    background: #f1f5f9;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    font-weight: 600;
    color: #0f172a;
    font-size: 0.85rem;
}

.stu-name {
    font-weight: 600;
    color: #1e293b;
}

.stu-fac {
    font-size: 0.85rem;
    color: #334155;
    font-weight: 500;
}

.stu-maj {
    font-size: 0.78rem;
    color: #64748b;
}

/* Progress Bars */
.progress-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 140px;
}

.progress-labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.82rem;
}

.hours-val {
    font-weight: 600;
    color: #475569;
}

.text-passed {
    color: #15803d;
}

.badge-mini-pass {
    background: #dcfce7;
    color: #15803d;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 700;
}

.progress-track {
    width: 100%;
    height: 7px;
    background: #e2e8f0;
    border-radius: 9999px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    border-radius: 9999px;
    transition: width 0.4s ease;
}

.fill-faculty {
    background: linear-gradient(90deg, #ca8a04 0%, #eab308 100%);
}

.fill-total {
    background: linear-gradient(90deg, #7e22ce 0%, #3b0764 100%);
}

.badge-vol {
    background: #fdf4ff;
    color: #86198f;
    border: 1px solid #f5d0fe;
    padding: 0.2rem 0.55rem;
    border-radius: 9999px;
    font-size: 0.82rem;
    font-weight: 600;
}

.status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.82rem;
    font-weight: 700;
    font-family: var(--font-heading, sans-serif);
    white-space: nowrap;
}

.pill-passed {
    background: #f0fdf4;
    color: #166534;
    border: 1px solid #bbf7d0;
}

.pill-pending {
    background: #fffbeb;
    color: #b45309;
    border: 1px solid #fde68a;
}

.btn-view-history {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    color: #3b0764;
    padding: 0.35rem 0.65rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    transition: all 0.2s;
}

.btn-view-history:hover {
    background: #f3e8ff;
    border-color: #c084fc;
}

/* Loading & Empty States */
.loading-state,
.empty-state {
    padding: 3.5rem 1rem;
    text-align: center;
    color: #64748b;
}

.spin-icon {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

.empty-icon {
    color: #cbd5e1;
    margin-bottom: 0.75rem;
}

.btn-clear-search {
    margin-top: 1rem;
    background: #3b0764;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
}

/* Permission Warning */
.permission-warning {
    background: #fef2f2;
    border: 1.5px solid #fecaca;
    color: #991b1b;
    padding: 1.25rem 1.5rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.85rem;
}

/* Modal Styles */
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1.25rem;
}

.modal-card {
    background: #ffffff;
    border-radius: 16px;
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    overflow: hidden;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
}

.modal-title-box {
    display: flex;
    align-items: center;
    gap: 0.85rem;
}

.modal-avatar {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: #faf5ff;
    color: #6b21a8;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1.5px solid #e9d5ff;
}

.modal-header h3 {
    margin: 0;
    font-size: 1.15rem;
    color: #3b0764;
}

.modal-subtitle {
    margin: 0.2rem 0 0;
    font-size: 0.82rem;
    color: #64748b;
}

.btn-close {
    background: transparent;
    border: none;
    font-size: 1.6rem;
    color: #94a3b8;
    cursor: pointer;
    line-height: 1;
}

.btn-close:hover {
    color: #0f172a;
}

.modal-body {
    padding: 1.5rem;
    overflow-y: auto;
}

.modal-summary-box {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 1rem;
    margin-bottom: 1.25rem;
}

.m-stat-box {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.m-stat-label {
    font-size: 0.78rem;
    color: #64748b;
}

.m-stat-val {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-heading, sans-serif);
}

.m-stat-val small {
    font-size: 0.78rem;
    font-weight: 500;
}

.m-section-title {
    font-size: 0.95rem;
    color: #334155;
    margin: 0 0 0.85rem 0;
}

.modal-empty-activities {
    padding: 2rem;
    text-align: center;
    color: #94a3b8;
    font-size: 0.92rem;
}

.modal-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
}

.modal-table th {
    background: #f8fafc;
    border-bottom: 2px solid #e2e8f0;
    padding: 0.65rem 0.85rem;
    text-align: left;
    font-weight: 600;
    color: #475569;
}

.modal-table td {
    padding: 0.65rem 0.85rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
}

.category-tag {
    background: #f1f5f9;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    font-size: 0.8rem;
    color: #475569;
}

.hours-badge {
    background: #faf5ff;
    color: #6b21a8;
    font-weight: 700;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
}

.scope-tag {
    font-size: 0.75rem;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    font-weight: 600;
}

.scope-faculty {
    background: #fffbeb;
    color: #b45309;
}

.scope-general {
    background: #f1f5f9;
    color: #64748b;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 1rem 1.5rem;
    border-top: 1px solid #f1f5f9;
    background: #fafafa;
}

.btn-modal-close {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #334155;
    padding: 0.5rem 1.25rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-heading, sans-serif);
}

.btn-modal-close:hover {
    background: #f1f5f9;
}

/* Responsiveness */
@media (max-width: 1024px) {
    .main-layout {
        padding: 1.25rem;
    }
}

@media (max-width: 768px) {
    .main-layout {
        padding: 0.75rem;
    }

    .content-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .header-actions {
        width: 100%;
    }

    .btn-refresh,
    .btn-print-summary {
        flex: 1;
        justify-content: center;
    }

    .filter-field {
        min-width: 100%;
    }

    .tabs-group {
        width: 100%;
    }

    .status-tab-btn {
        flex: 1;
        text-align: center;
    }
}
</style>
