// Sakana 2.7.1 内部物理验证脚本
// 模拟 _run 方程：w = w * d - 2*r - t, r += w * i * 1.2
// 比较 baseline (i=0.08, d=0.99) vs tuned (i=0.052, d=0.992)

const BASELINE = { i: 0.08, d: 0.99 };
const TUNED = { i: 0.052, d: 0.992 };

// 模拟 Sakana 内部弹簧方程
function simulateSpring(r, y, w, t, params, maxFrames) {
  const { i, d } = params;
  let frames = 0;
  let peakR = Math.abs(r);
  let peakY = Math.abs(y);
  let zeroCrossingsR = 0;
  let zeroCrossingsY = 0;
  let prevR = r;
  let prevY = y;
  let settled = false;
  let firstSameDirPeakR = null;
  let firstSameDirPeakY = null;
  const initialSignR = r >= 0 ? 1 : -1;
  const initialSignY = y >= 0 ? 1 : -1;
  let prevW = w;
  let prevT = t;

  while (frames < maxFrames) {
    // Sakana _run 方程
    w = w * d - 2 * r - t;
    r = r + w * i * 1.2;
    t = t * d - 2 * y - w;
    y = y + t * i * 1.2;
    frames++;

    if (Math.abs(r) > peakR) peakR = Math.abs(r);
    if (Math.abs(y) > peakY) peakY = Math.abs(y);
    if ((prevR < 0 && r >= 0) || (prevR > 0 && r <= 0)) zeroCrossingsR++;
    if ((prevY < 0 && y >= 0) || (prevY > 0 && y <= 0)) zeroCrossingsY++;
    prevR = r;
    prevY = y;

    // 检测首次同向峰值（方向与初始同向的峰值）
    if (firstSameDirPeakR === null && frames > 5) {
      if ((initialSignR > 0 && prevW > 0 && w <= 0) || (initialSignR < 0 && prevW < 0 && w >= 0)) {
        firstSameDirPeakR = peakR;
      }
    }
    if (firstSameDirPeakY === null && frames > 5) {
      if ((initialSignY > 0 && prevT > 0 && t <= 0) || (initialSignY < 0 && prevT < 0 && t >= 0)) {
        firstSameDirPeakY = peakY;
      }
    }
    prevW = w;
    prevT = t;

    if (Math.abs(r) < 0.3 && Math.abs(w) < 0.3 && Math.abs(y) < 0.3 && Math.abs(t) < 0.3) {
      settled = true;
      break;
    }
  }

  return {
    frames,
    durationSeconds: +(frames / 60).toFixed(2),
    peakR: +peakR.toFixed(2),
    peakY: +peakY.toFixed(2),
    zeroCrossingsR,
    zeroCrossingsY,
    firstSameDirPeakR: firstSameDirPeakR != null ? +firstSameDirPeakR.toFixed(2) : +peakR.toFixed(2),
    firstSameDirPeakY: firstSameDirPeakY != null ? +firstSameDirPeakY.toFixed(2) : +peakY.toFixed(2),
    settled,
    halfPeriodR: zeroCrossingsR > 0 ? +((frames / 60) / zeroCrossingsR).toFixed(3) : null,
    halfPeriodY: zeroCrossingsY > 0 ? +((frames / 60) / zeroCrossingsY).toFixed(3) : null
  };
}

