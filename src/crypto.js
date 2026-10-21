import crypto from 'node:crypto';

export function sha256(text) {
    if (typeof text === 'number') {
        text = `${text}`;
    }

    return crypto.createHash('sha256').update(text).digest('hex');
}
