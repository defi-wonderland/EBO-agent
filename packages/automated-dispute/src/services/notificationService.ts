/**
 * Interface representing a notification service capable of sending error notifications.
 */
export interface NotificationService {
    /**
     * Sends an error notification along with optional contextual information.
     *
     * @param error - The error object containing information about the error that occurred.
     * @param context - Additional context or data related to the error
     * @returns A promise that resolves when the notification process is complete.
     */
    notifyError(error: Error, context: any): Promise<void>;
}
