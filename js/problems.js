(function () {
const int = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (items) => items[int(0, items.length - 1)];
const weightedPick = (items) => {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item.value;
  }
  return items[items.length - 1].value;
};

const gcd = (a, b) => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
};

const id = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

const roundHalfEven = (value, decimals = 0) => {
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  if (Math.abs(diff - 0.5) < Number.EPSILON * 100) {
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  return Math.round(scaled) / factor;
};

const problem = ({ drillType, subType, problemText, correctAnswer, tolerance = 0, difficulty = 1 }) => ({
  problemId: id(),
  drillType,
  subType,
  problemText,
  correctAnswer,
  tolerance,
  difficulty
});

const MODE_LABELS = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  custom: "Focused"
};

const SUBMODE_OPTIONS = {
  morning: [{ value: "standard", label: "Standard Zetamac", duration: 120 }],
  afternoon: [
    { value: "bigger_numbers", label: "Bigger Numbers", duration: 120 },
    { value: "division_heavy", label: "Division Heavy", duration: 120 },
    { value: "percentages", label: "Percentages", duration: 120 }
  ],
  evening: [
    { value: "fraction_to_decimal", label: "Fractions to Decimals", duration: 180 },
    { value: "percentage_chains", label: "Percentage Chains", duration: 180 },
    { value: "log_exp", label: "Log/Exp Approximations", duration: 180 },
    { value: "negative_numbers", label: "Negative Numbers", duration: 180 },
    { value: "probability", label: "Probability Arithmetic", duration: 180 },
    { value: "squares_roots", label: "Squares and Square Roots", duration: 180 },
    { value: "compound", label: "Compound Mental Math", duration: 180 }
  ]
};

const SUBTYPE_LABELS = {
  add_small: "Addition with smaller operands",
  add_large: "Addition with larger operands",
  sub_small: "Subtraction with smaller answers",
  sub_large: "Subtraction with larger answers",
  mult_table: "Table multiplication",
  mult_2x2: "Two-digit multiplication",
  mult_2x3: "Two-by-three digit multiplication",
  div_clean: "Clean division",
  div_hard: "Division with hard divisors",
  div_decimal: "Decimal division",
  pct_clean: "Clean percentages",
  pct_messy: "Messy percentages",
  pct_reverse: "Reverse percentages",
  frac_low_denom: "Fractions with low denominators",
  frac_high_denom: "Fractions with high denominators",
  pct_chain_two: "Two-step percentage chains",
  pct_chain_three: "Three-step percentage chains",
  log_small_x: "Natural logs below 2",
  log_large_x: "Natural logs above 2",
  exp_negative: "Negative exponentials",
  exp_positive: "Positive exponentials",
  neg_add: "Signed addition",
  neg_sub: "Signed subtraction",
  neg_mult: "Signed multiplication",
  neg_div: "Signed division",
  prob_independent: "Independent probabilities",
  prob_complement: "Probability complements",
  prob_bayes: "Bayes arithmetic",
  prob_odds: "Odds to probability",
  square_exact: "Squares",
  root_approx: "Square roots",
  compound_pct: "Compound percentage math",
  compound_average: "Averages",
  compound_change: "Percent changes"
};

const getSubModeLabel = (mode, subMode) => {
  const option = SUBMODE_OPTIONS[mode]?.find((item) => item.value === subMode);
  return option ? option.label : subMode.replaceAll("_", " ");
};

const getSubtypeLabel = (subType) => SUBTYPE_LABELS[subType] || subType.replaceAll("_", " ");

const getToleranceHint = (subMode, subType) => {
  if (subType?.startsWith("frac_")) return "Answer to 4 decimal places";
  if (subType?.startsWith("prob_")) return "Answer to 3 decimal places";
  if (subType === "div_decimal") return "Answer to 3 decimal places";
  if (subType?.startsWith("log_") || subType?.startsWith("exp_") || subType === "root_approx") return "Answer to 2 decimal places";
  if (subType?.startsWith("pct_")) return "Nearest integer or 1 decimal is fine";
  return "";
};

