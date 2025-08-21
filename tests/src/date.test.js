import assert from 'node:assert';
import * as date from '../../src/date.js';
import test, { suite } from 'node:test';

suite('src/date.js', () => {
    test('can generate relative date', () => {
        let datetime;

        // Just now
        assert.equal(date.relative(new Date()), 'just now');

        // 30 seconds from now
        assert.equal(date.relative(new Date(Date.now() + 30 * 1000)), '30 seconds from now');

        // 15 minutes from now
        assert.equal(date.relative(new Date(Date.now() + 15 * 60 * 1000 + 1000)), '15 minutes from now');

        // 2 hours from now
        assert.equal(date.relative(new Date(Date.now() + 2 * 60 * 60 * 1000 + 1000)), '2 hours from now');

        // 1 day from now
        assert.equal(date.relative(new Date(Date.now() + 24 * 60 * 60 * 1000)), '1 day from now');

        // 2 weeks from now
        assert.equal(date.relative(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)), '2 weeks from now');

        // 1 month from now
        assert.equal(date.relative(new Date(Date.now() + 31 * 24 * 60 * 60 * 1000)), '1 month from now');

        // Formatted, a.m.
        datetime = new Date('2022-01-01T10:00:00.000Z');
        assert.equal(date.relative(datetime), 'Jan 1, 2022 @ 5:00 am');

        datetime = new Date('2022-02-12T10:00:00.000Z');
        assert.equal(date.relative(datetime), 'Feb 12, 2022 @ 5:00 am');

        datetime = new Date('2022-03-28T10:00:00.000Z');
        assert.equal(date.relative(datetime), 'Mar 28, 2022 @ 6:00 am');

        datetime = new Date('2022-04-12T10:00:00.000Z');
        assert.equal(date.relative(datetime), 'Apr 12, 2022 @ 6:00 am');

        datetime = new Date('2022-05-12T10:00:00.000Z');
        assert.equal(date.relative(datetime), 'May 12, 2022 @ 6:00 am');

        datetime = new Date('2022-06-12T10:00:00.000Z');
        assert.equal(date.relative(datetime), 'Jun 12, 2022 @ 6:00 am');

        datetime = new Date('2022-07-12T10:00:00.000Z');
        assert.equal(date.relative(datetime), 'Jul 12, 2022 @ 6:00 am');

        datetime = new Date('2022-08-12T10:00:00.000Z');
        assert.equal(date.relative(datetime), 'Aug 12, 2022 @ 6:00 am');

        datetime = new Date('2022-09-12T10:00:00.000Z');
        assert.equal(date.relative(datetime), 'Sep 12, 2022 @ 6:00 am');

        datetime = new Date('2022-10-12T10:00:00.000Z');
        assert.equal(date.relative(datetime), 'Oct 12, 2022 @ 6:00 am');

        datetime = new Date('2022-11-12T10:00:00.000Z');
        assert.equal(date.relative(datetime), 'Nov 12, 2022 @ 5:00 am');

        datetime = new Date('2022-12-12T10:00:00.000Z');
        assert.equal(date.relative(datetime), 'Dec 12, 2022 @ 5:00 am');

        // Formatted, p.m.
        datetime = new Date('2022-02-01T18:00:00.000Z');
        assert.equal(date.relative(datetime), 'Feb 1, 2022 @ 1:00 pm');

        // 30 seconds ago
        assert.equal(date.relative(new Date(Date.now() - 30 * 1000)), '30 seconds ago');

        // 15 minutes ago
        assert.equal(date.relative(new Date(Date.now() - 15 * 60 * 1000 - 1000)), '15 minutes ago');

        // 2 hours ago
        assert.equal(date.relative(new Date(Date.now() - 2 * 60 * 60 * 1000 - 1000)), '2 hours ago');

        // 1 day ago
        assert.equal(date.relative(new Date(Date.now() - 24 * 60 * 60 * 1000)), '1 day ago');

        // 2 weeks ago
        assert.equal(date.relative(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)), '2 weeks ago');

        // 1 month ago
        assert.equal(date.relative(new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)), '1 month ago');
    });
});
