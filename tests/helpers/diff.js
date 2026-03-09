/**
 * Creates a unified diff between two strings, compared line-by-line.
 *
 * @param {string} a - The original string.
 * @param {string} b - The modified string.
 * @param {object} [options]
 * @param {string} [options.labelA="a"] - Label for the original string.
 * @param {string} [options.labelB="b"] - Label for the modified string.
 * @param {number} [options.context=3] - Number of context lines around changes.
 * @returns {string} A unified diff string, or empty string if inputs are equal.
 */
export default function diff(a, b, options = {}) {
    const { labelA = 'a', labelB = 'b', context = 3 } = options;

    const linesA = new String(a).split('\n');
    const linesB = new String(b).split('\n');

    // Compute longest common subsequence table
    const m = linesA.length;
    const n = linesB.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = m - 1; i >= 0; i--) {
        for (let j = n - 1; j >= 0; j--) {
            if (linesA[i] === linesB[j]) {
                dp[i][j] = dp[i + 1][j + 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
    }

    // Walk the table to produce diff entries
    const entries = [];
    let i = 0;
    let j = 0;

    while (i < m || j < n) {
        if (i < m && j < n && linesA[i] === linesB[j]) {
            entries.push({ type: ' ', line: linesA[i] });
            i++;
            j++;
        } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
            entries.push({ type: '+', line: linesB[j] });
            j++;
        } else {
            entries.push({ type: '-', line: linesA[i] });
            i++;
        }
    }

    // No differences
    if (entries.every((e) => e.type === ' ')) {
        return '';
    }

    // Group entries into hunks with surrounding context
    const hunks = [];
    let hunkStart = null;

    for (let k = 0; k < entries.length; k++) {
        if (entries[k].type !== ' ') {
            const start = Math.max(0, k - context);
            const end = Math.min(entries.length - 1, k + context);

            if (hunkStart !== null && start <= hunkStart.end + 1) {
                hunkStart.end = end;
            } else {
                if (hunkStart) hunks.push(hunkStart);
                hunkStart = { start, end };
            }
        }
    }
    if (hunkStart) hunks.push(hunkStart);

    // Render unified diff
    const lines = [];
    lines.push(`--- ${labelA}`);
    lines.push(`+++ ${labelB}`);

    for (const hunk of hunks) {
        let aStart = 0;
        let bStart = 0;
        // Count lines in a/b before hunk start
        for (let k = 0; k < hunk.start; k++) {
            if (entries[k].type !== '+') aStart++;
            if (entries[k].type !== '-') bStart++;
        }

        let aCount = 0;
        let bCount = 0;
        for (let k = hunk.start; k <= hunk.end; k++) {
            if (entries[k].type !== '+') aCount++;
            if (entries[k].type !== '-') bCount++;
        }

        lines.push(`@@ -${aStart + 1},${aCount} +${bStart + 1},${bCount} @@`);

        for (let k = hunk.start; k <= hunk.end; k++) {
            lines.push(`${entries[k].type}${entries[k].line}`);
        }
    }

    return lines.join('\n');
}