function standardAdd() {
  const a = int(2, 100);
  const b = int(2, 100);
  return problem({
    drillType: "standard_add",
    subType: a < 50 && b < 50 ? "add_small" : "add_large",
    problemText: `${a} + ${b}`,
    correctAnswer: a + b,
    difficulty: a < 50 && b < 50 ? 1 : 2
  });
}

function standardSub() {
  const result = int(2, 100);
  const a = int(2, 100);
  const c = result + a;
  return problem({
    drillType: "standard_sub",
    subType: result < 50 && a < 50 ? "sub_small" : "sub_large",
    problemText: `${c} - ${a}`,
    correctAnswer: result,
    difficulty: result < 50 ? 1 : 2
  });
}

function standardMult() {
  const a = int(2, 12);
  const b = int(2, 100);
  return problem({
    drillType: "standard_mult",
    subType: "mult_table",
    problemText: `${a} x ${b}`,
    correctAnswer: a * b,
    difficulty: b <= 25 ? 1 : 2
  });
}

function standardDiv() {
  const a = int(2, 12);
  const b = int(2, 100);
  return problem({
    drillType: "standard_div",
    subType: a >= 7 ? "div_hard" : "div_clean",
    problemText: `${a * b} / ${a}`,
    correctAnswer: b,
    difficulty: a >= 7 ? 3 : 2
  });
}

function biggerAdd() {
  const a = int(10, 999);
  const b = int(10, 999);
  return problem({
    drillType: "extended_add",
    subType: a >= 100 || b >= 100 ? "add_large" : "add_small",
    problemText: `${a} + ${b}`,
    correctAnswer: a + b,
    difficulty: 3
  });
}

function biggerSub() {
  const result = int(10, 999);
  const a = int(10, 999);
  return problem({
    drillType: "extended_sub",
    subType: result >= 100 || a >= 100 ? "sub_large" : "sub_small",
    problemText: `${result + a} - ${a}`,
    correctAnswer: result,
    difficulty: 3
  });
}

function biggerMult() {
  const a = int(11, 25);
  const b = int(11, 99);
  const subType = b >= 100 || a >= 100 ? "mult_2x3" : "mult_2x2";
  return problem({
    drillType: "extended_mult",
    subType,
    problemText: `${a} x ${b}`,
    correctAnswer: a * b,
    difficulty: 4
  });
}

function biggerDiv() {
  const divisor = int(7, 25);
  const quotient = int(10, Math.floor(9999 / divisor));
  return problem({
    drillType: "extended_div",
    subType: divisor <= 13 ? "div_hard" : "div_clean",
    problemText: `${divisor * quotient} / ${divisor}`,
    correctAnswer: quotient,
    difficulty: divisor <= 13 ? 4 : 3
  });
}

function decimalDiv() {
  const a = int(7, 29);
  const b = int(11, 99);
  return problem({
    drillType: "decimal_div",
    subType: "div_decimal",
    problemText: `${b} / ${a}`,
    correctAnswer: roundHalfEven(b / a, 3),
    tolerance: 0.001,
    difficulty: 5
  });
}

function percentage() {
  const variant = weightedPick([
    { value: "clean", weight: 4 },
    { value: "messy", weight: 4 },
    { value: "reverse", weight: 2 }
  ]);
  if (variant === "clean") {
    const pct = int(1, 99);
    const y = int(1, 100) * 100;
    const answer = (pct / 100) * y;
    return problem({
      drillType: "percentage",
      subType: "pct_clean",
      problemText: `${pct}% of ${y}`,
      correctAnswer: answer,
      tolerance: answer > 100 ? 5 : 0.5,
      difficulty: 2
    });
  }
  if (variant === "messy") {
    const pct = int(1, 50);
    const y = int(100, 9999);
    const answer = (pct / 100) * y;
    return problem({
      drillType: "percentage",
      subType: "pct_messy",
      problemText: `${pct}% of ${y}`,
      correctAnswer: roundHalfEven(answer, answer > 100 ? 0 : 1),
      tolerance: answer > 100 ? 5 : 0.5,
      difficulty: 4
    });
  }
  const b = int(100, 9999);
  const pct = int(1, 99);
  const a = Math.round((pct / 100) * b);
  return problem({
    drillType: "percentage",
    subType: "pct_reverse",
    problemText: `What % is ${a} of ${b}?`,
    correctAnswer: roundHalfEven((a / b) * 100, 1),
    tolerance: 0.5,
    difficulty: 4
  });
}

