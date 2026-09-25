<template>
    <Transition name="modal">
        <div v-if="show" class="ticket-modal-backdrop" @click.self="handleClose">
            <div class="ticket-modal-card">
                <!-- Header -->
                <!-- Header: BRU Purple & Gold Accent -->
                <div class="ticket-header">
                    <div class="ticket-brand">
                        <span class="ticket-icon"><AppIcon name="ticket" :size="20" class="inline-icon" /></span>
                        <div class="ticket-icon-badge">
                            <AppIcon name="ticket" :size="20" class="icon-brand" />
                        </div>
                        <div>
                            <h4>บัตรเข้าร่วมกิจกรรมดิจิทัล (E-Ticket)</h4>
                            <p class="ticket-sub">สโมสรนักศึกษาคณะวิทยาศาสตร์ มรภ.บุรีรัมย์</p>
                            <h4 class="brand-title">บัตรเข้าร่วมกิจกรรมดิจิทัล (E-Ticket)</h4>
                            <p class="brand-sub">สโมสรนักศึกษาคณะวิทยาศาสตร์ มรภ.บุรีรัมย์</p>
                        </div>
                    </div>
                    <button class="btn-ticket-close" @click="handleClose" title="ปิดหน้าต่าง">&times;</button>
                    <button class="btn-ticket-close" @click="handleClose" title="ปิดหน้าต่าง" aria-label="ปิดหน้าต่าง">
                        <AppIcon name="x-mark" :size="20" />
                    </button>
                </div>

                <!-- Loading State -->
                <div v-if="loading" class="ticket-loading">
                    <div class="ticket-spinner"></div>
                    <p>กำลังสร้าง QR Code ประจำกิจกรรม...</p>
                </div>

                <!-- Error State (e.g. not confirmed) -->
                <div v-else-if="error" class="ticket-error-box">
                    <span class="err-icon"><AppIcon name="exclamation-triangle" :size="20" class="inline-icon text-yellow-500" /></span>
                    <div class="err-icon-wrap">
                        <AppIcon name="exclamation-triangle" :size="42" class="err-icon" />
                    </div>
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
                            <span class="event-hours-badge">
                                <AppIcon name="sparkles" :size="14" class="hours-star-icon" />
                                <span>{{ ticket.activity_hours }} ชั่วโมง</span>
                            </span>
                        </div>
                        <h3 class="event-title">{{ ticket.activity_title }}</h3>
                        <p class="event-date">
                            <AppIcon name="clock" :size="16" class="inline-icon" /> <strong>วันเวลา:</strong> {{ formatDateTime(activity?.start_time) }} -
                            <AppIcon name="clock" :size="15" class="meta-icon" />
                            <strong>วันเวลา:</strong> {{ formatDateTime(activity?.start_time) }} - {{
                                formatDateTime(activity?.end_time) }}
                        </p>
                    </div>

                    <!-- Attendance Status Indicator -->
                    <div v-if="ticket.check_in_time" class="checkin-status-banner banner-attended">
                        <span class="status-icon"><AppIcon name="check-circle" :size="24" class="inline-icon text-green-500" /></span>
                        <div class="status-icon-wrap status-icon-attended">
                            <AppIcon name="badge-check" :size="22" />
                        </div>
                        <div>
                            <strong>เช็คชื่อเข้าร่วมกิจกรรมแล้ว</strong>
                            <p>บันทึกเวลา: {{ formatDateTime(ticket.check_in_time) }} (+{{ ticket.activity_hours }} ชม.)
                            </p>
                            <p>บันทึกเวลา: {{ formatDateTime(ticket.check_in_time) }} (+{{ ticket.activity_hours }} ชม.)
                            </p>
                        </div>
                    </div>
                    <div v-else class="checkin-status-banner banner-confirmed">
                        <span class="status-icon"><AppIcon name="check-circle" :size="16" class="inline-icon text-green-500" /></span>
                        <div class="status-icon-wrap status-icon-confirmed">
                            <AppIcon name="check-circle" :size="22" />
                        </div>
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
                            <span class="p-label"><AppIcon name="user" :size="16" class="inline-icon" /> ผู้เข้าร่วม:</span>
                            <span class="p-label">
                                <AppIcon name="user" :size="14" class="field-icon" />
                                ผู้เข้าร่วม:
                            </span>
                            <span class="p-value">{{ ticket.student_name }}</span>
                        </div>
                        <div class="profile-row">
                            <span class="p-label"><AppIcon name="identification" :size="16" class="inline-icon" /> รหัสนักศึกษา:</span>
                            <span class="p-label">
                                <AppIcon name="credit-card" :size="14" class="field-icon" />
                                รหัสนักศึกษา:
                            </span>
                            <span class="p-value"><code>{{ ticket.student_id }}</code></span>
                        </div>
                        <div class="profile-row">
                            <span class="p-label"><AppIcon name="building-office-2" :size="16" class="inline-icon" /> คณะ / สาขา:</span>
                            <span class="p-value">{{ ticket.major_name || '-' }} ({{ ticket.faculty_name || '-'
                            }})</span>
                            <span class="p-label">
                                <AppIcon name="building-office" :size="14" class="field-icon" />
                                คณะ / สาขา:
                            </span>
                            <span class="p-value">{{ ticket.major_name || '-' }} ({{ ticket.faculty_name || '-'
                            }})</span>
                        </div>
                    </div>

                    <!-- Instructions Footer -->
                    <div class="ticket-tips">
                        <p><AppIcon name="light-bulb" :size="16" class="inline-icon text-yellow-500" /> <em>โปรดปรับความสว่างหน้าจอให้อยู่ในระดับพอเหมาะ และแสดง QR Code
                                นี้ให้เจ้าหน้าที่สแกนเพื่อบันทึกเวลาและรับชั่วโมงกิจกรรม</em></p>
                        <div class="tips-icon-wrap">
                            <AppIcon name="light-bulb" :size="16" class="tips-icon" />
                        </div>
                        <p><em>โปรดปรับความสว่างหน้าจอให้อยู่ในระดับพอเหมาะ และแสดง QR Code
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
import AppIcon from '~/components/common/AppIcon.vue';

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
    box-shadow: 0 25px 50px -12px rgba(107, 33, 168, 0.25), 0 10px 25px rgba(0, 0, 0, 0.15);
    width: 100%;
    max-width: 480px;
    max-height: 92vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    animation: ticketPop 0.25s ease-out;
    border: 1px solid var(--bru-purple-200, #e9d5ff);
}

