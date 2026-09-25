<template>
    <Transition name="modal">
        <div v-if="show" class="ticket-modal-backdrop" @click.self="handleClose">
            <div class="ticket-modal-card">
                <!-- Header -->
                <div class="ticket-header">
                    <div class="ticket-brand">
                        <span class="ticket-icon">🎟️</span>
                        <div>
                            <h4>บัตรเข้าร่วมกิจกรรมดิจิทัล (E-Ticket)</h4>
                            <p class="ticket-sub">สโมสรนักศึกษาคณะวิทยาศาสตร์ มรภ.บุรีรัมย์</p>
                        </div>
                    </div>
                    <button class="btn-ticket-close" @click="handleClose" title="ปิดหน้าต่าง">&times;</button>
                </div>

                <!-- Loading State -->
                <div v-if="loading" class="ticket-loading">
                    <div class="ticket-spinner"></div>
                    <p>กำลังสร้าง QR Code ประจำกิจกรรม...</p>
                </div>

                <!-- Error State (e.g. not confirmed) -->
                <div v-else-if="error" class="ticket-error-box">
                    <span class="err-icon">⚠️</span>
                    <h5>ไม่สามารถแสดง QR Code ได้</h5>
                    <p>{{ error }}</p>
                    <button class="btn-ticket-ok" @click="handleClose">รับทราบ</button>
                </div>

                <!-- Ticket Content -->
                <div v-else-if="ticket" class="ticket-body">
                    <!-- Activity Badge & Title -->
                    <div class="ticket-event-box">
                        <div class="event-meta-row">
                            <span class="event-category-badge">{{ activity?.category_name || 'กิจกรรม' }}</span>
                            <span class="event-hours-badge">⭐ {{ ticket.activity_hours }} ชั่วโมง</span>
                        </div>
                        <h3 class="event-title">{{ ticket.activity_title }}</h3>
                        <p class="event-date">
                            🕒 <strong>วันเวลา:</strong> {{ formatDateTime(activity?.start_time) }} - {{
                                formatDateTime(activity?.end_time) }}
                        </p>
                    </div>

                    <!-- Attendance Status Indicator -->
                    <div v-if="ticket.check_in_time" class="checkin-status-banner banner-attended">
                        <span class="status-icon">🎉</span>
                        <div>
                            <strong>เช็คชื่อเข้าร่วมกิจกรรมแล้ว</strong>
                            <p>บันทึกเวลา: {{ formatDateTime(ticket.check_in_time) }} (+{{ ticket.activity_hours }} ชม.)
                            </p>
                        </div>
                    </div>
                    <div v-else class="checkin-status-banner banner-confirmed">
                        <span class="status-icon">✅</span>
                        <div>
                            <strong>ยืนยันสิทธิ์เข้าร่วมกิจกรรมแล้ว (Confirmed)</strong>
                            <p>พร้อมนำ QR Code ไปแสดงให้เจ้าหน้าที่สแกนหน้างาน</p>
                        </div>
                    </div>

                    <!-- QR Code Frame -->
                    <div class="qr-presentation-card">
                        <div class="qr-wrapper" v-html="ticket.qr_svg"></div>
                        <p class="qr-caption">QR Code ประจำกิจกรรมสำหรับเช็คชื่อ</p>
                        <div class="qr-hash-info">
                            <code>ACT-{{ ticket.activity_id }} • STU-{{ ticket.student_id }}</code>
                        </div>
                    </div>

                    <!-- Student Info Box -->
                    <div class="student-profile-strip">
                        <div class="profile-row">
                            <span class="p-label">👤 ผู้เข้าร่วม:</span>
                            <span class="p-value">{{ ticket.student_name }}</span>
                        </div>
                        <div class="profile-row">
                            <span class="p-label">💳 รหัสนักศึกษา:</span>
                            <span class="p-value"><code>{{ ticket.student_id }}</code></span>
                        </div>
                        <div class="profile-row">
                            <span class="p-label">🏢 คณะ / สาขา:</span>
                            <span class="p-value">{{ ticket.major_name || '-' }} ({{ ticket.faculty_name || '-'
                            }})</span>
                        </div>
                    </div>

                    <!-- Instructions Footer -->
                    <div class="ticket-tips">
                        <p>💡 <em>โปรดปรับความสว่างหน้าจอให้อยู่ในระดับพอเหมาะ และแสดง QR Code
                                นี้ให้เจ้าหน้าที่สแกนเพื่อบันทึกเวลาและรับชั่วโมงกิจกรรม</em></p>
                    </div>
                </div>

                <div class="ticket-footer">
                    <button type="button" class="btn-close-ticket" @click="handleClose">ปิดหน้าต่าง</button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    activity: {
        type: Object,
        default: null
    },
    studentId: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['close']);

