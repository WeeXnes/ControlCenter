import type {Notification} from "~/server/models/Notification";
import {NotificationType} from "~/server/models/Notification";

export const ToastNotify = reactive({
    notifications: [] as Notification[],
})

export const createNotification = async (message: string, type: NotificationType = NotificationType.INFO) => {
    const newNotification: Notification = {
        content: message,
        type: type
    }
    ToastNotify.notifications.push(newNotification)

    setTimeout(() => {
        ToastNotify.notifications.splice(ToastNotify.notifications.indexOf(newNotification), 1);
    }, 5000);
}