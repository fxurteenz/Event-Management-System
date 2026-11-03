<template>
    <div class="my-activities-page">
        <!-- Navigation Bar (Hidden in Print) -->
        <AppNavbar class="no-print" />

        <main class="main-layout">
            <!-- Guest / Not Logged In Warning -->
            <div v-if="!currentUser" class="login-prompt card no-print">
                <div class="prompt-icon-wrap">
                    <AppIcon name="lock-closed" :size="36" class="prompt-icon" />
                </div>
                <h3>กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน</h3>
                <p>ระบบนี้เปิดสำหรับนักศึกษา มหาวิทยาลัยราชภัฏบุรีรัมย์ ในการตรวจสอบชั่วโมงกิจกรรมสะสม</p>
                <NuxtLink to="/login" class="btn-primary">
                    <AppIcon name="arrow-left-on-rectangle" :size="16" />
                    <span>เข้าสู่ระบบ (Login)</span>
                </NuxtLink>
            </div>

            <template v-else>
                <!-- Printable Official Header (Visible ONLY when printing) -->
                <div class="print-official-header print-only">
                    <div class="print-brand-row">
                        <div class="print-logo-box">
                            <AppIcon name="building-library" :size="32" />
                        </div>
                        <div class="print-brand-text">
                            <h2>มหาวิทยาลัยราชภัฏบุรีรัมย์</h2>
                            <h3>สโมสรนักศึกษาคณะวิทยาศาสตร์</h3>
                            <p class="doc-title">ใบบันทึกชั่วโมงกิจกรรมสะสมและการเข้าร่วมกิจกรรมนักศึกษา</p>
                            <p class="doc-subtitle">Student Activity Transcript & Participation Record</p>
                        </div>
                    </div>
                    <div class="print-student-info">
                        <div class="p-info-col">
                            <div><strong>ชื่อ-สกุล:</strong> {{ studentProfile.full_name }}</div>
                            <div><strong>รหัสนักศึกษา:</strong> {{ studentProfile.student_id }}</div>
                        </div>
                        <div class="p-info-col">
                            <div><strong>คณะ:</strong> {{ studentProfile.faculty_name }}</div>
                            <div><strong>สาขาวิชา:</strong> {{ studentProfile.major_name }}</div>
                        </div>
                        <div class="p-info-col">
                            <div><strong>วันที่ออกเอกสาร:</strong> {{ currentDateThai }}</div>
                            <div><strong>สถานะเกณฑ์จบ:</strong> {{ summary.is_grad_eligible ? 'ผ่านเกณฑ์แล้ว' : 'อยู่ระหว่างสะสมชั่วโมง' }}</div>
                        </div>
                    </div>
                </div>

                <!-- Page Header (Screen) -->
                <div class="content-header no-print">
                    <div class="header-titles">
                        <div class="title-with-badge">
                            <div class="header-icon-box">
                                <AppIcon name="sparkles" :size="24" />
                            </div>
                            <div>
                                <h1>ชั่วโมงกิจกรรมสะสมและประวัติการเข้าร่วม</h1>
                                <p class="subtitle">
                                    ตรวจสอบชั่วโมงกิจกรรมสะสม เกณฑ์สำเร็จการศึกษา และรายการกิจกรรมที่เคยเข้าร่วม
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Header Action Toolbar -->
                    <div class="header-actions">
                        <button class="btn-action btn-refresh" @click="handleRefresh" :disabled="isLoading" title="รีเฟรชข้อมูลล่าสุด">
                            <AppIcon name="arrow-path" :size="16" :class="{ 'spin-icon': isLoading }" />
                            <span>รีเฟรชข้อมูล</span>
                        </button>
                        <button class="btn-action btn-print" @click="printTranscript" title="พิมพ์ใบบันทึกชั่วโมงกิจกรรม">
                            <AppIcon name="printer" :size="16" />
                            <span>พิมพ์ใบบันทึกชั่วโมง</span>
                        </button>
                    </div>
                </div>

                <!-- Student Identity Card -->
                <section class="student-profile-card card no-print">
                    <div class="profile-info-grid">
                        <div class="avatar-wrap">
                            <div class="student-avatar">
                                <AppIcon name="academic-cap" :size="28" />
                            </div>
                            <div class="student-main-details">
                                <div class="student-name-row">
                                    <h2>{{ studentProfile.full_name }}</h2>
                                    <span class="student-id-badge">
                                        <AppIcon name="identification" :size="14" />
                                        <code>{{ studentProfile.student_id }}</code>
                                    </span>
                                </div>
                                <div class="student-faculty-row">
                                    <span class="dept-pill">
                                        <AppIcon name="building-office" :size="13" />
                                        คณะ{{ studentProfile.faculty_name }}
                                    </span>
                                    <span class="dept-pill">
                                        <AppIcon name="academic-cap" :size="13" />
                                        สาขาวิชา{{ studentProfile.major_name }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Graduation Status Pill -->
                        <div class="grad-status-wrapper">
                            <div v-if="summary.is_grad_eligible" class="grad-pill grad-passed">
                                <AppIcon name="badge-check" :size="20" class="pill-icon" />
                                <div>
                                    <span class="pill-title">ผ่านเกณฑ์กิจกรรมสำเร็จการศึกษาแล้ว</span>
                                    <span class="pill-sub">ครบทั้งเกณฑ์คณะ (8 ชม.) และรวมทั้งหมด (48 ชม.)</span>
                                </div>
                            </div>
                            <div v-else class="grad-pill grad-pending">
                                <AppIcon name="clock" :size="20" class="pill-icon" />
                                <div>
                                    <span class="pill-title">อยู่ระหว่างสะสมชั่วโมงกิจกรรม</span>
                                    <span class="pill-sub">
                                        {{ summary.remaining_total_hours > 0 ? `ขาดอีก ${summary.remaining_total_hours} ชม.` : 'ครบเกณฑ์รวมแล้ว' }}
                                        {{ summary.remaining_faculty_hours > 0 ? `(เฉพาะคณะ/สาขาขาดอีก ${summary.remaining_faculty_hours} ชม.)` : '' }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 4 KPI Cards: Hour Accumulation & Progress -->
                <section class="kpi-grid">
                    <!-- Total Hours Card -->
                    <div class="kpi-card card-total" :class="{ 'kpi-card-passed': summary.is_total_passed }">
                        <div class="kpi-top">
                            <div class="kpi-icon-box icon-purple">
                                <AppIcon name="sparkles" :size="20" />
                            </div>
                            <span class="kpi-badge" :class="summary.is_total_passed ? 'badge-passed' : 'badge-pending'">
                                {{ summary.is_total_passed ? 'ผ่านเกณฑ์แล้ว' : `ขาดอีก ${summary.remaining_total_hours} ชม.` }}
                            </span>
                        </div>
                        <div class="kpi-body">
                            <span class="kpi-label">ชั่วโมงกิจกรรมสะสมรวมทั้งหมด</span>
                            <div class="kpi-number-row">
                                <span class="kpi-big-num">{{ summary.total_hours }}</span>
                                <span class="kpi-total-limit">/ {{ summary.required_total_hours }} ชม.</span>
                            </div>
                            <!-- Progress Bar -->
                            <div class="progress-bar-container">
                                <div class="progress-bar-fill fill-purple" :style="{ width: `${summary.progress_total_percent}%` }"></div>
                            </div>
                            <div class="kpi-footer-note">
                                <span>ความคืบหน้า {{ summary.progress_total_percent }}%</span>
                                <span class="crit-tag">เกณฑ์บังคับจบการศึกษา</span>
                            </div>
                        </div>
                    </div>

                    <!-- Faculty / Major Specific Hours Card -->
                    <div class="kpi-card card-faculty" :class="{ 'kpi-card-passed': summary.is_faculty_passed }">
                        <div class="kpi-top">
                            <div class="kpi-icon-box icon-gold">
                                <AppIcon name="building-office" :size="20" />
                            </div>
                            <span class="kpi-badge" :class="summary.is_faculty_passed ? 'badge-passed' : 'badge-pending'">
                                {{ summary.is_faculty_passed ? 'ผ่านเกณฑ์แล้ว' : `ขาดอีก ${summary.remaining_faculty_hours} ชม.` }}
                            </span>
                        </div>
                        <div class="kpi-body">
                            <span class="kpi-label">กิจกรรมเฉพาะคณะ / สาขาวิชา</span>
                            <div class="kpi-number-row">
                                <span class="kpi-big-num">{{ summary.faculty_major_hours }}</span>
                                <span class="kpi-total-limit">/ {{ summary.required_faculty_hours }} ชม.</span>
                            </div>
                            <!-- Progress Bar -->
                            <div class="progress-bar-container">
                                <div class="progress-bar-fill fill-gold" :style="{ width: `${summary.progress_faculty_percent}%` }"></div>
                            </div>
                            <div class="kpi-footer-note">
                                <span>ความคืบหน้า {{ summary.progress_faculty_percent }}%</span>
                                <span class="crit-tag">เกณฑ์บังคับจบการศึกษา</span>
                            </div>
                        </div>
                    </div>

                    <!-- Volunteer / Community Service Card -->
                    <div class="kpi-card card-volunteer">
                        <div class="kpi-top">
                            <div class="kpi-icon-box icon-pink">
                                <AppIcon name="sparkles" :size="20" />
                            </div>
                            <span class="kpi-badge badge-neutral">
                                สำหรับ กยศ.
                            </span>
                        </div>
                        <div class="kpi-body">
                            <span class="kpi-label">กิจกรรมบำเพ็ญประโยชน์ / จิตอาสา</span>
                            <div class="kpi-number-row">
                                <span class="kpi-big-num">{{ summary.volunteer_hours }}</span>
                                <span class="kpi-total-limit">ชม.</span>
                            </div>
                            <p class="volunteer-desc">
                                สะสมชั่วโมงจิตอาสาใช้สำหรับประกอบการขอกู้ยืมกองทุน กยศ.
                            </p>
                            <div class="kpi-footer-note">
                                <span>หมวดจิตอาสา</span>
                                <span class="crit-tag">กองทุนกู้ยืม</span>
                            </div>
                        </div>
                    </div>

                    <!-- Attended Activities Count Card -->
                    <div class="kpi-card card-activities">
                        <div class="kpi-top">
                            <div class="kpi-icon-box icon-emerald">
                                <AppIcon name="clipboard-list" :size="20" />
                            </div>
                            <span class="kpi-badge badge-passed">
                                เช็คชื่อสำเร็จ
                            </span>
                        </div>
                        <div class="kpi-body">
                            <span class="kpi-label">กิจกรรมที่เคยเข้าร่วมแล้ว</span>
                            <div class="kpi-number-row">
                                <span class="kpi-big-num">{{ summary.attended_count }}</span>
                                <span class="kpi-total-limit">/ {{ summary.registered_count }} กิจกรรม</span>
                            </div>
                            <p class="volunteer-desc">
                                กิจกรรมที่ได้รับการยืนยันและเช็คชื่อเข้าร่วมเรียบร้อยแล้ว
                            </p>
                            <div class="kpi-footer-note">
                                <span>เช็คชื่อแล้ว {{ summary.attended_count }} รายการ</span>
                                <span class="crit-tag">ประวัติเข้าร่วม</span>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Graduation Criteria Checklist Banner -->
                <section class="criteria-checklist-card card no-print">
                    <div class="checklist-header">
                        <AppIcon name="academic-cap" :size="20" class="chk-icon" />
                        <h3>สรุปผลการประเมินเกณฑ์กิจกรรมเพื่อสำเร็จการศึกษา (มหาวิทยาลัยราชภัฏบุรีรัมย์)</h3>
                    </div>
                    <div class="checklist-items">
                        <div class="chk-item" :class="{ 'item-pass': summary.is_faculty_passed, 'item-fail': !summary.is_faculty_passed }">
                            <div class="chk-icon-bubble">
                                <AppIcon :name="summary.is_faculty_passed ? 'badge-check' : 'clock'" :size="18" />
                            </div>
                            <div class="chk-text">
                                <div class="chk-title">
                                    <strong>เกณฑ์ที่ 1: กิจกรรมเฉพาะคณะหรือสาขาวิชา</strong>
                                    <span class="chk-status-tag">{{ summary.is_faculty_passed ? 'ผ่านเกณฑ์' : `ยังไม่ครบ (ขาดอีก ${summary.remaining_faculty_hours} ชม.)` }}</span>
                                </div>
                                <p>กำหนดต้องเข้าร่วมไม่น้อยกว่า <strong>8 ชั่วโมง</strong> (ปัจจุบันสะสมได้: <strong>{{ summary.faculty_major_hours }} ชม.</strong>)</p>
                            </div>
                        </div>

                        <div class="chk-item" :class="{ 'item-pass': summary.is_total_passed, 'item-fail': !summary.is_total_passed }">
                            <div class="chk-icon-bubble">
                                <AppIcon :name="summary.is_total_passed ? 'badge-check' : 'clock'" :size="18" />
                            </div>
                            <div class="chk-text">
                                <div class="chk-title">
                                    <strong>เกณฑ์ที่ 2: ชั่วโมงกิจกรรมรวมทั้งหมด</strong>
                                    <span class="chk-status-tag">{{ summary.is_total_passed ? 'ผ่านเกณฑ์' : `ยังไม่ครบ (ขาดอีก ${summary.remaining_total_hours} ชม.)` }}</span>
                                </div>
                                <p>กำหนดต้องสะสมไม่น้อยกว่า <strong>48 ชั่วโมง</strong> (ปัจจุบันสะสมได้: <strong>{{ summary.total_hours }} ชม.</strong>)</p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Participated Activities History Section -->
                <section class="history-section card">
                    <div class="history-header">
                        <div class="history-title-block">
                            <div class="history-icon-badge">
                                <AppIcon name="clipboard-list" :size="20" />
                            </div>
                            <div>
                                <h3>รายการกิจกรรมที่เคยเข้าร่วม (Participated Activities)</h3>
                                <p class="history-sub">
                                    แสดงประวัติกิจกรรม วันเวลาที่เช็คชื่อเข้าร่วม และจำนวนชั่วโมงที่ได้รับ
                                </p>
                            </div>
                        </div>

                        <!-- Filter Tab Pills (no-print) -->
                        <div class="history-tabs no-print">
                            <button
                                v-for="tab in filterTabs"
                                :key="tab.id"
                                class="tab-btn"
                                :class="{ active: currentTab === tab.id }"
                                @click="currentTab = tab.id"
                            >
                                <span>{{ tab.label }}</span>
                                <span class="tab-count">{{ getTabCount(tab.id) }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Search and Counter Toolbar (no-print) -->
                    <div class="history-toolbar no-print">
                        <div class="search-input-box">
                            <AppIcon name="magnifying-glass" :size="16" class="search-icon" />
                            <input
                                type="text"
                                v-model="searchQuery"
                                placeholder="ค้นหากิจกรรมตามชื่อกิจกรรม หรือหมวดหมู่..."
                                class="search-input"
                            />
                            <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''" title="ล้างการค้นหา">
                                <AppIcon name="x-mark" :size="14" />
                            </button>
                        </div>
                        <div class="results-count">
                            พบ <strong>{{ displayedActivities.length }}</strong> กิจกรรม
                        </div>
                    </div>

                    <!-- Loading State -->
                    <div v-if="isLoading" class="history-loading">
                        <div class="spinner"></div>
                        <p>กำลังโหลดประวัติกิจกรรม...</p>
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="displayedActivities.length === 0" class="history-empty">
                        <div class="empty-icon-box">
                            <AppIcon name="calendar" :size="40" class="empty-icon" />
                        </div>
                        <h4>ยังไม่มีกิจกรรมในหมวดนี้</h4>
                        <p v-if="searchQuery">ไม่พบกิจกรรมที่ตรงกับคำค้นหา "{{ searchQuery }}"</p>
                        <p v-else-if="currentTab === 'attended'">
                            ท่านยังไม่มีกิจกรรมที่เช็คชื่อสำเร็จ ลองตรวจสอบกิจกรรมที่ลงทะเบียนไว้ หรือเลือกกิจกรรมในปฏิทิน
                        </p>
                        <p v-else>ยังไม่มีรายการกิจกรรมที่ลงทะเบียนไว้</p>
                        <NuxtLink to="/" class="btn-goto-calendar no-print">
                            <AppIcon name="calendar" :size="16" />
                            <span>ค้นหากิจกรรมบนปฏิทิน</span>
                        </NuxtLink>
                    </div>

                    <!-- Activities List Table / Cards -->
                    <div v-else class="activities-container-list">
                        <!-- Desktop Table View -->
                        <div class="table-responsive">
                            <table class="activities-table">
                                <thead>
                                    <tr>
                                        <th class="col-num">#</th>
                                        <th class="col-title">ชื่อกิจกรรม</th>
                                        <th class="col-cat">ประเภทกิจกรรม</th>
                                        <th class="col-date">วัน-เวลาจัดกิจกรรม</th>
                                        <th class="col-checkin">เวลาเช็คชื่อเข้าร่วม</th>
                                        <th class="col-hours">ชั่วโมงที่ได้</th>
                                        <th class="col-status">สถานะ</th>
                                        <th class="col-action no-print">หลักฐาน / ตั๋ว</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="(act, index) in displayedActivities"
                                        :key="act.registration_id || act.activity_id"
                                        :class="{ 'row-attended': act.is_checked_in }"
                                    >
                                        <td class="col-num text-center">{{ index + 1 }}</td>
                                        <td class="col-title">
                                            <div class="act-title-box">
                                                <span class="act-main-title">{{ act.title }}</span>
                                                <span v-if="act.is_faculty_major" class="badge-faculty-tag" title="กิจกรรมเฉพาะคณะ/สาขาวิชา">
                                                    <AppIcon name="building-office" :size="11" />
                                                    เฉพาะคณะ/สาขา
                                                </span>
                                                <span v-if="act.is_volunteer" class="badge-volunteer-tag" title="กิจกรรมบำเพ็ญประโยชน์/จิตอาสา">
                                                    <AppIcon name="sparkles" :size="11" />
                                                    จิตอาสา (กยศ.)
                                                </span>
                                            </div>
                                        </td>
                                        <td class="col-cat">
                                            <span class="cat-pill">{{ act.category_name }}</span>
                                        </td>
                                        <td class="col-date">
                                            <div class="time-cell">
                                                <span>{{ formatDateTime(act.start_time) }}</span>
                                            </div>
                                        </td>
                                        <td class="col-checkin">
                                            <div v-if="act.check_in_time" class="checkin-time-cell">
                                                <AppIcon name="badge-check" :size="15" class="check-icon-green" />
                                                <span>{{ formatDateTime(act.check_in_time) }}</span>
                                            </div>
                                            <span v-else class="text-muted-checkin">ยังไม่ได้เช็คชื่อ</span>
                                        </td>
                                        <td class="col-hours text-center">
                                            <span class="hours-badge-cell" :class="{ 'hours-earned': act.is_checked_in }">
                                                <AppIcon name="sparkles" :size="13" />
                                                +{{ act.activity_hours }} ชม.
                                            </span>
                                        </td>
                                        <td class="col-status">
                                            <span v-if="act.is_checked_in" class="status-chip status-attended">
                                                <AppIcon name="badge-check" :size="13" />
                                                เข้าร่วมแล้ว
                                            </span>
                                            <span v-else-if="act.status === 'Confirmed'" class="status-chip status-confirmed">
                                                <AppIcon name="check-circle" :size="13" />
                                                ยืนยันสิทธิ์แล้ว
                                            </span>
                                            <span v-else class="status-chip status-registered">
                                                <AppIcon name="clock" :size="13" />
                                                รอสโมสรยืนยัน
                                            </span>
                                        </td>
                                        <td class="col-action no-print text-center">
                                            <button
                                                class="btn-ticket"
                                                @click="openTicket(act)"
                                                :title="act.is_checked_in ? 'ดูหลักฐานการเข้าร่วมและตั๋วดิจิทัล' : 'ดูบัตรและ QR Code ประจำกิจกรรม'"
                                            >
                                                <AppIcon :name="act.is_checked_in ? 'ticket' : 'qr-code'" :size="14" />
                                                <span>{{ act.is_checked_in ? 'ดูตั๋ว/หลักฐาน' : 'ดู QR' }}</span>
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Print-Only Summary & Signature Block -->
                        <div class="print-signature-section print-only">
                            <div class="print-summary-totals">
                                <div><strong>รวมจำนวนกิจกรรมที่เข้าร่วมแล้ว:</strong> {{ summary.attended_count }} กิจกรรม</div>
                                <div><strong>รวมชั่วโมงเฉพาะคณะ/สาขา:</strong> {{ summary.faculty_major_hours }} / 8.00 ชั่วโมง</div>
                                <div><strong>รวมชั่วโมงจิตอาสา (กยศ.):</strong> {{ summary.volunteer_hours }} ชั่วโมง</div>
                                <div><strong>รวมชั่วโมงกิจกรรมสะสมทั้งสิ้น:</strong> {{ summary.total_hours }} / 48.00 ชั่วโมง</div>
                            </div>
                            <div class="signature-boxes">
                                <div class="sig-box">
                                    <div class="sig-line"></div>
                                    <p class="sig-name">( {{ studentProfile.full_name }} )</p>
                                    <p class="sig-role">นักศึกษาผู้ยื่นคำร้อง</p>
                                    <p class="sig-date">วันที่ ........ / ........ / ................</p>
                                </div>
                                <div class="sig-box">
                                    <div class="sig-line"></div>
                                    <p class="sig-name">( .................................................... )</p>
                                    <p class="sig-role">นายกสโมสรนักศึกษาคณะวิทยาศาสตร์</p>
                                    <p class="sig-date">วันที่ ........ / ........ / ................</p>
                                </div>
                                <div class="sig-box">
                                    <div class="sig-line"></div>
                                    <p class="sig-name">( .................................................... )</p>
                                    <p class="sig-role">นายกองค์การบริหารนักศึกษา</p>
                                    <p class="sig-date">วันที่ ........ / ........ / ................</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </template>
        </main>

        <!-- Ticket & QR Modal Component -->
        <ActivityTicketModal
            :show="showTicketModal"
            :activity="selectedActivity"
            :student-id="studentProfile.student_id"
            @close="showTicketModal = false"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '~/components/AppNavbar.vue'
import AppIcon from '~/components/AppIcon.vue'
import ActivityTicketModal from '~/components/activities/ActivityTicketModal.vue'
import { useStudentActivity } from '~/composables/useStudentActivity'

const route = useRoute()
const authCookie = useCookie('auth_user')

const currentUser = computed(() => authCookie.value || null)
const queryStudentId = computed(() => String(route.query.student_id || ''))
const effectiveStudentId = computed(() => queryStudentId.value || currentUser.value?.student_id || '')

const {
    studentSummary,
    attendedActivities,
    allActivities,
    isLoading,
    fetchSummary,
    refreshSummary
} = useStudentActivity()

onMounted(() => {
    if (effectiveStudentId.value) {
        fetchSummary(effectiveStudentId.value)
    }
})

watch(effectiveStudentId, (newId) => {
    if (newId) {
        fetchSummary(newId)
    }
})

const handleRefresh = async () => {
    if (effectiveStudentId.value) {
        await refreshSummary()
    }
}

const printTranscript = () => {
    if (typeof window !== 'undefined') {
        window.print()
    }
}

// Student Profile
const studentProfile = computed(() => {
    return studentSummary.value?.student || {
        student_id: currentUser.value?.student_id || effectiveStudentId.value || '-',
        first_name: currentUser.value?.first_name || currentUser.value?.username || '',
        last_name: currentUser.value?.last_name || '',
        full_name: `${currentUser.value?.first_name || currentUser.value?.username || ''} ${currentUser.value?.last_name || ''}`.trim(),
        faculty_name: currentUser.value?.faculty_name || 'วิทยาศาสตร์',
        major_name: currentUser.value?.major_name || '-'
    }
})

// Summary Metrics
const summary = computed(() => {
    return studentSummary.value?.summary || {
        total_hours: currentUser.value?.accumulated_hours || 0,
        faculty_major_hours: 0,
        volunteer_hours: 0,
        general_hours: 0,
        required_total_hours: 48.0,
        required_faculty_hours: 8.0,
        is_faculty_passed: false,
        is_total_passed: false,
        is_grad_eligible: false,
        remaining_total_hours: 48.0,
        remaining_faculty_hours: 8.0,
        progress_total_percent: 0,
        progress_faculty_percent: 0,
        attended_count: 0,
        registered_count: 0
    }
})

// Filter Tabs
const currentTab = ref('attended')
const filterTabs = [
    { id: 'attended', label: 'กิจกรรมที่เข้าร่วมแล้ว' },
    { id: 'all', label: 'ทั้งหมดที่ลงทะเบียน' },
    { id: 'faculty', label: 'กิจกรรมคณะ / สาขา' },
    { id: 'volunteer', label: 'จิตอาสา / บำเพ็ญประโยชน์' }
]

const searchQuery = ref('')

const getTabCount = (tabId) => {
    if (!studentSummary.value) return 0
    if (tabId === 'attended') return attendedActivities.value.length
    if (tabId === 'all') return allActivities.value.length
    if (tabId === 'faculty') return allActivities.value.filter(a => a.is_faculty_major).length
    if (tabId === 'volunteer') return allActivities.value.filter(a => a.is_volunteer).length
    return 0
}

const displayedActivities = computed(() => {
    let list = []
    if (currentTab.value === 'attended') {
        list = attendedActivities.value
    } else if (currentTab.value === 'faculty') {
        list = allActivities.value.filter(a => a.is_faculty_major)
    } else if (currentTab.value === 'volunteer') {
        list = allActivities.value.filter(a => a.is_volunteer)
    } else {
        list = allActivities.value
    }

    if (!searchQuery.value.trim()) {
        return list
    }

    const q = searchQuery.value.trim().toLowerCase()
    return list.filter(act => {
        const titleMatch = (act.title || '').toLowerCase().includes(q)
        const catMatch = (act.category_name || '').toLowerCase().includes(q)
        return titleMatch || catMatch
    })
})

// Ticket Modal
const showTicketModal = ref(false)
const selectedActivity = ref(null)

const openTicket = (act) => {
    selectedActivity.value = act
    showTicketModal.value = true
}

// Date helpers
const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
        timeStyle: 'short'
    })
}

