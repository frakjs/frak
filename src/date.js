function plural(string, value) {
    return `${string}${value === 1 ? '' : 's'}`;
}

export function relative(date) {
    const datetime = new Date(date);
    const now = new Date();
    const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ];

    let seconds = Math.abs((datetime - now) / 1000);
    let agoOrFromNow = datetime > now ? 'from now' : 'ago';
    let unit = 'second';
    let value = 0;

    if (seconds < 30) {
        value = 'just';
        unit = 'now';
        agoOrFromNow = '';
    } else if (seconds < 60) {
        // Less than a minute
        value = Math.floor(seconds);
        unit = plural('second', value);
    } else if (seconds < 60 * 60) {
        // Less than an hour
        value = Math.floor(seconds / 60);
        unit = plural('minute', value);
    } else if (seconds < 60 * 60 * 24) {
        // Less than a day
        value = Math.floor(seconds / 60 / 60);
        unit = plural('hour', value);
    } else if (seconds < 60 * 60 * 24 * 7) {
        // Less than a week
        value = Math.floor(seconds / 60 / 60 / 24);
        unit = plural('day', value);
    } else if (seconds < 60 * 60 * 24 * 30) {
        // Less than a month
        value = Math.floor(seconds / 60 / 60 / 24 / 7);
        unit = plural('week', value);
    } else if (seconds < 60 * 60 * 24 * 365) {
        // Less than a year
        value = Math.floor(seconds / 60 / 60 / 24 / 30);
        unit = plural('month', value);
    } else {
        return `${months[datetime.getMonth()]} ${datetime.getDate()}, ${datetime.getFullYear()} @ ${datetime.getHours() % 12}:${`0${datetime.getMinutes()}`.slice(-2)} ${datetime.getHours() >= 12 ? 'pm' : 'am'}`;
    }

    return `${value} ${unit} ${agoOrFromNow}`.trim();
}