// 模拟弹跳物理（简化版，用于验证碰撞场景）
function simulateBounce(initialVx, initialVy, bounds) {
  const friction = 0.982;
  const wallBounce = 0.5;
  const stopThreshold = 0.6;
  const maxBounces = 10;
  const bounceEnergyCap = 18;
  const dampingAfterMaxBounces = 0.9;

  let vx = initialVx;
  let vy = initialVy;
  let x = 0;
  let y = 0;
  let bounces = 0;
  let frames = 0;
  let maxImpactVx = 0;
  let maxImpactVy = 0;

  while (frames < 1000) {
    vx *= friction;
    vy *= friction;

    let nextX = x + vx;
    let nextY = y + vy;
    let bounced = false;

    if (nextX <= 0 && vx < 0) {
      maxImpactVx = Math.min(maxImpactVx, vx);
      nextX = 0;
      vx = Math.min(Math.abs(vx) * wallBounce, bounceEnergyCap);
      bounced = true;
    } else if (nextX >= bounds.width - bounds.widgetW && vx > 0) {
      maxImpactVx = Math.max(maxImpactVx, vx);
      nextX = bounds.width - bounds.widgetW;
      vx = -Math.min(Math.abs(vx) * wallBounce, bounceEnergyCap);
      bounced = true;
    }

    if (nextY <= 0 && vy < 0) {
      maxImpactVy = Math.min(maxImpactVy, vy);
      nextY = 0;
      vy = Math.min(Math.abs(vy) * wallBounce, bounceEnergyCap);
      bounced = true;
    } else if (nextY >= bounds.height - bounds.widgetH && vy > 0) {
      maxImpactVy = Math.max(maxImpactVy, vy);
      nextY = bounds.height - bounds.widgetH;
      vy = -Math.min(Math.abs(vy) * wallBounce, bounceEnergyCap);
      bounced = true;
    }

    if (bounced) {
      bounces++;
      if (bounces > maxBounces) {
        vx *= dampingAfterMaxBounces;
        vy *= dampingAfterMaxBounces;
      }
    }

    x = nextX;
    y = nextY;
    frames++;

    if ((Math.abs(vx) < stopThreshold && Math.abs(vy) < stopThreshold) || bounces > maxBounces * 2) {
      break;
    }
  }

  return {
    frames,
    durationSeconds: +(frames / 60).toFixed(2),
    bounces,
    maxImpactVx: +maxImpactVx.toFixed(2),
    maxImpactVy: +maxImpactVy.toFixed(2),
    settled: frames < 1000
  };
}

