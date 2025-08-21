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
    // Less than a minute
    } else if (seconds < 60) {
        value = Math.floor(seconds);
        unit = plural('second', value);
    // Less than an hour
    } else if (seconds < 60 * 60) {
        value = Math.floor(seconds / 60);
        unit = plural('minute', value);
    // Less than a day
    } else if (seconds < 60 * 60 * 24) {
        value = Math.floor(seconds / 60 / 60);
        unit = plural('hour', value);
    // Less than a week
    } else if (seconds < 60 * 60 * 24 * 7) {
        value = Math.floor(seconds / 60 / 60 / 24);
        unit = plural('day', value);
    // Less than a month
    } else if (seconds < 60 * 60 * 24 * 30) {
        value = Math.floor(seconds / 60 / 60 / 24 / 7);
        unit = plural('week', value);
    // Less than a year
    } else if (seconds < 60 * 60 * 24 * 365) {
        value = Math.floor(seconds / 60 / 60 / 24 / 30);
        unit = plural('month', value);
    } else {
        return `${months[datetime.getMonth()]} ${datetime.getDate()}, ${datetime.getFullYear()} @ ${datetime.getHours() % 12}:${`0${datetime.getMinutes()}`.slice(-2)} ${datetime.getHours() >= 12 ? 'pm' : 'am'}`;
    }

    return `${value} ${unit} ${agoOrFromNow}`.trim();
}