function fractionToDecimal() {
  let p;
  let q;
  do {
    p = int(1, 30);
    q = int(7, 23);
  } while (gcd(p, q) !== 1);
  return problem({
    drillType: "fraction_to_decimal",
    subType: q <= 11 ? "frac_low_denom" : "frac_high_denom",
    problemText: `${p} / ${q}`,
    correctAnswer: roundHalfEven(p / q, 4),
    tolerance: 0.0005,
    difficulty: q <= 11 ? 3 : 5
  });
}

function percentageChain() {
  const steps = Math.random() < 0.75 ? 2 : 3;
  const base = int(100, 2500);
  const pcts = Array.from({ length: steps }, () => pick([5, 8, 10, 12, 15, 20, 25, 30, 33, 40, 50, 60, 75]));
  const answer = pcts.reduce((value, pct) => value * (pct / 100), base);
  const text = `${pcts[0]}% of ${base}${pcts.slice(1).map((pct) => `, then ${pct}% of that`).join("")}`;
  return problem({
    drillType: "percentage_chain",
    subType: steps === 2 ? "pct_chain_two" : "pct_chain_three",
    problemText: text,
    correctAnswer: roundHalfEven(answer, 2),
    tolerance: Math.max(1, Math.abs(answer) * 0.005),
    difficulty: steps === 2 ? 4 : 5
  });
}

function logExp() {
  const isLog = Math.random() < 0.55;
  if (isLog) {
    const choices = [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.5, 3, 4, 5, 10, 100, Math.E];
    const x = pick(choices);
    return problem({
      drillType: "log_exp",
      subType: x < 2 ? "log_small_x" : "log_large_x",
      problemText: x === Math.E ? "ln(e)" : `ln(${x})`,
      correctAnswer: roundHalfEven(Math.log(x), 2),
      tolerance: 0.05,
      difficulty: x < 2 ? 4 : 3
    });
  }
  const x = int(-8, 12) / 4;
  return problem({
    drillType: "log_exp",
    subType: x < 0 ? "exp_negative" : "exp_positive",
    problemText: `e^${x}`,
    correctAnswer: roundHalfEven(Math.exp(x), 2),
    tolerance: 0.05,
    difficulty: Math.abs(x) > 1.5 ? 5 : 4
  });
}

function negativeNumbers() {
  const op = pick(["+", "-", "x", "/"]);
  if (op === "/") {
    const divisor = pick([-12, -9, -8, -7, -6, -4, -3, 3, 4, 6, 7, 8, 9, 12]);
    const quotient = int(-25, 25) || 6;
    return problem({
      drillType: "negative_numbers",
      subType: "neg_div",
      problemText: `${divisor * quotient} / ${divisor}`,
      correctAnswer: quotient,
      difficulty: 3
    });
  }
  const a = int(-99, 99) || -47;
  const b = int(-99, 99) || 23;
  const answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
  return problem({
    drillType: "negative_numbers",
    subType: op === "+" ? "neg_add" : op === "-" ? "neg_sub" : "neg_mult",
    problemText: `${a} ${op} ${b}`,
    correctAnswer: answer,
    difficulty: op === "x" ? 4 : 3
  });
}