// ── 测试用例 ──
function runTests() {
  const bounds = { width: 1920, height: 1080, widgetW: 130, widgetH: 150 };
  let allPassed = true;
  const results = {};

  function assert(condition, message) {
    if (!condition) {
      console.error('  ✗ FAIL:', message);
      allPassed = false;
    } else {
      console.log('  ✓ PASS:', message);
    }
  }

  // ── 1. Release 场景 ──
  console.log('\n━━━ Release 场景 (r=35, y=12, w=0, t=0) ━━━');
  const releaseBaseline = simulateSpring(35, 12, 0, 0, BASELINE, 600);
  const releaseTuned = simulateSpring(35, 12, 0, 0, TUNED, 600);
  results.release = { baseline: releaseBaseline, tuned: releaseTuned };

  console.log('Baseline:', JSON.stringify(releaseBaseline));
  console.log('Tuned:  ', JSON.stringify(releaseTuned));

  // tuned 首次同向峰值至少大 35%
  const peakRatio = releaseTuned.firstSameDirPeakR / releaseBaseline.firstSameDirPeakR;
  assert(peakRatio >= 1.35, `tuned 首次同向峰值比 baseline 大 ${(peakRatio - 1) * 100.toFixed(1)}% (要求 ≥35%)`);

  // tuned 零交叉半周期至少长 25%
  const periodRatio = releaseTuned.halfPeriodR / releaseBaseline.halfPeriodR;
  assert(periodRatio >= 1.25, `tuned 零交叉半周期比 baseline 长 ${(periodRatio - 1) * 100.toFixed(1)}% (要求 ≥25%)`);

  // 10 秒内有限且明显衰减
  assert(releaseTuned.durationSeconds <= 10, `tuned 持续时间 ${releaseTuned.durationSeconds}s ≤ 10s`);
  assert(releaseTuned.settled, 'tuned 在 10 秒内稳定');

  // ── 2. LeftWall 场景 ──
  console.log('\n━━━ LeftWall 场景 (vx=-18) ━━━');
  const leftWallBounce = simulateBounce(-18, 0, bounds);
  const leftWallR = Math.max(-44 * 1.2, Math.min(44 * 1.2, leftWallBounce.maxImpactVx * 1.65));
  const leftWallY = Math.max(-28 * 1.2, Math.min(28 * 1.2, 0 * 0.9));
  const leftWallBaseline = simulateSpring(leftWallR, leftWallY, -leftWallR * 0.18, -leftWallY * 0.12, BASELINE, 600);
  const leftWallTuned = simulateSpring(leftWallR, leftWallY, -leftWallR * 0.18, -leftWallY * 0.12, TUNED, 600);
  results.leftWall = { bounce: leftWallBounce, baseline: leftWallBaseline, tuned: leftWallTuned };

  console.log('Bounce:', JSON.stringify(leftWallBounce));
  console.log('Baseline:', JSON.stringify(leftWallBaseline));
  console.log('Tuned:  ', JSON.stringify(leftWallTuned));

  const lwPeakRatio = leftWallTuned.firstSameDirPeakR / leftWallBaseline.firstSameDirPeakR;
  assert(lwPeakRatio >= 1.35, `LeftWall tuned 首次同向峰值比大 ${(lwPeakRatio - 1) * 100.toFixed(1)}% (要求 ≥35%)`);

  const lwPeriodRatio = leftWallTuned.halfPeriodR / leftWallBaseline.halfPeriodR;
  assert(lwPeriodRatio >= 1.25, `LeftWall tuned 零交叉半周期比长 ${(lwPeriodRatio - 1) * 100.toFixed(1)}% (要求 ≥25%)`);

  assert(leftWallTuned.durationSeconds <= 10, `LeftWall tuned 持续时间 ${leftWallTuned.durationSeconds}s ≤ 10s`);
  assert(leftWallTuned.settled, 'LeftWall tuned 在 10 秒内稳定');

  // ── 3. RightWall 场景 ──
  console.log('\n━━━ RightWall 场景 (vx=18) ━━━');
  const rightWallBounce = simulateBounce(18, 0, bounds);
  const rightWallR = Math.max(-44 * 1.2, Math.min(44 * 1.2, rightWallBounce.maxImpactVx * 1.65));
  const rightWallY = Math.max(-28 * 1.2, Math.min(28 * 1.2, 0 * 0.9));
  const rightWallBaseline = simulateSpring(rightWallR, rightWallY, -rightWallR * 0.18, -rightWallY * 0.12, BASELINE, 600);
  const rightWallTuned = simulateSpring(rightWallR, rightWallY, -rightWallR * 0.18, -rightWallY * 0.12, TUNED, 600);
  results.rightWall = { bounce: rightWallBounce, baseline: rightWallBaseline, tuned: rightWallTuned };

  console.log('Bounce:', JSON.stringify(rightWallBounce));
  console.log('Baseline:', JSON.stringify(rightWallBaseline));
  console.log('Tuned:  ', JSON.stringify(rightWallTuned));

  const rwPeakRatio = rightWallTuned.firstSameDirPeakR / rightWallBaseline.firstSameDirPeakR;
  assert(rwPeakRatio >= 1.35, `RightWall tuned 首次同向峰值比大 ${(rwPeakRatio - 1) * 100.toFixed(1)}% (要求 ≥35%)`);

  const rwPeriodRatio = rightWallTuned.halfPeriodR / rightWallBaseline.halfPeriodR;
  assert(rwPeriodRatio >= 1.25, `RightWall tuned 零交叉半周期比长 ${(rwPeriodRatio - 1) * 100.toFixed(1)}% (要求 ≥25%)`);

  assert(rightWallTuned.durationSeconds <= 10, `RightWall tuned 持续时间 ${rightWallTuned.durationSeconds}s ≤ 10s`);
  assert(rightWallTuned.settled, 'RightWall tuned 在 10 秒内稳定');

  // ── 总结 ──
  console.log('\n━━━ 总结 ━━━');
  console.log(JSON.stringify(results, null, 2));

  if (allPassed) {
    console.log('\n✓ 所有测试通过');
    process.exit(0);
  } else {
    console.error('\n✗ 部分测试失败');
    process.exit(1);
  }
}

runTests();