const currentDateThai = computed(() => {
    const d = new Date()
    const day = d.getDate()
    const month = thaiMonths[d.getMonth()]
    const year = d.getFullYear() + 543
    return `${day} ${month} ${year}`
})
</script>

<style scoped>
.my-activities-page {
    min-height: 100vh;
    background-color: #f8fafc;
    color: #1e293b;
    font-family: var(--font-body, sans-serif);
}

.main-layout {
    max-width: 1280px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.card {
    background: #ffffff;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    padding: 1.5rem;
    box-sizing: border-box;
}

/* Content Header */
.content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}

.title-with-badge {
    display: flex;
    align-items: center;
    gap: 0.85rem;
}

.header-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--bru-purple-800, #581c87) 0%, var(--bru-purple-600, #7e22ce) 100%);
    border: 2px solid var(--bru-gold-400, #facc15);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(107, 33, 168, 0.2);
    flex-shrink: 0;
}

.content-header h1 {
    margin: 0;
    font-size: 1.45rem;
    font-weight: 700;
    color: var(--bru-purple-900, #3b0764);
    font-family: var(--font-heading, sans-serif);
    line-height: 1.25;
}

.subtitle {
    margin: 0.25rem 0 0;
    font-size: 0.86rem;
    color: #64748b;
}

.header-actions {
    display: flex;
    gap: 0.65rem;
    flex-wrap: wrap;
}

.btn-action {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.86rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: var(--font-heading, sans-serif);
}

.btn-refresh {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: var(--bru-purple-900, #3b0764);
}

.btn-refresh:hover {
    background: var(--bru-purple-50, #faf5ff);
    border-color: var(--bru-purple-300, #d8b4fe);
}

.btn-print {
    background: linear-gradient(135deg, var(--bru-gold-500, #eab308) 0%, var(--bru-gold-600, #ca8a04) 100%);
    border: 1px solid var(--bru-gold-600, #ca8a04);
    color: #ffffff;
    box-shadow: 0 2px 6px rgba(202, 138, 4, 0.25);
}

.btn-print:hover {
    background: linear-gradient(135deg, var(--bru-gold-600, #ca8a04) 0%, var(--bru-gold-700, #a16207) 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(202, 138, 4, 0.35);
}

.spin-icon {
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Student Profile Card */
.student-profile-card {
    border-left: 4px solid var(--bru-purple-700, #6b21a8);
}

.profile-info-grid {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
}

.avatar-wrap {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    min-width: 280px;
}

.student-avatar {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    background: var(--bru-purple-100, #f3e8ff);
    border: 1.5px solid var(--bru-purple-300, #d8b4fe);
    color: var(--bru-purple-700, #6b21a8);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.student-main-details {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.student-name-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.student-name-row h2 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--bru-purple-900, #3b0764);
    font-family: var(--font-heading, sans-serif);
}

.student-id-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: var(--bru-purple-50, #faf5ff);
    border: 1px solid var(--bru-purple-200, #e9d5ff);
    color: var(--bru-purple-800, #581c87);
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
}

.student-faculty-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.dept-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.82rem;
    color: #475569;
    background: #f1f5f9;
    padding: 0.15rem 0.55rem;
    border-radius: 4px;
}

/* Grad Status Pill */
.grad-status-wrapper {
    flex-shrink: 0;
}

.grad-pill {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    border-radius: 10px;
}

.grad-passed {
    background: #f0fdf4;
    border: 1.5px solid #86efac;
    color: #166534;
}

.grad-passed .pill-icon {
    color: #16a34a;
}

.grad-pending {
    background: #fffbeb;
    border: 1.5px solid #fde047;
    color: #854d0e;
}

.grad-pending .pill-icon {
    color: #ca8a04;
}

.pill-title {
    display: block;
    font-weight: 700;
    font-size: 0.95rem;
    font-family: var(--font-heading, sans-serif);
}

.pill-sub {
    display: block;
    font-size: 0.78rem;
    opacity: 0.9;
    margin-top: 0.1rem;
}

/* KPI 4-Card Grid */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;
}

.kpi-card {
    background: #ffffff;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
}

.kpi-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.85rem;
}

.kpi-icon-box {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-purple {
    background: var(--bru-purple-100, #f3e8ff);
    color: var(--bru-purple-700, #6b21a8);
}

.icon-gold {
    background: var(--bru-gold-100, #fef9c3);
    color: var(--bru-gold-700, #a16207);
}

.icon-pink {
    background: #fdf2f8;
    color: #db2777;
}

.icon-emerald {
    background: #ecfdf5;
    color: #059669;
}

.kpi-badge {
    font-size: 0.74rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    font-family: var(--font-heading, sans-serif);
}

.badge-passed {
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #bbf7d0;
}

.badge-pending {
    background: #fef9c3;
    color: #854d0e;
    border: 1px solid #fef08a;
}

.badge-neutral {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
}

.kpi-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #64748b;
    font-family: var(--font-heading, sans-serif);
    display: block;
}

.kpi-number-row {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    margin: 0.35rem 0 0.6rem;
}

.kpi-big-num {
    font-size: 2.1rem;
    font-weight: 800;
    color: #0f172a;
    font-family: var(--font-heading, sans-serif);
    line-height: 1;
}

.kpi-total-limit {
    font-size: 0.95rem;
    color: #64748b;
    font-weight: 600;
}

.progress-bar-container {
    width: 100%;
    height: 7px;
    background: #f1f5f9;
    border-radius: 9999px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.progress-bar-fill {
    height: 100%;
    border-radius: 9999px;
    transition: width 0.4s ease;
}

.fill-purple {
    background: linear-gradient(90deg, var(--bru-purple-600, #7e22ce), var(--bru-purple-800, #581c87));
}

.fill-gold {
    background: linear-gradient(90deg, var(--bru-gold-400, #facc15), var(--bru-gold-600, #ca8a04));
}

.volunteer-desc {
    margin: 0 0 0.65rem;
    font-size: 0.78rem;
    color: #64748b;
    line-height: 1.4;
}

.kpi-footer-note {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.74rem;
    color: #64748b;
    margin-top: auto;
}

.crit-tag {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    font-weight: 600;
}

/* Criteria Checklist */
.criteria-checklist-card {
    background: linear-gradient(135deg, #ffffff 0%, var(--bru-purple-50, #faf5ff) 100%);
    border: 1.5px solid var(--bru-purple-200, #e9d5ff);
}

.checklist-header {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-bottom: 1rem;
    color: var(--bru-purple-900, #3b0764);
}

.chk-icon {
    color: var(--bru-purple-700, #6b21a8);
}

.checklist-header h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    font-family: var(--font-heading, sans-serif);
}

.checklist-items {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

.chk-item {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    padding: 1rem;
    border-radius: 10px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
}

.item-pass {
    border-color: #86efac;
    background: #f0fdf4;
}

.item-fail {
    border-color: #fde047;
    background: #fffbeb;
}

.chk-icon-bubble {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.item-pass .chk-icon-bubble {
    background: #dcfce7;
    color: #16a34a;
}

.item-fail .chk-icon-bubble {
    background: #fef9c3;
    color: #ca8a04;
}

.chk-text {
    flex: 1;
}

.chk-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
}

.chk-title strong {
    font-size: 0.92rem;
    color: #0f172a;
    font-family: var(--font-heading, sans-serif);
}

.chk-status-tag {
    font-size: 0.74rem;
    font-weight: 700;
    padding: 0.1rem 0.45rem;
    border-radius: 9999px;
}

.item-pass .chk-status-tag {
    background: #dcfce7;
    color: #15803d;
}

.item-fail .chk-status-tag {
    background: #fef9c3;
    color: #854d0e;
}

.chk-text p {
    margin: 0;
    font-size: 0.8rem;
    color: #64748b;
    line-height: 1.4;
}

/* History Section */
.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 1.25rem;
}

.history-title-block {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.history-icon-badge {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--bru-purple-100, #f3e8ff);
    color: var(--bru-purple-800, #581c87);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.history-title-block h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--bru-purple-900, #3b0764);
    font-family: var(--font-heading, sans-serif);
}

.history-sub {
    margin: 0.15rem 0 0;
    font-size: 0.8rem;
    color: #64748b;
}

.history-tabs {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
}

.tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #f1f5f9;
    border: 1px solid transparent;
    padding: 0.45rem 0.9rem;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s;
    font-family: var(--font-heading, sans-serif);
}

.tab-btn:hover {
    background: var(--bru-purple-50, #faf5ff);
    color: var(--bru-purple-700, #6b21a8);
}

.tab-btn.active {
    background: var(--bru-purple-700, #6b21a8);
    color: #ffffff;
    border-color: var(--bru-purple-800, #581c87);
    box-shadow: 0 2px 6px rgba(107, 33, 168, 0.2);
}

.tab-count {
    background: rgba(0, 0, 0, 0.08);
    padding: 0.1rem 0.4rem;
    border-radius: 9999px;
    font-size: 0.72rem;
}

.tab-btn.active .tab-count {
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
}

/* Toolbar */
.history-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.25rem;
}

.search-input-box {
    position: relative;
    max-width: 360px;
    width: 100%;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
}

.search-input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.5rem 2.2rem 0.5rem 2.25rem;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 0.86rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
    border-color: var(--bru-purple-600, #7e22ce);
    box-shadow: 0 0 0 3px rgba(126, 34, 206, 0.1);
}

.btn-clear-search {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.2rem;
}

.results-count {
    font-size: 0.84rem;
    color: #64748b;
}

/* Table */
.table-responsive {
    overflow-x: auto;
    width: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
}

.activities-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    text-align: left;
}

.activities-table th {
    background: #f8fafc;
    color: #475569;
    font-weight: 700;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e2e8f0;
    font-family: var(--font-heading, sans-serif);
    white-space: nowrap;
}

.activities-table td {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
}

.activities-table tr:last-child td {
    border-bottom: none;
}

.activities-table tr:hover td {
    background: #faf5ff;
}

.row-attended td {
    background: #ffffff;
}

.col-num { width: 45px; }
.col-hours { width: 110px; }
.col-status { width: 120px; }
.col-action { width: 130px; }

.act-title-box {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.act-main-title {
    font-weight: 700;
    color: #0f172a;
    font-size: 0.9rem;
    font-family: var(--font-heading, sans-serif);
}

.badge-faculty-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--bru-gold-50, #fffbeb);
    border: 1px solid var(--bru-gold-300, #fde047);
    color: var(--bru-gold-800, #854d0e);
    padding: 0.1rem 0.45rem;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 600;
    width: fit-content;
}

.badge-volunteer-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: #fdf2f8;
    border: 1px solid #fbcfe8;
    color: #be185d;
    padding: 0.1rem 0.45rem;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 600;
    width: fit-content;
}

.cat-pill {
    background: var(--bru-purple-50, #faf5ff);
    border: 1px solid var(--bru-purple-200, #e9d5ff);
    color: var(--bru-purple-800, #581c87);
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    font-size: 0.76rem;
    font-weight: 600;
    white-space: nowrap;
}

.time-cell {
    color: #475569;
    font-size: 0.8rem;
    white-space: nowrap;
}

.checkin-time-cell {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #15803d;
    font-weight: 600;
    font-size: 0.8rem;
    white-space: nowrap;
}

.check-icon-green {
    color: #16a34a;
}

.text-muted-checkin {
    color: #94a3b8;
    font-size: 0.78rem;
    font-style: italic;
}

.hours-badge-cell {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.65rem;
    border-radius: 9999px;
    font-size: 0.82rem;
    font-weight: 700;
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
}

.hours-badge-cell.hours-earned {
    background: var(--bru-gold-100, #fef9c3);
    color: var(--bru-gold-800, #854d0e);
    border-color: var(--bru-gold-400, #facc15);
}

.status-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
}

.status-attended {
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #bbf7d0;
}

.status-confirmed {
    background: var(--bru-purple-100, #f3e8ff);
    color: var(--bru-purple-800, #581c87);
    border: 1px solid var(--bru-purple-200, #e9d5ff);
}

.status-registered {
    background: #fef9c3;
    color: #854d0e;
    border: 1px solid #fef08a;
}

.btn-ticket {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    background: #ffffff;
    border: 1px solid var(--bru-purple-200, #e9d5ff);
    color: var(--bru-purple-700, #6b21a8);
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    font-family: var(--font-heading, sans-serif);
}

.btn-ticket:hover {
    background: var(--bru-purple-50, #faf5ff);
    border-color: var(--bru-purple-400, #c084fc);
    transform: translateY(-1px);
}

/* Loading & Empty states */
.history-loading,
.history-empty {
    padding: 3.5rem 1.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
}

.spinner {
    width: 38px;
    height: 38px;
    border: 3px solid var(--bru-purple-100, #f3e8ff);
    border-top-color: var(--bru-purple-700, #6b21a8);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.empty-icon-box {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #f1f5f9;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
}

.history-empty h4 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #334155;
    font-family: var(--font-heading, sans-serif);
}

.history-empty p {
    margin: 0;
    font-size: 0.88rem;
    color: #64748b;
    max-width: 440px;
    line-height: 1.45;
}

.btn-goto-calendar {
    margin-top: 0.5rem;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--bru-purple-700, #6b21a8);
    color: #ffffff;
    padding: 0.5rem 1.25rem;
    border-radius: 8px;
    font-size: 0.86rem;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.15s;
    font-family: var(--font-heading, sans-serif);
}

.btn-goto-calendar:hover {
    background: var(--bru-purple-800, #581c87);
}

/* Login prompt */
.login-prompt {
    text-align: center;
    padding: 4rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.prompt-icon-wrap {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--bru-purple-100, #f3e8ff);
    color: var(--bru-purple-700, #6b21a8);
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-prompt h3 {
    margin: 0;
    font-size: 1.35rem;
    color: var(--bru-purple-900, #3b0764);
    font-family: var(--font-heading, sans-serif);
}

.login-prompt p {
    margin: 0;
    color: #64748b;
}

.btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--bru-purple-700, #6b21a8);
    color: #ffffff;
    padding: 0.6rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    font-family: var(--font-heading, sans-serif);
}

/* Print Only Styles (Hidden on screen) */
.print-only {
    display: none;
}

@media (max-width: 1024px) {
    .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    .checklist-items {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .main-layout {
        padding: 1.25rem 1rem 3rem;
        gap: 1.25rem;
    }
    .kpi-grid {
        grid-template-columns: 1fr;
    }
    .content-header {
        flex-direction: column;
        align-items: stretch;
    }
    .header-actions {
        width: 100%;
    }
    .btn-action {
        flex: 1;
        justify-content: center;
    }
    .profile-info-grid {
        flex-direction: column;
        align-items: stretch;
    }
    .history-header {
        flex-direction: column;
        align-items: stretch;
    }
    .history-tabs {
        width: 100%;
        overflow-x: auto;
        padding-bottom: 0.35rem;
    }
    .history-toolbar {
        flex-direction: column;
        align-items: stretch;
    }
    .search-input-box {
        max-width: 100%;
    }
}

/* Print Media Optimization */
@media print {
    .no-print {
        display: none !important;
    }
    .print-only {
        display: block !important;
    }
    body, .my-activities-page, .main-layout {
        background: #ffffff !important;
        color: #000000 !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
    }
    .card {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
    }
    .print-official-header {
        padding-bottom: 1.5rem;
        margin-bottom: 1.5rem;
        border-bottom: 2px solid #000000;
    }
    .print-brand-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    .print-logo-box {
        width: 48px;
        height: 48px;
        border: 2px solid #000;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .print-brand-text h2 {
        margin: 0;
        font-size: 1.3rem;
        font-weight: 700;
    }
    .print-brand-text h3 {
        margin: 0.1rem 0;
        font-size: 1.1rem;
        font-weight: 600;
    }
    .doc-title {
        margin: 0.2rem 0 0;
        font-size: 1rem;
        font-weight: 700;
    }
    .doc-subtitle {
        margin: 0;
        font-size: 0.8rem;
        color: #555;
    }
    .print-student-info {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        background: #f8f8f8;
        padding: 0.75rem 1rem;
        border: 1px solid #ccc;
        font-size: 0.85rem;
    }
    .p-info-col div {
        margin-bottom: 0.25rem;
    }
    .table-responsive {
        border: 1px solid #000000 !important;
    }
    .activities-table th {
        background: #eee !important;
        color: #000 !important;
        border-bottom: 1px solid #000 !important;
    }
    .activities-table td {
        border-bottom: 1px solid #ccc !important;
        color: #000 !important;
    }
    .print-signature-section {
        margin-top: 2rem;
        page-break-inside: avoid;
    }
    .print-summary-totals {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
        border: 1px solid #000;
        padding: 0.75rem 1rem;
        margin-bottom: 2rem;
        font-size: 0.85rem;
    }
    .signature-boxes {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        text-align: center;
        margin-top: 2.5rem;
    }
    .sig-line {
        border-bottom: 1px dashed #000;
        height: 40px;
        margin-bottom: 0.5rem;
    }
    .sig-name {
        margin: 0;
        font-weight: 600;
        font-size: 0.85rem;
    }
    .sig-role {
        margin: 0.15rem 0;
        font-size: 0.8rem;
    }
    .sig-date {
        margin: 0.2rem 0 0;
        font-size: 0.75rem;
        color: #444;
    }
}
</style>