@keyframes ticketPop {
    from {
        opacity: 0;
        transform: scale(0.92) translateY(12px);
        transform: scale(0.94) translateY(10px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

/* Header */
.ticket-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-radius: 1.25rem 1.25rem 0 0;
    padding: 1.15rem 1.35rem;
    border-bottom: 2px solid var(--bru-gold-400, #facc15);
    background: linear-gradient(135deg, var(--bru-purple-900, #3b0764) 0%, var(--bru-purple-700, #6b21a8) 100%);
    color: #ffffff;
    border-radius: 1.2rem 1.2rem 0 0;
}

.ticket-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.ticket-icon {
    font-size: 1.75rem;

    .ticket-icon-badge {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(250, 204, 21, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--bru-gold-400, #facc15);
        flex-shrink: 0;
    }

    .ticket-brand h4 {
        .brand-title {
            margin: 0;
            font-size: 1.05rem;
            font-size: 1.02rem;
            font-weight: 700;
            color: #1e293b;
            font-family: var(--font-heading, sans-serif);
            color: #ffffff;
            letter-spacing: -0.01em;
        }

        .ticket-sub {
            .brand-sub {
                margin: 0.15rem 0 0;
                font-size: 0.75rem;
                color: #64748b;
                color: var(--bru-gold-200, #fef08a);
                font-family: var(--font-body, sans-serif);
            }

            .btn-ticket-close {
                background: transparent;
                border: none;
                font-size: 1.5rem;
                line-height: 1;
                color: #94a3b8;
                background: rgba(255, 255, 255, 0.12);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #ffffff;
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
                background: rgba(255, 255, 255, 0.25);
                transform: rotate(90deg);
            }

            /* Loading */
            .ticket-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 3rem 1.5rem;
                gap: 1rem;
                color: #64748b;
                font-family: var(--font-body, sans-serif);
            }

            .ticket-spinner {
                width: 36px;
                height: 36px;
                border: 3px solid #e2e8f0;
                border-top-color: #2563eb;
                width: 38px;
                height: 38px;
                border: 3px solid var(--bru-purple-100, #f3e8ff);
                border-top-color: var(--bru-purple-700, #6b21a8);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }

                to {
                    transform: rotate(360deg);
                }
            }

            /* Error */
            .ticket-error-box {
                padding: 2.5rem 1.5rem;
                text-align: center;
                color: #dc2626;
                font-family: var(--font-body, sans-serif);
            }

            .err-icon {
                font-size: 3rem;
                display: block;
            }

            .err-icon-wrap {
                display: flex;
                justify-content: center;
                margin-bottom: 0.75rem;
                color: #ef4444;
            }

            .ticket-error-box h5 {
                margin: 0 0 0.5rem;
                font-size: 1.15rem;
                font-weight: 700;
                font-family: var(--font-heading, sans-serif);
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
                font-family: var(--font-body, sans-serif);
            }

            /* Body */
            .ticket-body {
                padding: 1.25rem 1.5rem;
                padding: 1.25rem 1.35rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
                font-family: var(--font-body, sans-serif);
            }

            .ticket-event-box {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                background: linear-gradient(135deg, var(--bru-purple-50, #faf5ff) 0%, #ffffff 100%);
                border: 1px solid var(--bru-purple-200, #e9d5ff);
                border-radius: 0.875rem;
                padding: 1rem 1.25rem;
            }

            .event-meta-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 0.5rem;
                gap: 0.5rem;
                flex-wrap: wrap;
            }

            .event-category-badge {
                background: #e0e7ff;
                color: #4338ca;
                background: var(--bru-purple-100, #f3e8ff);
                color: var(--bru-purple-700, #6b21a8);
                border: 1px solid var(--bru-purple-200, #e9d5ff);
                font-size: 0.75rem;
                font-weight: 600;
                padding: 0.2rem 0.6rem;
                border-radius: 9999px;
                font-family: var(--font-heading, sans-serif);
            }

            .event-hours-badge {
                background: #fef3c7;
                color: #b45309;
                background: var(--bru-gold-100, #fef9c3);
                color: var(--bru-gold-700, #a16207);
                border: 1px solid var(--bru-gold-400, #facc15);
                font-size: 0.8rem;
                font-weight: 700;
                padding: 0.2rem 0.65rem;
                border-radius: 9999px;
                display: inline-flex;
                align-items: center;
                gap: 0.25rem;
                font-family: var(--font-heading, sans-serif);
            }

            .hours-star-icon {
                color: var(--bru-gold-600, #ca8a04);
            }

            .event-title {
                margin: 0 0 0.5rem;
                font-size: 1.12rem;
                font-weight: 700;
                color: #0f172a;
                line-height: 1.4;
                font-family: var(--font-heading, sans-serif);
            }

            .event-date {
                margin: 0;
                font-size: 0.82rem;
                color: #64748b;
                display: flex;
                align-items: center;
                gap: 0.35rem;
                flex-wrap: wrap;
            }

            .meta-icon {
                color: var(--bru-purple-600, #7e22ce);
            }

            /* Checkin Status */
            .checkin-status-banner {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                border-radius: 0.75rem;
                font-size: 0.86rem;
            }

            .status-icon-wrap {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .banner-confirmed {
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                color: #166534;
            }

            .status-icon-confirmed {
                background: #dcfce7;
                color: #15803d;
            }

            .banner-attended {
                background: #eff6ff;
                border: 1px solid #bfdbfe;
                color: #1e40af;
                background: var(--bru-purple-50, #faf5ff);
                border: 1px solid var(--bru-purple-200, #e9d5ff);
                color: var(--bru-purple-800, #581c87);
            }

            .status-icon {
                font-size: 1.5rem;
            }

            .status-icon-attended {
                background: var(--bru-purple-100, #f3e8ff);
                color: var(--bru-purple-700, #6b21a8);
            }

            .checkin-status-banner strong {
                display: block;
                font-size: 0.92rem;
                font-family: var(--font-heading, sans-serif);
            }

            .checkin-status-banner p {
                margin: 0.15rem 0 0;
                font-size: 0.78rem;
                opacity: 0.9;
            }

            /* QR Card */
            .qr-presentation-card {
                background: #ffffff;
                border: 2px dashed #cbd5e1;
                border: 2px dashed var(--bru-purple-200, #e9d5ff);
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
                width: 210px;
                height: 210px;
                max-width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #ffffff;
                padding: 0.5rem;
                border-radius: 0.75rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                box-shadow: 0 4px 12px rgba(107, 33, 168, 0.08);
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
                background: var(--bru-purple-50, #faf5ff);
                border: 1px solid var(--bru-purple-200, #e9d5ff);
                padding: 0.2rem 0.5rem;
                border-radius: 0.25rem;
                color: #64748b;
                color: var(--bru-purple-800, #581c87);
                font-weight: 600;
            }

            /* Student Profile */
            .student-profile-strip {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 0.75rem;
                padding: 0.75rem 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.35rem;
                gap: 0.4rem;
                font-size: 0.84rem;
            }

            .profile-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 0.5rem;
            }

            .p-label {
                color: #64748b;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 0.35rem;
            }

            .field-icon {
                color: var(--bru-purple-600, #7e22ce);
            }

            .p-value {
                color: #1e293b;
                font-weight: 600;
                text-align: right;
            }

            .p-value code {
                color: var(--bru-purple-700, #6b21a8);
            }

            /* Tips */
            .ticket-tips {
                background: #fffbeb;
                border-radius: 0.5rem;
                padding: 0.6rem 0.85rem;
                border-left: 3px solid #f59e0b;
                background: var(--bru-gold-50, #fffbeb);
                border-radius: 0.6rem;
                padding: 0.65rem 0.85rem;
                border-left: 3px solid var(--bru-gold-500, #eab308);
                display: flex;
                align-items: flex-start;
                gap: 0.5rem;
            }

            .tips-icon-wrap {
                color: var(--bru-gold-600, #ca8a04);
                margin-top: 0.1rem;
                flex-shrink: 0;
            }

            .ticket-tips p {
                margin: 0;
                font-size: 0.76rem;
                color: #92400e;
                line-height: 1.4;
                color: var(--bru-gold-700, #a16207);
                line-height: 1.45;
            }

            /* Footer */
            .ticket-footer {
                padding: 1rem 1.5rem;
                padding: 1rem 1.35rem;
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
                font-family: var(--font-body, sans-serif);
            }

            .btn-close-ticket:hover {
                background: #e2e8f0;
                color: #0f172a;
                background: var(--bru-purple-100, #f3e8ff);
                color: var(--bru-purple-700, #6b21a8);
                border-color: var(--bru-purple-200, #e9d5ff);
            }

            @media (max-width: 480px) {
                .ticket-modal-card {
                    max-width: 100%;
                    border-radius: 1rem;
                }

                .qr-wrapper {
                    width: 180px;
                    height: 180px;
                }
            }
        }
    }
}
</style>