const loading = ref(false);
const error = ref('');
const ticket = ref(null);

const handleClose = () => {
    emit('close');
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) + ' น.';
};

const fetchTicketData = async () => {
    if (!props.activity?.activity_id || !props.studentId) return;

    loading.value = true;
    error.value = '';
    ticket.value = null;

    try {
        const res = await $fetch(`/api/activities/registration-qr?activity_id=${props.activity.activity_id}&student_id=${props.studentId}`);
        if (res.success && res.data) {
            ticket.value = res.data;
        } else {
            error.value = 'ไม่สามารถดึงข้อมูลบัตรเข้าร่วมกิจกรรมได้';
        }
    } catch (err) {
        error.value = err.data?.statusMessage || err.message || 'ไม่สามารถเปิด QR Code ได้';
    } finally {
        loading.value = false;
    }
};

watch(
    () => props.show,
    (newVal) => {
        if (newVal) {
            fetchTicketData();
        } else {
            ticket.value = null;
            error.value = '';
        }
    }
);
</script>

<style scoped>
.ticket-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
}

.ticket-modal-card {
    background: #ffffff;
    border-radius: 1.25rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    width: 100%;
    max-width: 480px;
    max-height: 92vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    animation: ticketPop 0.25s ease-out;
}

@keyframes ticketPop {
    from {
        opacity: 0;
        transform: scale(0.92) translateY(12px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.ticket-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-radius: 1.25rem 1.25rem 0 0;
}

.ticket-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.ticket-icon {
    font-size: 1.75rem;
}

.ticket-brand h4 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: #1e293b;
}

.ticket-sub {
    margin: 0.15rem 0 0;
    font-size: 0.75rem;
    color: #64748b;
}

.btn-ticket-close {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 9999px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.btn-ticket-close:hover {
    background: #e2e8f0;
    color: #0f172a;
}

.ticket-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    gap: 1rem;
    color: #64748b;
}

.ticket-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #e2e8f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.ticket-error-box {
    padding: 2.5rem 1.5rem;
    text-align: center;
    color: #dc2626;
}

.err-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 0.75rem;
}

.ticket-error-box h5 {
    margin: 0 0 0.5rem;
    font-size: 1.15rem;
    font-weight: 700;
}

.ticket-error-box p {
    color: #475569;
    font-size: 0.92rem;
    margin-bottom: 1.5rem;
    line-height: 1.5;
}

.btn-ticket-ok {
    background: #ef4444;
    color: #fff;
    border: none;
    padding: 0.6rem 1.75rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
}

.ticket-body {
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.ticket-event-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.875rem;
    padding: 1rem 1.25rem;
}

.event-meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}

.event-category-badge {
    background: #e0e7ff;
    color: #4338ca;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
}

.event-hours-badge {
    background: #fef3c7;
    color: #b45309;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.2rem 0.65rem;
    border-radius: 9999px;
}

.event-title {
    margin: 0 0 0.5rem;
    font-size: 1.12rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.4;
}

.event-date {
    margin: 0;
    font-size: 0.82rem;
    color: #64748b;
}

.checkin-status-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    font-size: 0.86rem;
}

.banner-confirmed {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
}

.banner-attended {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1e40af;
}

.status-icon {
    font-size: 1.5rem;
}

.checkin-status-banner strong {
    display: block;
    font-size: 0.92rem;
}

.checkin-status-banner p {
    margin: 0.15rem 0 0;
    font-size: 0.78rem;
    opacity: 0.9;
}

.qr-presentation-card {
    background: #ffffff;
    border: 2px dashed #cbd5e1;
    border-radius: 1rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.qr-wrapper {
    width: 220px;
    height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    padding: 0.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.qr-wrapper :deep(svg) {
    width: 100%;
    height: 100%;
    display: block;
}

.qr-caption {
    margin: 0.75rem 0 0.25rem;
    font-size: 0.82rem;
    color: #475569;
    font-weight: 500;
}

.qr-hash-info code {
    font-size: 0.72rem;
    background: #f1f5f9;
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    color: #64748b;
}

.student-profile-strip {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.84rem;
}

.profile-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
}

.p-label {
    color: #64748b;
    font-weight: 500;
}

.p-value {
    color: #1e293b;
    font-weight: 600;
    text-align: right;
}

.ticket-tips {
    background: #fffbeb;
    border-radius: 0.5rem;
    padding: 0.6rem 0.85rem;
    border-left: 3px solid #f59e0b;
}

.ticket-tips p {
    margin: 0;
    font-size: 0.76rem;
    color: #92400e;
    line-height: 1.4;
}

.ticket-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: flex-end;
}

.btn-close-ticket {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.88rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-close-ticket:hover {
    background: #e2e8f0;
    color: #0f172a;
}
</style>
