export type Difficulty = "easy" | "medium" | "hard";

export interface CheckResult {
  pass: boolean;
  reason: string;
}

export interface TestCase {
  /** Positional args passed to the generated function, must be JSON-serializable. */
  args: unknown[];
  /** Human-readable label shown in results, e.g. "nums=[2,7,11,15], target=9". */
  label: string;
  /** Runs against the parsed JSON return value when the call didn't raise. */
  check: (value: unknown) => CheckResult;
}

export interface Problem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  /** The exact name the generated Python function must have. */
  functionName: string;
  /**
   * LeetCode-style problem statement. Prefilled into the solver's prompt box as a
   * starting point — the point of the exercise is what they add to it.
   */
  statement: string;
  /**
   * The first `visibleCount` entries of testCases get full detail every turn
   * (input, expected, actual). The rest are graded but only revealed as an
   * aggregate pass count until the final turn or a full solve — showing exact
   * hidden inputs on every turn would turn iteration into "guess the test suite"
   * instead of testing whether the solver generalizes from feedback.
   */
  visibleCount: number;
  /**
   * Rough token cost (input+output, summed across all turns) of a clean single-turn
   * solve. Scoring uses this as a baseline for a token-efficiency penalty — going
   * over budget costs points on top of the turn-number penalty.
   */
  tokenBudget: number;
  testCases: TestCase[];
}

