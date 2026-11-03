<template>
    <div class="redirect-container">
        <p>กำลังนำท่านไปยังหน้ากิจกรรมของฉัน...</p>
    </div>
</template>

<script setup>
await navigateTo('/student/my-activities')
</script>

<style scoped>
.redirect-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 50vh;
    color: #64748b;
    font-family: var(--font-body, sans-serif);
}
</style>