function probability() {
  const variant = pick(["independent", "complement", "bayes", "odds"]);
  if (variant === "independent") {
    const a = int(1, 9) / 10;
    const b = int(1, 9) / 10;
    return problem({
      drillType: "probability",
      subType: "prob_independent",
      problemText: `P(A)=${a}, P(B)=${b}. P(A and B)?`,
      correctAnswer: roundHalfEven(a * b, 3),
      tolerance: 0.005,
      difficulty: 3
    });
  }
  if (variant === "complement") {
    const p = int(1, 8) / 10;
    const n = pick([2, 3, 4]);
    return problem({
      drillType: "probability",
      subType: "prob_complement",
      problemText: `At least one of ${n} independent events, p=${p}?`,
      correctAnswer: roundHalfEven(1 - (1 - p) ** n, 3),
      tolerance: 0.005,
      difficulty: 4
    });
  }
  if (variant === "bayes") {
    const pA = pick([0.2, 0.3, 0.4, 0.5]);
    const pBgA = pick([0.6, 0.7, 0.8, 0.9]);
    const pBgNotA = pick([0.1, 0.2, 0.3]);
    const numerator = pBgA * pA;
    const answer = numerator / (numerator + pBgNotA * (1 - pA));
    return problem({
      drillType: "probability",
      subType: "prob_bayes",
      problemText: `P(A)=${pA}, P(B|A)=${pBgA}, P(B|not A)=${pBgNotA}. P(A|B)?`,
      correctAnswer: roundHalfEven(answer, 3),
      tolerance: 0.005,
      difficulty: 5
    });
  }
  const win = int(1, 9);
  const lose = int(1, 9);
  return problem({
    drillType: "probability",
    subType: "prob_odds",
    problemText: `${win}:${lose} odds -> probability?`,
    correctAnswer: roundHalfEven(win / (win + lose), 3),
    tolerance: 0.005,
    difficulty: 3
  });
}

function squaresRoots() {
  if (Math.random() < 0.55) {
    const n = int(11, 99);
    return problem({
      drillType: "squares_roots",
      subType: "square_exact",
      problemText: `${n}^2`,
      correctAnswer: n * n,
      difficulty: n <= 30 ? 3 : 4
    });
  }
  const n = int(2, 200);
  return problem({
    drillType: "squares_roots",
    subType: "root_approx",
    problemText: `sqrt(${n})`,
    correctAnswer: roundHalfEven(Math.sqrt(n), 2),
    tolerance: 0.05,
    difficulty: 4
  });
}

function compound() {
  const variant = pick(["pct", "avg", "change"]);
  if (variant === "pct") {
    const pct = int(5, 35);
    const a = int(12, 99);
    const b = int(6, 25);
    return problem({
      drillType: "compound",
      subType: "compound_pct",
      problemText: `${pct}% of (${a} x ${b})`,
      correctAnswer: roundHalfEven((pct / 100) * a * b, 1),
      tolerance: 0.5,
      difficulty: 5
    });
  }
  if (variant === "avg") {
    const nums = Array.from({ length: 4 }, () => int(20, 99));
    return problem({
      drillType: "compound",
      subType: "compound_average",
      problemText: `Average of ${nums.join(", ")}`,
      correctAnswer: roundHalfEven(nums.reduce((a, b) => a + b, 0) / nums.length, 1),
      tolerance: 0.1,
      difficulty: 4
    });
  }
  const start = int(20, 200);
  const end = int(20, 220);
  return problem({
    drillType: "compound",
    subType: "compound_change",
    problemText: `Price ${start} -> ${end}. % change?`,
    correctAnswer: roundHalfEven(((end - start) / start) * 100, 1),
    tolerance: 0.5,
    difficulty: 4
  });
}

