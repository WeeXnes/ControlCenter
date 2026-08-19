import { sendDiscordEmbed } from '~/server/util/discordNotifier';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const body = await readBody(event).catch(() => ({}));
  const webhookUrl = body.webhookUrl || undefined;

  const success = await sendDiscordEmbed(
    {
      title: '🔔 [ControlCenter] Discord Webhook Connected Successfully!',
      description: 'Your Discord webhook integration is functioning properly. You will receive real-time notifications for node availability, service downtime, and telemetry thresholds according to your settings.',
      color: 0x6366F1, // Indigo / Primary
      fields: [
        { name: 'System Status', value: 'Active & Monitoring', inline: true },
        { name: 'Timestamp', value: new Date().toLocaleTimeString(), inline: true },
        { name: 'Triggered By', value: 'Manual Test Webhook', inline: true }
      ]
    },
    webhookUrl
  );

  if (!success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Failed to send test notification. Please verify that the Discord webhook URL is valid and accessible.'
    });
  }

  return { success: true, message: 'Discord test notification dispatched successfully!' };
});
