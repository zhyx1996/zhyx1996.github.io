// Sakana 2.7.1 内部物理验证脚本
// 模拟 _run 方程：两个独立弹簧（无交叉耦合）
// 旋转：w -= 2*r + rotate, r += w*i*1.2, w *= d
// 纵向：t -= 2*y, y += t*i*2, t *= d

// ── 参数定义 ──
// Baseline: 旧映射 (charLeanFactor=0.55/max30, charSwayFactor=0.33/max18, wall 反弹后*0.7/0.4)
const BASELINE = {
  swingTimeStep: 0.08,
  swingDamping: 0.99,
  charLeanFactor: 0.55,
  charLeanMax: 30,
  charSwayFactor: 0.33,
  charSwayMax: 18,
  wallLeanFactor: 0.7,
  wallSwayFactor: 0.4,
  wallWMul: 0,
  wallTMul: 0
};

// Tuned: 新映射 (charLeanFactor=1.05/max44, charSwayFactor=0.68/max28, wall 碰撞前*1.65/.9)
const TUNED = {
  swingTimeStep: 0.050,
  swingDamping: 0.9915,
  charLeanFactor: 1.05,
  charLeanMax: 44,
  charSwayFactor: 0.68,
  charSwayMax: 28,
  wallLeanFactor: 1.65,
  wallSwayFactor: 0.9,
  wallWMul: 0.18,
  wallTMul: 0.12
};

// ── 弹簧模拟（两个独立弹簧）──
function simulateSpring(r, y, w, t, params, maxFrames) {
  maxFrames = maxFrames || 600;
  var i = params.swingTimeStep;
  var d = params.swingDamping;
  var frames = 0;
  var peakR = Math.abs(r);
  var peakY = Math.abs(y);
  var zeroCrossingsR = 0;
  var zeroCrossingsY = 0;
  var prevR = r;
  var prevY = y;
  var settled = false;
  var initialEnergy = r * r + y * y + w * w + t * t;
  var energyAt10s = initialEnergy;

  while (frames < maxFrames) {
    // 旋转弹簧（独立）
    w = w - 2 * r;
    r = r + w * i * 1.2;
    w = w * d;
    // 纵向弹簧（独立）
    t = t - 2 * y;
    y = y + t * i * 2;
    t = t * d;
    frames++;

    var absR = Math.abs(r);
    var absY = Math.abs(y);
    if (absR > peakR) peakR = absR;
    if (absY > peakY) peakY = absY;
    if ((prevR < 0 && r >= 0) || (prevR > 0 && r <= 0)) zeroCrossingsR++;
    if ((prevY < 0 && y >= 0) || (prevY > 0 && y <= 0)) zeroCrossingsY++;
    prevR = r;
    prevY = y;

    if (frames === 600) {
      energyAt10s = r * r + y * y + w * w + t * t;
    }

    if (absR < 0.3 && Math.abs(w) < 0.3 && absY < 0.3 && Math.abs(t) < 0.3) {
      settled = true;
      if (frames < 600) energyAt10s = r * r + y * y + w * w + t * t;
      break;
    }
  }

  if (frames >= 600) {
    energyAt10s = r * r + y * y + w * w + t * t;
  }

  return {
    frames: frames,
    durationSeconds: +(frames / 60).toFixed(2),
    peakR: +peakR.toFixed(2),
    peakY: +peakY.toFixed(2),
    zeroCrossingsR: zeroCrossingsR,
    zeroCrossingsY: zeroCrossingsY,
    settled: settled,
    halfPeriodR: zeroCrossingsR > 0 ? +(frames / zeroCrossingsR).toFixed(1) : null,
    halfPeriodY: zeroCrossingsY > 0 ? +(frames / zeroCrossingsY).toFixed(1) : null,
    initialEnergy: +initialEnergy.toFixed(2),
    energyAt10s: +energyAt10s.toFixed(2),
    energyRatio: initialEnergy > 0 ? +(energyAt10s / initialEnergy).toFixed(4) : 0
  };
}