const subtypeGenerators = {
  add_small: () => {
    const a = int(2, 49);
    const b = int(2, 49);
    return problem({ drillType: "standard_add", subType: "add_small", problemText: `${a} + ${b}`, correctAnswer: a + b, difficulty: 1 });
  },
  add_large: biggerAdd,
  sub_small: () => {
    const result = int(2, 49);
    const a = int(2, 49);
    return problem({ drillType: "standard_sub", subType: "sub_small", problemText: `${result + a} - ${a}`, correctAnswer: result, difficulty: 1 });
  },
  sub_large: biggerSub,
  mult_table: standardMult,
  mult_2x2: biggerMult,
  mult_2x3: () => {
    const a = int(11, 99);
    const b = int(100, 999);
    return problem({ drillType: "extended_mult", subType: "mult_2x3", problemText: `${a} x ${b}`, correctAnswer: a * b, difficulty: 5 });
  },
  div_clean: () => {
    const a = int(2, 6);
    const b = int(2, 100);
    return problem({ drillType: "standard_div", subType: "div_clean", problemText: `${a * b} / ${a}`, correctAnswer: b, difficulty: 2 });
  },
  div_hard: () => {
    const a = int(7, 13);
    const b = int(12, 160);
    return problem({ drillType: "extended_div", subType: "div_hard", problemText: `${a * b} / ${a}`, correctAnswer: b, difficulty: 4 });
  },
  div_decimal: decimalDiv,
  pct_clean: () => percentageByVariant("clean"),
  pct_messy: () => percentageByVariant("messy"),
  pct_reverse: () => percentageByVariant("reverse"),
  frac_low_denom: () => fractionByDenom(false),
  frac_high_denom: () => fractionByDenom(true),
  pct_chain_two: () => percentageChainBySteps(2),
  pct_chain_three: () => percentageChainBySteps(3),
  log_small_x: () => logBySize(false),
  log_large_x: () => logBySize(true),
  exp_negative: () => expBySign(false),
  exp_positive: () => expBySign(true),
  neg_add: () => negativeByOp("+"),
  neg_sub: () => negativeByOp("-"),
  neg_mult: () => negativeByOp("x"),
  neg_div: () => negativeByOp("/"),
  prob_independent: () => probabilityByVariant("independent"),
  prob_complement: () => probabilityByVariant("complement"),
  prob_bayes: () => probabilityByVariant("bayes"),
  prob_odds: () => probabilityByVariant("odds"),
  square_exact: () => {
    const n = int(11, 99);
    return problem({ drillType: "squares_roots", subType: "square_exact", problemText: `${n}^2`, correctAnswer: n * n, difficulty: 4 });
  },
  root_approx: () => {
    const n = int(2, 200);
    return problem({ drillType: "squares_roots", subType: "root_approx", problemText: `sqrt(${n})`, correctAnswer: roundHalfEven(Math.sqrt(n), 2), tolerance: 0.05, difficulty: 4 });
  },
  compound_pct: () => compoundByVariant("pct"),
  compound_average: () => compoundByVariant("avg"),
  compound_change: () => compoundByVariant("change")
};

function percentageByVariant(variant) {
  if (variant === "clean") {
    const pct = int(1, 99);
    const y = int(1, 100) * 100;
    const answer = (pct / 100) * y;
    return problem({
      drillType: "percentage",
      subType: "pct_clean",
      problemText: `${pct}% of ${y}`,
      correctAnswer: answer,
      tolerance: answer > 100 ? 5 : 0.5,
      difficulty: 2
    });
  }
  if (variant === "messy") {
    const pct = int(1, 50);
    const y = int(100, 9999);
    const answer = (pct / 100) * y;
    return problem({
      drillType: "percentage",
      subType: "pct_messy",
      problemText: `${pct}% of ${y}`,
      correctAnswer: roundHalfEven(answer, answer > 100 ? 0 : 1),
      tolerance: answer > 100 ? 5 : 0.5,
      difficulty: 4
    });
  }
  const b = int(100, 9999);
  const pct = int(1, 99);
  const a = Math.round((pct / 100) * b);
  return problem({
    drillType: "percentage",
    subType: "pct_reverse",
    problemText: `What % is ${a} of ${b}?`,
    correctAnswer: roundHalfEven((a / b) * 100, 1),
    tolerance: 0.5,
    difficulty: 4
  });
}