function exactMatch(expected: unknown): (value: unknown) => CheckResult {
  return (value) => {
    const pass = JSON.stringify(value) === JSON.stringify(expected);
    return {
      pass,
      reason: pass ? "Correct." : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}.`,
    };
  };
}

function sortedMatch(expected: number[][]): (value: unknown) => CheckResult {
  const norm = (arr: number[][]) => [...arr].map((x) => [...x]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const expectedSorted = norm(expected);
  return (value) => {
    if (!Array.isArray(value) || !value.every((v) => Array.isArray(v))) {
      return { pass: false, reason: `Expected a list of intervals, got ${JSON.stringify(value)}.` };
    }
    const actualSorted = norm(value as number[][]);
    const pass = JSON.stringify(actualSorted) === JSON.stringify(expectedSorted);
    return {
      pass,
      reason: pass ? "Correct." : `Expected intervals (any order) ${JSON.stringify(expected)}, got ${JSON.stringify(value)}.`,
    };
  };
}

function twoSumCheck(nums: number[], target: number): (value: unknown) => CheckResult {
  return (value) => {
    if (!Array.isArray(value) || value.length !== 2) {
      return { pass: false, reason: `Expected a list of exactly 2 indices, got ${JSON.stringify(value)}.` };
    }
    const [i, j] = value as number[];
    if (
      !Number.isInteger(i) ||
      !Number.isInteger(j) ||
      i === j ||
      i < 0 ||
      j < 0 ||
      i >= nums.length ||
      j >= nums.length
    ) {
      return { pass: false, reason: `Indices out of range or not distinct: ${JSON.stringify(value)}.` };
    }
    const pass = nums[i] + nums[j] === target;
    return {
      pass,
      reason: pass ? "Correct." : `nums[${i}] + nums[${j}] = ${nums[i] + nums[j]}, expected ${target}.`,
    };
  };
}

/**
 * Checks a merge() result against the known-by-construction answer for the large
 * stress-test input (N already-sorted, non-touching single-point intervals — so the
 * correct output is just [[0,0],[2,2],...,[2(n-1),2(n-1)]], in any order). Written
 * as a closed-form check instead of embedding a giant literal expected array.
 */
function mergeStressCheck(n: number): (value: unknown) => CheckResult {
  return (value) => {
    if (!Array.isArray(value)) {
      return { pass: false, reason: "Expected a list of intervals." };
    }
    if (value.length !== n) {
      return { pass: false, reason: `Expected ${n} intervals in the result, got ${value.length}.` };
    }
    const sorted = [...(value as number[][])].map((x) => [...x]).sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < n; i++) {
      const iv = sorted[i];
      if (!Array.isArray(iv) || iv[0] !== 2 * i || iv[1] !== 2 * i) {
        return { pass: false, reason: `Large-input merge produced an incorrect interval around position ${i}.` };
      }
    }
    return { pass: true, reason: "Correct." };
  };
}

const TWO_SUM_STRESS_N = 10_000;
const twoSumStressNums = [...Array(TWO_SUM_STRESS_N).keys(), 10_000_000, 20_000_000];
const twoSumStressTarget = 30_000_000;

const VALID_PARENS_STRESS_N = 25_000;
const validParensStressString = "(".repeat(VALID_PARENS_STRESS_N) + ")".repeat(VALID_PARENS_STRESS_N);

const MERGE_STRESS_N = 10_000;
const mergeStressIntervals = Array.from({ length: MERGE_STRESS_N }, (_, i) => [2 * i, 2 * i]);

const TRAP_STRESS_N = 10_000;
const trapStressHeight = [TRAP_STRESS_N, ...Array(TRAP_STRESS_N).fill(0), TRAP_STRESS_N];
const trapStressExpected = TRAP_STRESS_N * TRAP_STRESS_N;

export const PROBLEMS: Problem[] = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    functionName: "two_sum",
    visibleCount: 2,
    tokenBudget: 400,
    statement: `Given an array of integers \`nums\` and an integer \`target\`, return the indices of the
two numbers that add up to \`target\`.

- Exactly one valid pair exists per input.
- You may not use the same element twice.
- Return the two indices in a list, in any order.

def two_sum(nums: list[int], target: int) -> list[int]:
    ...

Example:
two_sum([2, 7, 11, 15], 9) -> [0, 1]  # nums[0] + nums[1] == 9`,
    testCases: [
      { args: [[2, 7, 11, 15], 9], label: "nums=[2,7,11,15], target=9", check: twoSumCheck([2, 7, 11, 15], 9) },
      { args: [[3, 2, 4], 6], label: "nums=[3,2,4], target=6", check: twoSumCheck([3, 2, 4], 6) },
      { args: [[3, 3], 6], label: "nums=[3,3], target=6", check: twoSumCheck([3, 3], 6) },
      { args: [[-3, 4, 3, 90], 0], label: "nums=[-3,4,3,90], target=0", check: twoSumCheck([-3, 4, 3, 90], 0) },
      { args: [[0, 4, 3, 0], 0], label: "nums=[0,4,3,0], target=0", check: twoSumCheck([0, 4, 3, 0], 0) },
      {
        args: [twoSumStressNums, twoSumStressTarget],
        label: `large input (n=${twoSumStressNums.length}, stress test)`,
        check: twoSumCheck(twoSumStressNums, twoSumStressTarget),
      },
    ],
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "easy",
    functionName: "is_valid",
    visibleCount: 3,
    tokenBudget: 350,
    statement: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']',
determine if the input string is valid.

A string is valid if every open bracket is closed by the same type of bracket, and
brackets close in the correct order.

def is_valid(s: str) -> bool:
    ...

Example:
is_valid("()[]{}") -> True
is_valid("(]") -> False`,
    testCases: [
      { args: ["()"], label: '"()"', check: exactMatch(true) },
      { args: ["()[]{}"], label: '"()[]{}"', check: exactMatch(true) },
      { args: ["(]"], label: '"(]"', check: exactMatch(false) },
      { args: ["([)]"], label: '"([)]"', check: exactMatch(false) },
      { args: ["{[]}"], label: '"{[]}"', check: exactMatch(true) },
      { args: [""], label: '""', check: exactMatch(true) },
      { args: ["("], label: '"("', check: exactMatch(false) },
      { args: ["]"], label: '"]"', check: exactMatch(false) },
      {
        args: [validParensStressString],
        label: `large balanced string (n=${validParensStressString.length} chars, stress test)`,
        check: exactMatch(true),
      },
    ],
  },
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "medium",
    functionName: "merge",
    visibleCount: 2,
    tokenBudget: 500,
    statement: `Given an array of intervals where \`intervals[i] = [start_i, end_i]\`, merge all
overlapping intervals and return the resulting list of non-overlapping intervals
(in any order).

def merge(intervals: list[list[int]]) -> list[list[int]]:
    ...

Example:
merge([[1,3],[2,6],[8,10],[15,18]]) -> [[1,6],[8,10],[15,18]]`,
    testCases: [
      {
        args: [[[1, 3], [2, 6], [8, 10], [15, 18]]],
        label: "[[1,3],[2,6],[8,10],[15,18]]",
        check: sortedMatch([[1, 6], [8, 10], [15, 18]]),
      },
      { args: [[[1, 4], [4, 5]]], label: "[[1,4],[4,5]]", check: sortedMatch([[1, 5]]) },
      { args: [[[1, 4], [0, 4]]], label: "[[1,4],[0,4]]", check: sortedMatch([[0, 4]]) },
      { args: [[[1, 4], [2, 3]]], label: "[[1,4],[2,3]]", check: sortedMatch([[1, 4]]) },
      { args: [[]], label: "[]", check: sortedMatch([]) },
      {
        args: [[[1, 4], [0, 0]]],
        label: "[[1,4],[0,0]]",
        check: sortedMatch([[0, 0], [1, 4]]),
      },
      {
        args: [mergeStressIntervals],
        label: `large input (n=${MERGE_STRESS_N} intervals, stress test)`,
        check: mergeStressCheck(MERGE_STRESS_N),
      },
    ],
  },
  {
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "hard",
    functionName: "trap",
    visibleCount: 2,
    tokenBudget: 650,
    statement: `Given \`n\` non-negative integers representing an elevation map where the width of
each bar is 1, compute how much rainwater it can trap after raining.

def trap(height: list[int]) -> int:
    ...

Example:
trap([0,1,0,2,1,0,1,3,2,1,2,1]) -> 6`,
    testCases: [
      {
        args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]],
        label: "[0,1,0,2,1,0,1,3,2,1,2,1]",
        check: exactMatch(6),
      },
      { args: [[4, 2, 0, 3, 2, 5]], label: "[4,2,0,3,2,5]", check: exactMatch(9) },
      { args: [[]], label: "[]", check: exactMatch(0) },
      { args: [[1]], label: "[1]", check: exactMatch(0) },
      { args: [[5, 4, 3, 2, 1]], label: "[5,4,3,2,1] (monotonic, no trapping)", check: exactMatch(0) },
      { args: [[3, 3, 3, 3]], label: "[3,3,3,3] (flat plateau)", check: exactMatch(0) },
      {
        args: [trapStressHeight],
        label: `two walls, n=${TRAP_STRESS_N} valley (stress test)`,
        check: exactMatch(trapStressExpected),
      },
    ],
  },
];

export function getProblem(slug: string): Problem | undefined {
  return PROBLEMS.find((p) => p.slug === slug);
}