// ── 弹跳模拟（用于获取碰撞前速度）──
function simulateBounce(initialVx, initialVy, startX, bounds) {
  var friction = 0.982;
  var wallBounce = 0.5;
  var stopThreshold = 0.6;
  var maxBounces = 10;
  var bounceEnergyCap = 18;
  var dampingAfterMaxBounces = 0.9;

  var vx = initialVx;
  var vy = initialVy;
  var x = startX;
  var y = 0;
  var bounces = 0;
  var frames = 0;
  var preImpactVx = 0;
  var preImpactVy = 0;

  while (frames < 1000) {
    vx *= friction;
    vy *= friction;

    var nextX = x + vx;
    var nextY = y + vy;
    var bounced = false;

    if (nextX <= 0 && vx < 0) {
      preImpactVx = vx;
      nextX = 0;
      vx = Math.min(Math.abs(vx) * wallBounce, bounceEnergyCap);
      bounced = true;
    } else if (nextX >= bounds.width - bounds.widgetW && vx > 0) {
      preImpactVx = vx;
      nextX = bounds.width - bounds.widgetW;
      vx = -Math.min(Math.abs(vx) * wallBounce, bounceEnergyCap);
      bounced = true;
    }

    if (nextY <= 0 && vy < 0) {
      preImpactVy = vy;
      nextY = 0;
      vy = Math.min(Math.abs(vy) * wallBounce, bounceEnergyCap);
      bounced = true;
    } else if (nextY >= bounds.height - bounds.widgetH && vy > 0) {
      preImpactVy = vy;
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
    frames: frames,
    bounces: bounces,
    preImpactVx: +preImpactVx.toFixed(2),
    preImpactVy: +preImpactVy.toFixed(2)
  };
}

// ── 测试用例 ──
function runTests() {
  var bounds = { width: 1920, height: 1080, widgetW: 130, widgetH: 150 };
  var allPassed = true;
  var results = {};

  function assert(condition, message) {
    if (!condition) {
      console.error('  x FAIL:', message);
      allPassed = false;
    } else {
      console.log('  v PASS:', message);
    }
  }

  function assertFinite(obj, label) {
    for (var k in obj) {
      if (typeof obj[k] === 'number' && !isFinite(obj[k])) {
        console.error('  x FAIL: ' + label + '.' + k + ' is not finite: ' + obj[k]);
        allPassed = false;
        return false;
      }
    }
    return true;
  }

  // ── 1. Release 场景（相同输入速度，不同映射）──
  console.log('\n=== Release 场景 (vx=15, vy=8) ===');
  var vx = 15, vy = 8;
  var baseR = Math.max(-BASELINE.charLeanMax, Math.min(BASELINE.charLeanMax, vx * BASELINE.charLeanFactor));
  var baseY = Math.max(-BASELINE.charSwayMax, Math.min(BASELINE.charSwayMax, vy * BASELINE.charSwayFactor));
  var tuneR = Math.max(-TUNED.charLeanMax, Math.min(TUNED.charLeanMax, vx * TUNED.charLeanFactor));
  var tuneY = Math.max(-TUNED.charSwayMax, Math.min(TUNED.charSwayMax, vy * TUNED.charSwayFactor));

  console.log('  Baseline初始: r=' + baseR.toFixed(2) + ', y=' + baseY.toFixed(2));
  console.log('  Tuned初始:   r=' + tuneR.toFixed(2) + ', y=' + tuneY.toFixed(2));

  var releaseBaseline = simulateSpring(baseR, baseY, 0, 0, BASELINE, 600);
  var releaseTuned = simulateSpring(tuneR, tuneY, 0, 0, TUNED, 600);
  results.release = { baseline: releaseBaseline, tuned: releaseTuned };

  console.log('  Baseline:', JSON.stringify(releaseBaseline));
  console.log('  Tuned:  ', JSON.stringify(releaseTuned));

  // 所有数值有限
  assertFinite(releaseBaseline, 'releaseBaseline');
  assertFinite(releaseTuned, 'releaseTuned');

  // 角度峰值有明确上限 <=65deg
  assert(releaseBaseline.peakR <= 65, 'baseline peakR=' + releaseBaseline.peakR + ' <= 65');
  assert(releaseTuned.peakR <= 65, 'tuned peakR=' + releaseTuned.peakR + ' <= 65');

  // tuned 首次峰值至少大 35%（用 peakR 比较，因为初始 r 同向）
  var peakRatio = releaseTuned.peakR / releaseBaseline.peakR;
  var peakPct = ((peakRatio - 1) * 100).toFixed(1);
  assert(peakRatio >= 1.35, 'tuned peakR 比 baseline 大 ' + peakPct + '% (要求 >=35%)');

  // tuned 半周期至少长 25%
  if (releaseBaseline.halfPeriodR && releaseTuned.halfPeriodR) {
    var periodRatio = releaseTuned.halfPeriodR / releaseBaseline.halfPeriodR;
    var periodPct = ((periodRatio - 1) * 100).toFixed(1);
    assert(periodRatio >= 1.25, 'tuned 半周期比 baseline 长 ' + periodPct + '% (要求 >=25%)');
  } else {
    assert(false, '半周期数据缺失');
  }

  // 10 秒末能量低于初始的 20%
  assert(releaseBaseline.energyRatio <= 0.2, 'baseline 10s 能量比 ' + (releaseBaseline.energyRatio * 100).toFixed(2) + '% <= 20%');
  assert(releaseTuned.energyRatio <= 0.2, 'tuned 10s 能量比 ' + (releaseTuned.energyRatio * 100).toFixed(2) + '% <= 20%');

  // ── 2. LeftWall 场景（从靠近左墙开始）──
  console.log('\n=== LeftWall 场景 (start near left wall) ===');
  var leftBounce = simulateBounce(-18, 0, 5, bounds);
  console.log('  Bounce:', JSON.stringify(leftBounce));

  // Baseline: 旧 wall reaction（反弹后速度*0.7/0.4、w=t=0）
  // 反弹后速度 = preImpactVx * wallBounce（方向反转）
  var leftPostVx = -leftBounce.preImpactVx * 0.5;
  var leftBaseR = Math.max(-BASELINE.charLeanMax, Math.min(BASELINE.charLeanMax, leftPostVx * BASELINE.wallLeanFactor));
  var leftBaseY = 0;
  var leftBaseW = 0;
  var leftBaseT = 0;

  // Tuned: 碰撞前速度*1.65/.9 和 w/t 脉冲
  var leftTuneR = Math.max(-TUNED.charLeanMax, Math.min(TUNED.charLeanMax, leftBounce.preImpactVx * TUNED.wallLeanFactor));
  var leftTuneY = 0;
  var leftTuneW = -leftTuneR * TUNED.wallWMul;
  var leftTuneT = -leftTuneY * TUNED.wallTMul;

  console.log('  Baseline初始: r=' + leftBaseR.toFixed(2) + ', y=' + leftBaseY + ', w=' + leftBaseW + ', t=' + leftBaseT);
  console.log('  Tuned初始:   r=' + leftTuneR.toFixed(2) + ', y=' + leftTuneY + ', w=' + leftTuneW.toFixed(2) + ', t=' + leftTuneT.toFixed(2));

  var leftWallBaseline = simulateSpring(leftBaseR, leftBaseY, leftBaseW, leftBaseT, BASELINE, 600);
  var leftWallTuned = simulateSpring(leftTuneR, leftTuneY, leftTuneW, leftTuneT, TUNED, 600);
  results.leftWall = { bounce: leftBounce, baseline: leftWallBaseline, tuned: leftWallTuned };

  console.log('  Baseline:', JSON.stringify(leftWallBaseline));
  console.log('  Tuned:  ', JSON.stringify(leftWallTuned));

  assertFinite(leftWallBaseline, 'leftWallBaseline');
  assertFinite(leftWallTuned, 'leftWallTuned');
  assert(leftWallBaseline.peakR <= 65, 'LeftWall baseline peakR=' + leftWallBaseline.peakR + ' <= 65');
  assert(leftWallTuned.peakR <= 65, 'LeftWall tuned peakR=' + leftWallTuned.peakR + ' <= 65');

  var lwPeakRatio = leftWallTuned.peakR / leftWallBaseline.peakR;
  var lwPeakPct = ((lwPeakRatio - 1) * 100).toFixed(1);
  assert(lwPeakRatio >= 1.35, 'LeftWall tuned peakR 比 baseline 大 ' + lwPeakPct + '% (要求 >=35%)');

  if (leftWallBaseline.halfPeriodR && leftWallTuned.halfPeriodR) {
    var lwPeriodRatio = leftWallTuned.halfPeriodR / leftWallBaseline.halfPeriodR;
    var lwPeriodPct = ((lwPeriodRatio - 1) * 100).toFixed(1);
    assert(lwPeriodRatio >= 1.25, 'LeftWall tuned 半周期比 baseline 长 ' + lwPeriodPct + '% (要求 >=25%)');
  } else {
    assert(false, 'LeftWall 半周期数据缺失');
  }

  assert(leftWallBaseline.energyRatio <= 0.2, 'LeftWall baseline 10s 能量比 ' + (leftWallBaseline.energyRatio * 100).toFixed(2) + '% <= 20%');
  assert(leftWallTuned.energyRatio <= 0.2, 'LeftWall tuned 10s 能量比 ' + (leftWallTuned.energyRatio * 100).toFixed(2) + '% <= 20%');

  // ── 3. RightWall 场景（从靠近右墙开始）──
  console.log('\n=== RightWall 场景 (start near right wall) ===');
  var rightStartX = bounds.width - bounds.widgetW - 5;
  var rightBounce = simulateBounce(18, 0, rightStartX, bounds);
  console.log('  Bounce:', JSON.stringify(rightBounce));

  // Baseline: 旧 wall reaction
  var rightPostVx = -rightBounce.preImpactVx * 0.5;
  var rightBaseR = Math.max(-BASELINE.charLeanMax, Math.min(BASELINE.charLeanMax, rightPostVx * BASELINE.wallLeanFactor));
  var rightBaseY = 0;
  var rightBaseW = 0;
  var rightBaseT = 0;

  // Tuned: 碰撞前速度*1.65/.9 和 w/t 脉冲
  var rightTuneR = Math.max(-TUNED.charLeanMax, Math.min(TUNED.charLeanMax, rightBounce.preImpactVx * TUNED.wallLeanFactor));
  var rightTuneY = 0;
  var rightTuneW = -rightTuneR * TUNED.wallWMul;
  var rightTuneT = -rightTuneY * TUNED.wallTMul;

  console.log('  Baseline初始: r=' + rightBaseR.toFixed(2) + ', y=' + rightBaseY + ', w=' + rightBaseW + ', t=' + rightBaseT);
  console.log('  Tuned初始:   r=' + rightTuneR.toFixed(2) + ', y=' + rightTuneY + ', w=' + rightTuneW.toFixed(2) + ', t=' + rightTuneT.toFixed(2));

  var rightWallBaseline = simulateSpring(rightBaseR, rightBaseY, rightBaseW, rightBaseT, BASELINE, 600);
  var rightWallTuned = simulateSpring(rightTuneR, rightTuneY, rightTuneW, rightTuneT, TUNED, 600);
  results.rightWall = { bounce: rightBounce, baseline: rightWallBaseline, tuned: rightWallTuned };

  console.log('  Baseline:', JSON.stringify(rightWallBaseline));
  console.log('  Tuned:  ', JSON.stringify(rightWallTuned));

  assertFinite(rightWallBaseline, 'rightWallBaseline');
  assertFinite(rightWallTuned, 'rightWallTuned');
  assert(rightWallBaseline.peakR <= 65, 'RightWall baseline peakR=' + rightWallBaseline.peakR + ' <= 65');
  assert(rightWallTuned.peakR <= 65, 'RightWall tuned peakR=' + rightWallTuned.peakR + ' <= 65');

  var rwPeakRatio = rightWallTuned.peakR / rightWallBaseline.peakR;
  var rwPeakPct = ((rwPeakRatio - 1) * 100).toFixed(1);
  assert(rwPeakRatio >= 1.35, 'RightWall tuned peakR 比 baseline 大 ' + rwPeakPct + '% (要求 >=35%)');

  if (rightWallBaseline.halfPeriodR && rightWallTuned.halfPeriodR) {
    var rwPeriodRatio = rightWallTuned.halfPeriodR / rightWallBaseline.halfPeriodR;
    var rwPeriodPct = ((rwPeriodRatio - 1) * 100).toFixed(1);
    assert(rwPeriodRatio >= 1.25, 'RightWall tuned 半周期比 baseline 长 ' + rwPeriodPct + '% (要求 >=25%)');
  } else {
    assert(false, 'RightWall 半周期数据缺失');
  }

  assert(rightWallBaseline.energyRatio <= 0.2, 'RightWall baseline 10s 能量比 ' + (rightWallBaseline.energyRatio * 100).toFixed(2) + '% <= 20%');
  assert(rightWallTuned.energyRatio <= 0.2, 'RightWall tuned 10s 能量比 ' + (rightWallTuned.energyRatio * 100).toFixed(2) + '% <= 20%');

  // ── 总结 ──
  console.log('\n=== 总结 ===');
  console.log('Release: peakRatio=' + peakRatio.toFixed(3) + ', periodRatio=' + (releaseBaseline.halfPeriodR && releaseTuned.halfPeriodR ? (releaseTuned.halfPeriodR / releaseBaseline.halfPeriodR).toFixed(3) : 'N/A'));
  console.log('LeftWall: peakRatio=' + lwPeakRatio.toFixed(3) + ', periodRatio=' + (leftWallBaseline.halfPeriodR && leftWallTuned.halfPeriodR ? (leftWallTuned.halfPeriodR / leftWallBaseline.halfPeriodR).toFixed(3) : 'N/A'));
  console.log('RightWall: peakRatio=' + rwPeakRatio.toFixed(3) + ', periodRatio=' + (rightWallBaseline.halfPeriodR && rightWallTuned.halfPeriodR ? (rightWallTuned.halfPeriodR / rightWallBaseline.halfPeriodR).toFixed(3) : 'N/A'));

  if (allPassed) {
    console.log('\nAll tests PASSED');
    process.exit(0);
  } else {
    console.error('\nSome tests FAILED');
    process.exit(1);
  }
}

runTests();