function fractionByDenom(high) {
  let p;
  let q;
  do {
    p = int(1, 30);
    q = high ? int(13, 23) : int(7, 11);
  } while (gcd(p, q) !== 1);
  return problem({
    drillType: "fraction_to_decimal",
    subType: high ? "frac_high_denom" : "frac_low_denom",
    problemText: `${p} / ${q}`,
    correctAnswer: roundHalfEven(p / q, 4),
    tolerance: 0.0005,
    difficulty: high ? 5 : 3
  });
}

function percentageChainBySteps(steps) {
  const base = int(100, 2500);
  const pcts = Array.from({ length: steps }, () => pick([5, 8, 10, 12, 15, 20, 25, 30, 33, 40, 50, 60, 75]));
  const answer = pcts.reduce((value, pct) => value * (pct / 100), base);
  const text = `${pcts[0]}% of ${base}${pcts.slice(1).map((pct) => `, then ${pct}% of that`).join("")}`;
  return problem({
    drillType: "percentage_chain",
    subType: steps === 2 ? "pct_chain_two" : "pct_chain_three",
    problemText: text,
    correctAnswer: roundHalfEven(answer, 2),
    tolerance: Math.max(1, Math.abs(answer) * 0.005),
    difficulty: steps === 2 ? 4 : 5
  });
}

function logBySize(large) {
  const x = large ? pick([2, 2.5, 3, 4, 5, 10, 100, Math.E]) : pick([1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9]);
  return problem({
    drillType: "log_exp",
    subType: large ? "log_large_x" : "log_small_x",
    problemText: x === Math.E ? "ln(e)" : `ln(${x})`,
    correctAnswer: roundHalfEven(Math.log(x), 2),
    tolerance: 0.05,
    difficulty: large ? 3 : 4
  });
}

function expBySign(positive) {
  const x = positive ? int(0, 12) / 4 : int(-8, -1) / 4;
  return problem({
    drillType: "log_exp",
    subType: positive ? "exp_positive" : "exp_negative",
    problemText: `e^${x}`,
    correctAnswer: roundHalfEven(Math.exp(x), 2),
    tolerance: 0.05,
    difficulty: 4
  });
}

function negativeByOp(op) {
  if (op === "/") {
    const divisor = pick([-12, -9, -8, -7, -6, -4, -3, 3, 4, 6, 7, 8, 9, 12]);
    const quotient = int(-25, 25) || 6;
    return problem({ drillType: "negative_numbers", subType: "neg_div", problemText: `${divisor * quotient} / ${divisor}`, correctAnswer: quotient, difficulty: 3 });
  }
  const a = int(-99, 99) || -47;
  const b = int(-99, 99) || 23;
  const answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
  return problem({ drillType: "negative_numbers", subType: op === "+" ? "neg_add" : op === "-" ? "neg_sub" : "neg_mult", problemText: `${a} ${op} ${b}`, correctAnswer: answer, difficulty: op === "x" ? 4 : 3 });
}

function probabilityByVariant(variant) {
  if (variant === "independent") {
    const a = int(1, 9) / 10;
    const b = int(1, 9) / 10;
    return problem({
      drillType: "probability",
      subType: "prob_independent",
      problemText: `P(A)=${a}, P(B)=${b}. P(A and B)?`,
      correctAnswer: roundHalfEven(a * b, 3),
      tolerance: 0.005,
      difficulty: 3
    });
  }
  if (variant === "complement") {
    const p = int(1, 8) / 10;
    const n = pick([2, 3, 4]);
    return problem({
      drillType: "probability",
      subType: "prob_complement",
      problemText: `At least one of ${n} independent events, p=${p}?`,
      correctAnswer: roundHalfEven(1 - (1 - p) ** n, 3),
      tolerance: 0.005,
      difficulty: 4
    });
  }
  if (variant === "bayes") {
    const pA = pick([0.2, 0.3, 0.4, 0.5]);
    const pBgA = pick([0.6, 0.7, 0.8, 0.9]);
    const pBgNotA = pick([0.1, 0.2, 0.3]);
    const numerator = pBgA * pA;
    const answer = numerator / (numerator + pBgNotA * (1 - pA));
    return problem({
      drillType: "probability",
      subType: "prob_bayes",
      problemText: `P(A)=${pA}, P(B|A)=${pBgA}, P(B|not A)=${pBgNotA}. P(A|B)?`,
      correctAnswer: roundHalfEven(answer, 3),
      tolerance: 0.005,
      difficulty: 5
    });
  }
  const win = int(1, 9);
  const lose = int(1, 9);
  return problem({
    drillType: "probability",
    subType: "prob_odds",
    problemText: `${win}:${lose} odds -> probability?`,
    correctAnswer: roundHalfEven(win / (win + lose), 3),
    tolerance: 0.005,
    difficulty: 3
  });
}

