import crypto from 'node:crypto';

/**
 * Generate a SHA2 hash from the given text.
 *
 * @param {String} text
 * @returns {String}
 */
export function sha256(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}
