<template>
    <div class="activity-card" :class="{ 'card-mandatory': isMandatory }">
        <div class="card-top">
            <span class="badge" :class="{ 'badge-mandatory': isMandatory }">
                {{ isMandatory ? '🔒 ' : '' }}{{ activity.category_name || 'กิจกรรมทั่วไป' }}
            </span>
            <span class="hours-badge">⭐ {{ activity.activity_hours }} ชั่วโมง</span>
        </div>

        <h3 class="card-title">{{ activity.title }}</h3>
        <p v-if="activity.description" class="desc">{{ activity.description }}</p>

        <div class="datetime-info">
            <p>🕒 <strong>เริ่ม:</strong> {{ formatDateTime(activity.start_time) }}</p>
            <p>⏳ <strong>สิ้นสุด:</strong> {{ formatDateTime(activity.end_time) }}</p>
        </div>

        <!-- ข้อมูลเงื่อนไขจำนวนและคณะ/สาขา -->
        <div class="scope-info">
            <p>
                👥 <strong>จำนวนรับ:</strong>
                <span class="val-pill">
                    {{ activity.max_participants ? activity.max_participants + ' คน' : 'ไม่จำกัดจำนวน' }}
                </span>
            </p>
            <div class="scope-line">
                <span class="scope-title">🎯 <strong>สิทธิ์เข้าร่วม:</strong></span>
                <div class="scope-tags">
                    <span
                        v-if="(!activity.target_faculties || activity.target_faculties.length === 0) && (!activity.target_majors || activity.target_majors.length === 0)"
                        class="scope-badge scope-all">
                        🌍 ทุกคณะและสาขา
                    </span>
                    <template v-else>
                        <span v-for="fac in activity.target_faculties" :key="'f-' + fac.faculty_id"
                            class="scope-badge scope-faculty">
                            🏢 {{ fac.faculty_name }}
                        </span>
                        <span v-for="maj in activity.target_majors" :key="'m-' + maj.major_id"
                            class="scope-badge scope-major">
                            🎓 {{ maj.major_name }}
                        </span>
                    </template>
                </div>
            </div>
        </div>

        <div class="card-footer">
            <span class="qr-label">รหัส QR: <code>{{ activity.qr_code_data }}</code></span>
            <div class="card-actions">
                <button v-if="canManageRegistrations" class="btn-registrations"
                    @click="$emit('manage-registrations', activity)">
                    👥 ผู้ลงทะเบียน ({{ activity.registered_count || 0 }})
                </button>
                <button v-if="canCreateActivity" class="btn-edit" @click="$emit('edit', activity)">
                    แก้ไข
                </button>
                <button v-if="canCreateActivity" class="btn-delete" @click="$emit('delete', activity.activity_id)">
                    ลบ
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    activity: {
        type: Object,
        required: true
    },
    canCreateActivity: {
        type: Boolean,
        default: false
    },
    canManageRegistrations: {
        type: Boolean,
        default: false
    }
});

defineEmits(['manage-registrations', 'edit', 'delete']);

const isMandatory = computed(() => {
    const catId = Number(props.activity.category_id)
    const catName = props.activity.category_name || ''
    return catId === 1 || catName.includes('บังคับ')
});

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
};
</script>

<style scoped>
.activity-card {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 1.25rem;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.activity-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
}

.card-mandatory {
    border-left: 4px solid #f59e0b;
}

.card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}

.badge {
    background: #e0f2fe;
    color: #0369a1;
    padding: 0.25rem 0.6rem;
    border-radius: 9999px;
    font-size: 0.8rem;
    font-weight: 600;
}

.badge-mandatory {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
}

.hours-badge {
    background: #fef3c7;
    color: #b45309;
    font-weight: 700;
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
}

.card-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.15rem;
    color: #1e293b;
    line-height: 1.4;
}

.desc {
    color: #64748b;
    font-size: 0.88rem;
    line-height: 1.5;
    margin-bottom: 0.75rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.datetime-info {
    background: #f8fafc;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.85rem;
    color: #475569;
    margin-bottom: 0.75rem;
}

.datetime-info p {
    margin: 0.2rem 0;
}

.scope-info {
    margin-bottom: 1rem;
    font-size: 0.85rem;
    color: #475569;
}

.scope-info p {
    margin: 0 0 0.4rem 0;
}

.val-pill {
    background: #f1f5f9;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-weight: 600;
    color: #334155;
}

.scope-line {
    margin-top: 0.4rem;
}

.scope-title {
    display: inline-block;
    margin-bottom: 0.25rem;
}

.scope-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.25rem;
}

.scope-badge {
    font-size: 0.78rem;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    font-weight: 500;
}

.scope-all {
    background: #f1f5f9;
    color: #475569;
}

.scope-faculty {
    background: #ede9fe;
    color: #5b21b6;
}

.scope-major {
    background: #ecfdf5;
    color: #065f46;
}

.card-footer {
    margin-top: auto;
    border-top: 1px solid #f1f5f9;
    padding-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.qr-label {
    font-size: 0.78rem;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 0.3rem;
}

.qr-label code {
    background: #f1f5f9;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    color: #0f172a;
}

.card-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.btn-registrations {
    background-color: #0284c7;
    color: white;
    border: none;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.1s ease;
}

.btn-registrations:hover {
    background-color: #0369a1;
    transform: translateY(-1px);
}

.btn-edit {
    background: #f1f5f9;
    color: #334155;
    border: 1px solid #cbd5e1;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-edit:hover {
    background: #e2e8f0;
    border-color: #94a3b8;
}

.btn-delete {
    background: #fee2e2;
    color: #b91c1c;
    border: 1px solid #fecaca;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    margin-left: auto;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-delete:hover {
    background: #fca5a5;
    color: #991b1b;
}
</style>
