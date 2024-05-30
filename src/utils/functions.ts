/**
 * Pauses execution for a specified amount of time.
 *
 * @param {number} time - The duration of the pause.
 * @param {'ms' | 's'} unit - The unit of time for the duration ('ms' for milliseconds, 's' for seconds). Defaults to 'ms'.
 * @returns {Promise<void>} A promise that resolves after the specified duration.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
