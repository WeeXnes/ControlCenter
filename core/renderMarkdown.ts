import {createNotification} from "~/core/notificationManager";
import {NotificationType} from "~/server/models/Notification";

export const renderMarkdown = async (rawMarkdown: string): Promise<string> => {
    try {
        const data = await $fetch('/api/markdown', {
            method: 'POST',
            body: {
                markdown_content: rawMarkdown
            }
        });
        return data.markdown;
        //await createNotification("Comment Posted successfully", NotificationType.SUCCESS)
    } catch (error: any) {
        await createNotification(error.response?.data?.message || 'An error occurred', NotificationType.ERROR)
        return "";
    }
}