function compoundByVariant(variant) {
  if (variant === "pct") {
    const pct = int(5, 35);
    const a = int(12, 99);
    const b = int(6, 25);
    return problem({
      drillType: "compound",
      subType: "compound_pct",
      problemText: `${pct}% of (${a} x ${b})`,
      correctAnswer: roundHalfEven((pct / 100) * a * b, 1),
      tolerance: 0.5,
      difficulty: 5
    });
  }
  if (variant === "avg") {
    const nums = Array.from({ length: 4 }, () => int(20, 99));
    return problem({
      drillType: "compound",
      subType: "compound_average",
      problemText: `Average of ${nums.join(", ")}`,
      correctAnswer: roundHalfEven(nums.reduce((a, b) => a + b, 0) / nums.length, 1),
      tolerance: 0.1,
      difficulty: 4
    });
  }
  const start = int(20, 200);
  const end = int(20, 220);
  return problem({
    drillType: "compound",
    subType: "compound_change",
    problemText: `Price ${start} -> ${end}. % change?`,
    correctAnswer: roundHalfEven(((end - start) / start) * 100, 1),
    tolerance: 0.5,
    difficulty: 4
  });
}

function generateProblem(config, seenInRound = new Set()) {
  const make = () => {
    if (config.focusedSubType && subtypeGenerators[config.focusedSubType]) {
      return subtypeGenerators[config.focusedSubType]();
    }
    if (config.mode === "morning") return pick([standardAdd, standardSub, standardMult, standardDiv])();
    if (config.mode === "afternoon" && config.subMode === "bigger_numbers") return pick([biggerAdd, biggerSub, biggerMult, biggerDiv])();
    if (config.mode === "afternoon" && config.subMode === "division_heavy") {
      return weightedPick([
        { value: decimalDiv, weight: 7 },
        { value: standardAdd, weight: 1 },
        { value: standardSub, weight: 1 },
        { value: biggerDiv, weight: 1 }
      ])();
    }
    if (config.mode === "afternoon" && config.subMode === "percentages") return percentage();
    if (config.mode === "evening" && config.subMode === "fraction_to_decimal") return fractionToDecimal();
    if (config.mode === "evening" && config.subMode === "percentage_chains") return percentageChain();
    if (config.mode === "evening" && config.subMode === "log_exp") return logExp();
    if (config.mode === "evening" && config.subMode === "negative_numbers") return negativeNumbers();
    if (config.mode === "evening" && config.subMode === "probability") return probability();
    if (config.mode === "evening" && config.subMode === "squares_roots") return squaresRoots();
    if (config.mode === "evening" && config.subMode === "compound") return compound();
    return standardAdd();
  };

  for (let attempts = 0; attempts < 100; attempts += 1) {
    const generated = make();
    const key = `${generated.drillType}:${generated.problemText}`;
    if (!seenInRound.has(key)) {
      seenInRound.add(key);
      return generated;
    }
  }
  return make();
}

function generateSimilarProblems(subType, count = 10) {
  const seen = new Set();
  return Array.from({ length: count }, () => generateProblem({ focusedSubType: subType }, seen));
}

window.MMTProblems = {
  MODE_LABELS,
  SUBMODE_OPTIONS,
  SUBTYPE_LABELS,
  generateProblem,
  generateSimilarProblems,
  getSubModeLabel,
  getSubtypeLabel,
  getToleranceHint
};
})();
