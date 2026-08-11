<template>
  <div class="toast toast-top toast-end z-[999] p-4 space-y-3">
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-x-12 opacity-0"
      enter-to-class="transform translate-x-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-x-0 opacity-100"
      leave-to-class="transform translate-x-12 opacity-0"
    >
      <div v-for="notification in ToastNotify.notifications" :key="notification.content">
        <div class="alert shadow-2xl border-none backdrop-blur-xl bg-opacity-90 rounded-2xl flex items-center gap-4 pr-6 min-w-[300px]" 
             :class="classMap[notification.type].bg">
          <div class="p-2 rounded-xl" :class="classMap[notification.type].iconBg">
            <Icon :name="classMap[notification.type].icon" size="24" :class="classMap[notification.type].text" />
          </div>
          <div class="flex-1">
            <p class="font-bold text-sm tracking-tight" :class="classMap[notification.type].text">
              {{ notification.content }}
            </p>
          </div>
          <button @click="ToastNotify.notifications.splice(ToastNotify.notifications.indexOf(notification), 1)" 
                  class="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100 transition-opacity"
                  :class="classMap[notification.type].text">
            <Icon name="material-symbols:close-rounded" size="18" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ToastNotify } from "~/core/notificationManager";
import { NotificationType } from "~/server/models/Notification";

const classMap = {
  [NotificationType.INFO]: {
    bg: "bg-info text-info-content",
    iconBg: "bg-info-content/10",
    text: "text-info-content",
    icon: "material-symbols:info-outline-rounded"
  },
  [NotificationType.SUCCESS]: {
    bg: "bg-success text-success-content",
    iconBg: "bg-success-content/10",
    text: "text-success-content",
    icon: "material-symbols:check-circle-outline-rounded"
  },
  [NotificationType.ERROR]: {
    bg: "bg-error text-error-content",
    iconBg: "bg-error-content/10",
    text: "text-error-content",
    icon: "material-symbols:error-outline-rounded"
  },
  [NotificationType.WARNING]: {
    bg: "bg-warning text-warning-content",
    iconBg: "bg-warning-content/10",
    text: "text-warning-content",
    icon: "material-symbols:warning-outline-rounded"
  },
};
</script>

<style scoped>
.toast {
  filter: drop-shadow(0 20px 50px rgba(0, 0, 0, 0.3));
}
</style>