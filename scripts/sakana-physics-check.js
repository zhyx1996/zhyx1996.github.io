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

// ── 弹跳模拟（用于获取碰撞前速度；支持按真实时间推进）──
// dtMs: 每步真实时间（默认 16.667 = 60fps 一帧，行为与历史一致）
// durationMs: 可选；到该真实时间即停止，最后一帧按剩余时间比例子步进，
//             保证 60/120/144Hz 在“同一真实时刻”的位置可直接比较
function simulateBounce(initialVx, initialVy, startX, bounds, dtMs, durationMs) {
  var frameMs = BOUNCE_PARAMS.frameMs;
  var dt = dtMs || frameMs;
  var friction = BOUNCE_PARAMS.friction;
  var wallBounce = BOUNCE_PARAMS.wallBounce;
  var stopThreshold = BOUNCE_PARAMS.stopThreshold;
  var maxBounces = BOUNCE_PARAMS.maxBounces;
  var bounceEnergyCap = BOUNCE_PARAMS.bounceEnergyCap;
  var dampingAfterMaxBounces = BOUNCE_PARAMS.dampingAfterMaxBounces;

  // 与 app.js bounce 帧一致：边界下限 0（视口小于 widget 时退化为贴左上角）
  var maxLeft = Math.max(0, bounds.width - bounds.widgetW);
  var maxTop = Math.max(0, bounds.height - bounds.widgetH);

  var vx = initialVx;
  var vy = initialVy;
  var x = startX;
  var y = 0;
  var bounces = 0;
  var frames = 0;
  var elapsedMs = 0;
  var preImpactVx = 0;
  var preImpactVy = 0;

  while (frames < 1000) {
    // 最后一段不足一帧：按剩余真实时间比例推进（摩擦与位移同步缩放）
    var stepDt = dt;
    if (durationMs != null && elapsedMs + dt > durationMs) {
      stepDt = durationMs - elapsedMs;
      if (stepDt <= 0) break;
    }
    var stepScale = stepDt / frameMs;
    var decay = Math.pow(friction, stepScale);
    vx *= decay;
    vy *= decay;

    var nextX = x + vx * stepScale;
    var nextY = y + vy * stepScale;
    var bounced = false;

    // 位置越界一律钳回边界，仅当速度指向边界时才反弹
    // （覆盖 resize 缩小后起点越界等极端情况，与 app.js bounce 帧一致）
    if (nextX <= 0) {
      nextX = 0;
      if (vx < 0) {
        preImpactVx = vx;
        vx = Math.min(Math.abs(vx) * wallBounce, bounceEnergyCap);
        bounced = true;
      }
    } else if (nextX >= maxLeft) {
      nextX = maxLeft;
      if (vx > 0) {
        preImpactVx = vx;
        vx = -Math.min(Math.abs(vx) * wallBounce, bounceEnergyCap);
        bounced = true;
      }
    }

    if (nextY <= 0) {
      nextY = 0;
      if (vy < 0) {
        preImpactVy = vy;
        vy = Math.min(Math.abs(vy) * wallBounce, bounceEnergyCap);
        bounced = true;
      }
    } else if (nextY >= maxTop) {
      nextY = maxTop;
      if (vy > 0) {
        preImpactVy = vy;
        vy = -Math.min(Math.abs(vy) * wallBounce, bounceEnergyCap);
        bounced = true;
      }
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
    elapsedMs += stepDt;

    if ((Math.abs(vx) < stopThreshold && Math.abs(vy) < stopThreshold) || bounces > maxBounces * 2) {
      break;
    }
    if (durationMs != null && elapsedMs >= durationMs) {
      break;
    }
  }

  return {
    frames: frames,
    elapsedMs: +elapsedMs.toFixed(3),
    x: +x.toFixed(3),
    y: +y.toFixed(3),
    bounces: bounces,
    preImpactVx: +preImpactVx.toFixed(2),
    preImpactVy: +preImpactVy.toFixed(2)
  };
}

// ── 时间归一化参数（与 app.js SAKANA_PHYSICS 保持一致）──
const TIME_NORM = {
  frameMs: 16.667,            // 60fps 帧时长基准
  sampleWindowMs: 120,        // 释放速度采样窗口
  sampleMax: 12,              // 最大采样点数
  friction: 0.982             // 与 simulateBounce 一致
};

// ── 弹跳与边缘参数（与 app.js SAKANA_PHYSICS 保持一致）──
const BOUNCE_PARAMS = {
  frameMs: TIME_NORM.frameMs,
  friction: TIME_NORM.friction,
  wallBounce: 0.5,            // 撞墙速度保留率
  stopThreshold: 0.6,         // 停止阈值
  maxBounces: 10,             // 最大碰撞次数限制
  bounceEnergyCap: 18,        // 碰撞后速度上限
  dampingAfterMaxBounces: 0.9,// 超过最大碰撞后的额外阻尼
  edgeNormalAbsorb: 0.15,     // 边缘释放时吸收法向速度的比例
  maxVelocity: 22             // 释放速度上限
};

// 与 app.js clampSakanaPosition 相同的纯函数：位置钳制到视口内（不越界）
function clampSakanaPosition(left, top, viewportW, viewportH, widgetW, widgetH, margin) {
  margin = margin == null ? 8 : margin;
  var maxL = Math.max(0, viewportW - widgetW - margin);
  var maxT = Math.max(0, viewportH - widgetH - margin);
  return {
    left: Math.min(Math.max(0, left), maxL),
    top: Math.min(Math.max(0, top), maxT)
  };
}

// 与 app.js computeReleaseVelocity 相同的纯函数：窗口内首尾位移/时间 → px/frame@60fps
function computeReleaseVelocity(samples, opts) {
  opts = opts || {};
  var frameMs = opts.frameMs || TIME_NORM.frameMs;
  var windowMs = opts.sampleWindowMs || TIME_NORM.sampleWindowMs;
  if (!samples || samples.length < 2) return { vx: 0, vy: 0 };
  var last = samples[samples.length - 1];
  var first = samples[0];
  for (var i = 0; i < samples.length; i++) {
    if (last.t - samples[i].t <= windowMs) { first = samples[i]; break; }
  }
  var dt = last.t - first.t;
  if (!(dt > 0)) return { vx: 0, vy: 0 };
  return {
    vx: ((last.x - first.x) / dt) * frameMs,
    vy: ((last.y - first.y) / dt) * frameMs
  };
}

// 与 app.js hasUsableReleaseSamples 相同：窗口内需至少两个不同时间点。
function hasUsableReleaseSamples(samples, opts) {
  opts = opts || {};
  var windowMs = opts.sampleWindowMs || TIME_NORM.sampleWindowMs;
  if (!samples || samples.length < 2) return false;
  var last = samples[samples.length - 1];
  var first = last;
  for (var i = 0; i < samples.length; i++) {
    if (last.t - samples[i].t <= windowMs) { first = samples[i]; break; }
  }
  return last.t - first.t > 0;
}

// 与 app.js applyFrameFriction 相同的纯函数：按真实时间施加摩擦
function applyFrameFriction(vx, vy, dtMs, opts) {
  opts = opts || {};
  var friction = opts.friction || TIME_NORM.friction;
  var frameMs = opts.frameMs || TIME_NORM.frameMs;
  var dt = Math.max(0, Math.min(dtMs, 100));
  var decay = Math.pow(friction, dt / frameMs);
  return { vx: vx * decay, vy: vy * decay };
}

// 与 app.js computeFinalVelocity 相同的纯函数：采样 → fallback → maxVelocity 上限。
// 所有收尾路径（pointerup / pointercancel / lostpointercapture / blur /
// visibilitychange / 窗口兜底）共享，保证窗口外释放、异常取消、失焦时
// 保留最后一次有效甩动速度，不会把速度清零。
// opts.fallbackVx/fallbackVy：拖动期间保存的最后一次有效速度；快速拖动并在
// 窗口外松手时采样可能只有一个点，或最近窗口内仅有末点，此时回退到该速度，
// 保证整体仍有轻微回弹、角色仍按真实甩动方向获得明确初始角度。
function computeFinalVelocity(samples, opts) {
  opts = opts || {};
  var vel = hasUsableReleaseSamples(samples, opts)
    ? computeReleaseVelocity(samples, opts)
    : { vx: opts.fallbackVx == null ? 0 : opts.fallbackVx, vy: opts.fallbackVy == null ? 0 : opts.fallbackVy };
  var maxV = opts.maxVelocity || BOUNCE_PARAMS.maxVelocity;
  return {
    vx: Math.max(-maxV, Math.min(maxV, vel.vx)),
    vy: Math.max(-maxV, Math.min(maxV, vel.vy))
  };
}

// 与 app.js applyEdgeAbsorb 相同的纯函数：边缘释放时法向速度吸收只作用于
// 平移回弹；角色甩动速度（charVx/charVy）保持真实值，不受吸收影响。
function applyEdgeAbsorb(vx, vy, leftPos, topPos, viewportW, viewportH, widgetW, widgetH, opts) {
  opts = opts || {};
  var m = opts.edgeMargin == null ? 16 : opts.edgeMargin;
  var absorb = opts.absorb == null ? BOUNCE_PARAMS.edgeNormalAbsorb : opts.absorb;
  var charVx = vx;
  var charVy = vy;
  if (leftPos <= m && vx < 0) vx *= absorb;
  else if (leftPos >= viewportW - widgetW - m && vx > 0) vx *= absorb;
  if (topPos <= m && vy < 0) vy *= absorb;
  else if (topPos >= viewportH - widgetH - m && vy > 0) vy *= absorb;
  return { vx: vx, vy: vy, charVx: charVx, charVy: charVy };
}

// 与 app.js computeReleaseCharState 相同的纯函数：释放时角色弹簧初始状态。
// 高速释放按真实甩动速度映射为明确的初始角度/位移；低速释放保留当前姿态，
// 姿态近乎静止时按最后运动方向补轻微初始角度——不清零、不停摆。
function computeReleaseCharState(vx, vy, currentR, currentY, physics) {
  physics = physics || TUNED;
  var r0 = currentR || 0;
  var y0 = currentY || 0;
  if (Math.abs(vx) < 3 && Math.abs(vy) < 3) {
    if (Math.abs(r0) < 0.5 && Math.abs(y0) < 0.5) {
      r0 = (vx > 0 || (vx === 0 && r0 >= 0)) ? 8 : -8;
      y0 = (vy > 0 || (vy === 0 && y0 >= 0)) ? 4 : -4;
    }
    return { r: r0, y: y0, w: 0, t: 0, i: physics.swingTimeStep, d: physics.swingDamping };
  }
  return {
    r: Math.max(-physics.charLeanMax, Math.min(physics.charLeanMax, vx * physics.charLeanFactor)),
    y: Math.max(-physics.charSwayMax, Math.min(physics.charSwayMax, vy * physics.charSwayFactor)),
    w: 0,
    t: 0,
    i: physics.swingTimeStep,
    d: physics.swingDamping
  };
}

// 与 app.js computeWallCharReactionState 相同：保持 r/y，向对应轴速度叠加碰撞脉冲。
function computeWallCharReactionState(currentState, impactVx, impactVy, physics) {
  physics = physics || TUNED;
  currentState = currentState || {};
  var next = {
    r: Number.isFinite(currentState.r) ? currentState.r : 0,
    y: Number.isFinite(currentState.y) ? currentState.y : 0,
    w: Number.isFinite(currentState.w) ? currentState.w : 0,
    t: Number.isFinite(currentState.t) ? currentState.t : 0,
    i: physics.swingTimeStep,
    d: physics.swingDamping
  };
  if (impactVx !== 0) {
    var impulseR = Math.max(-physics.charLeanMax * 1.2, Math.min(physics.charLeanMax * 1.2, impactVx * physics.wallLeanFactor));
    next.w += -impulseR * 0.18;
  }
  if (impactVy !== 0) {
    var impulseY = Math.max(-physics.charSwayMax * 1.2, Math.min(physics.charSwayMax * 1.2, impactVy * physics.wallSwayFactor));
    next.t += -impulseY * 0.12;
  }
  return next;
}

// 与 app.js resolveSakanaRelease 相同的纯函数：整条释放链（速度 → 边缘吸收
// 分离 → 角色弹簧初始状态），finishDrag 与所有收尾路径共享。
// opts.fallbackVx/fallbackVy：采样不足（窗口外快速松手）时的最后有效速度，透传给 computeFinalVelocity。
function resolveSakanaRelease(samples, leftPos, topPos, viewportW, viewportH, widgetW, widgetH, currentR, currentY, opts) {
  opts = opts || {};
  var physics = opts.physics || TUNED;
  var maxV = physics.maxVelocity || BOUNCE_PARAMS.maxVelocity;
  var absorb = physics.edgeNormalAbsorb == null ? BOUNCE_PARAMS.edgeNormalAbsorb : physics.edgeNormalAbsorb;
  var vel = computeFinalVelocity(samples, {
    maxVelocity: maxV,
    fallbackVx: opts.fallbackVx,
    fallbackVy: opts.fallbackVy
  });
  var resolved = applyEdgeAbsorb(vel.vx, vel.vy, leftPos, topPos, viewportW, viewportH, widgetW, widgetH, {
    edgeMargin: opts.edgeMargin,
    absorb: absorb
  });
  var state = computeReleaseCharState(resolved.charVx, resolved.charVy, currentR, currentY, physics);
  return {
    vx: resolved.vx,
    vy: resolved.vy,
    charVx: resolved.charVx,
    charVy: resolved.charVy,
    state: state
  };
}

// 旧逻辑（修复前 bug 版）：摩擦已按时间归一化，但位移未按 dt 缩放
// （每帧位移 = vx*1）。用于证明按 dtMs/frameMs 缩放位移的必要性。
function simulateBounceLegacy(initialVx, initialVy, startX, bounds, dtMs, durationMs) {
  var frameMs = 16.667;
  var friction = 0.982;
  var wallBounce = 0.5;
  var bounceEnergyCap = 18;
  var vx = initialVx;
  var vy = initialVy;
  var x = startX;
  var y = 0;
  var frames = 0;
  var elapsedMs = 0;

  while (frames < 1000) {
    var decay = Math.pow(friction, dtMs / frameMs);
    vx *= decay;
    vy *= decay;

    var nextX = x + vx; // ← 修复前：位移未按 dtMs/frameMs 缩放
    var nextY = y + vy;

    if (nextX <= 0 && vx < 0) {
      nextX = 0;
      vx = Math.min(Math.abs(vx) * wallBounce, bounceEnergyCap);
    } else if (nextX >= bounds.width - bounds.widgetW && vx > 0) {
      nextX = bounds.width - bounds.widgetW;
      vx = -Math.min(Math.abs(vx) * wallBounce, bounceEnergyCap);
    }
    if (nextY <= 0 && vy < 0) {
      nextY = 0;
      vy = Math.min(Math.abs(vy) * wallBounce, bounceEnergyCap);
    } else if (nextY >= bounds.height - bounds.widgetH && vy > 0) {
      nextY = bounds.height - bounds.widgetH;
      vy = -Math.min(Math.abs(vy) * wallBounce, bounceEnergyCap);
    }

    x = nextX;
    y = nextY;
    frames++;
    elapsedMs += dtMs;
    if (durationMs != null && elapsedMs >= durationMs) break;
    if (Math.abs(vx) < 0.6 && Math.abs(vy) < 0.6) break;
  }

  return { frames: frames, x: x, y: y, elapsedMs: elapsedMs };
}

// 生成匀速运动的采样序列（模拟不同事件频率）
function makeSampleSeries(totalDx, totalDy, durationMs, intervalMs) {
  var samples = [];
  var n = Math.round(durationMs / intervalMs);
  for (var i = 0; i <= n; i++) {
    var t = Math.round(i * intervalMs);
    samples.push({
      x: (i * totalDx) / n,
      y: (i * totalDy) / n,
      t: t
    });
  }
  return samples;
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

  // ── 4. 时间归一化：释放速度与事件采样频率无关 ──
  console.log('\n=== 时间归一化（速度采样与摩擦）===');

  // 同一手势（300px / 120px / 200ms），60Hz 与 120Hz 采样应得到相同速度
  var s60 = makeSampleSeries(300, 120, 200, 16.667);
  var s120 = makeSampleSeries(300, 120, 200, 8.333);
  // 采样窗口需覆盖整个手势（200ms），否则 60Hz 稀疏采样只落入最近 ~117ms，
  // 得到 24.93 而非整手势的 25 px/frame；窗口语义另由下方 vStop 用例验证
  var v60 = computeReleaseVelocity(s60, { sampleWindowMs: 250 });
  var v120 = computeReleaseVelocity(s120, { sampleWindowMs: 250 });
  console.log('  60Hz 采样:', JSON.stringify(v60));
  console.log('  120Hz 采样:', JSON.stringify(v120));

  // 期望：300px / 200ms × 16.667ms/帧 = 25 px/frame；Y 同理 10
  assert(Math.abs(v60.vx - 25) < 0.05, '60Hz vx=' + v60.vx.toFixed(2) + ' ≈ 25 px/frame');
  assert(Math.abs(v60.vy - 10) < 0.05, '60Hz vy=' + v60.vy.toFixed(2) + ' ≈ 10 px/frame');
  assert(Math.abs(v120.vx - 25) < 0.05, '120Hz vx=' + v120.vx.toFixed(2) + ' ≈ 25 px/frame');
  var freqDiffPct = (Math.abs(v60.vx - v120.vx) / Math.max(1, Math.abs(v60.vx)) * 100).toFixed(2);
  assert(Math.abs(v60.vx - v120.vx) < 0.05, '60Hz/120Hz 速度差 ' + freqDiffPct + '% (< 0.2%)');

  // 旧逻辑（直接取事件位移）在 120Hz 下只有 60Hz 的一半 —— 证明归一化的必要性
  var legacy60 = 300 / (s60.length - 1);
  var legacy120 = 300 / (s120.length - 1);
  assert(Math.abs(legacy60 - legacy120) > 8, '旧逻辑 60Hz(' + legacy60.toFixed(1) + ') 与 120Hz(' + legacy120.toFixed(1) + ') 位移差异显著，需时间归一化');

  // 窗口语义：拖动后停住 500ms 再释放 → 速度来自最近 120ms，静止段不参与
  var stopped = [];
  var i;
  for (i = 0; i < 12; i++) stopped.push({ x: 0, y: 0, t: i * 16.667 });      // 前 200ms 静止
  for (i = 0; i <= 10; i++) stopped.push({ x: i * 30, y: i * 12, t: 300 + i * 16.667 }); // 后 167ms 移动 300/120px
  var vStop = computeReleaseVelocity(stopped);
  // 最近 120ms：t ∈ [347, 466]，x 从 (347-300)/166.7*300≈84.6 → 300，vx=(300-84.6)/120*16.667≈29.9
  assert(vStop.vx > 25 && vStop.vx < 35, '静止后释放速度来自最近窗口 vx=' + vStop.vx.toFixed(1) + '（期望 ≈30）');
  assert(vStop.vy > 10 && vStop.vy < 15, '静止后释放速度来自最近窗口 vy=' + vStop.vy.toFixed(1) + '（期望 ≈12）');

  // 帧率归一化摩擦：1 秒真实时间，60fps(60步) 与 120fps(120步) 衰减应一致
  var v0 = 20;
  var v60f = v0, v120f = v0;
  for (i = 0; i < 60; i++) v60f = applyFrameFriction(v60f, 0, 16.667).vx;
  for (i = 0; i < 120; i++) v120f = applyFrameFriction(v120f, 0, 8.333).vx;
  var expected60 = v0 * Math.pow(TIME_NORM.friction, 60);
  var frictionDiffPct = (Math.abs(v60f - v120f) / v60f * 100).toFixed(3);
  console.log('  1s 摩擦后 60fps=' + v60f.toFixed(3) + ' 120fps=' + v120f.toFixed(3) + ' 期望=' + expected60.toFixed(3));
  assert(Math.abs(v60f - expected60) < 0.01, '60fps 逐帧摩擦与 friction^60 一致 (' + v60f.toFixed(3) + ')');
  assert(Math.abs(v60f - v120f) < 0.01, '60fps/120fps 摩擦衰减差 ' + frictionDiffPct + '% (< 0.1%)');

  // 释放速度上限保护：极端快甩也不超过 maxVelocity（clamp 语义由 onPointerUp 承担）
  var fast = makeSampleSeries(2000, 2000, 50, 8.333);
  var vFast = computeReleaseVelocity(fast);
  assert(vFast.vx > 22, '快速甩动计算速度 vx=' + vFast.vx.toFixed(1) + ' 将触发 22 px/frame 上限保护');

  // ── 5. 帧率无关性：60/120/144Hz 相同真实时间位移一致 ──
  // 对应 app.js startBounce 的修复：位移按 rAF 真实 dtMs/frameMs 缩放，
  // 摩擦与位移均帧率归一化后，同一真实时间内的轨迹一致。
  console.log('\n=== 帧率无关性（60/120/144Hz 相同真实时间位移一致）===');

  // 5a. 自由运动（无碰撞）：1 秒真实时间。注意“先摩擦后位移”是离散积分，
  // 存在随帧率收敛的方法误差（60→120→144 单调接近连续极限，约 0.4%），
  // 因此断言 <1% 级一致，并用“远小于 legacy 差异”证明修复有效性。
  var f60 = simulateBounce(15, 8, 60, bounds, 16.667, 1000);
  var f120 = simulateBounce(15, 8, 60, bounds, 8.333, 1000);
  var f144 = simulateBounce(15, 8, 60, bounds, 6.944, 1000);
  console.log('  1s 自由运动: 60Hz=' + JSON.stringify({ x: f60.x, y: f60.y }) + ' 120Hz=' + JSON.stringify({ x: f120.x, y: f120.y }) + ' 144Hz=' + JSON.stringify({ x: f144.x, y: f144.y }));
  assert(Math.abs(f60.x - f120.x) < 6, '60Hz/120Hz 1s 位移差 ' + Math.abs(f60.x - f120.x).toFixed(3) + 'px (< 1%)');
  assert(Math.abs(f60.x - f144.x) < 6, '60Hz/144Hz 1s 位移差 ' + Math.abs(f60.x - f144.x).toFixed(3) + 'px (< 1%)');
  assert(Math.abs(f60.y - f120.y) < 4 && Math.abs(f60.y - f144.y) < 4, '三档 1s Y 位移差 < 4px');
  assert(Math.abs(f60.elapsedMs - f120.elapsedMs) < 0.01 && Math.abs(f60.elapsedMs - f144.elapsedMs) < 0.01, '三档模拟结束于同一真实时刻 (≈' + f60.elapsedMs + 'ms)');

  // 旧逻辑对比：位移未按 dt 缩放时，120Hz 1s 位移约为归一化结果的 2 倍
  var legacy = simulateBounceLegacy(15, 8, 60, bounds, 8.333, 1000);
  console.log('  旧逻辑(位移未缩放) 120Hz 1s x=' + legacy.x.toFixed(1) + ' vs 归一化 60Hz x=' + f60.x.toFixed(1));
  assert(Math.abs(legacy.x - f60.x) > 300, '旧逻辑 120Hz 位移 ' + legacy.x.toFixed(1) + ' 与归一化 ' + f60.x.toFixed(1) + ' 差异显著 (>300px)，证明需按 dt 缩放位移');
  // 归一化后帧率差异（~3px）远小于 legacy 差异（~553px），修复有效
  assert(Math.abs(f60.x - f144.x) * 20 < Math.abs(legacy.x - f60.x), '归一化 60/144Hz 位移差 ' + Math.abs(f60.x - f144.x).toFixed(2) + 'px 仅为 legacy 差异 ' + Math.abs(legacy.x - f60.x).toFixed(1) + 'px 的 ' + (Math.abs(f60.x - f144.x) / Math.abs(legacy.x - f60.x) * 100).toFixed(1) + '% (< 5%)');

  // 5b. 带碰撞：向左撞左墙（vx=-18）、向下撞下墙（vy=22），3 秒真实时间
  var c60 = simulateBounce(-18, 22, 60, bounds, 16.667, 3000);
  var c120 = simulateBounce(-18, 22, 60, bounds, 8.333, 3000);
  var c144 = simulateBounce(-18, 22, 60, bounds, 6.944, 3000);
  console.log('  3s 含碰撞: 60Hz=' + JSON.stringify({ x: c60.x, y: c60.y, b: c60.bounces }) + ' 120Hz=' + JSON.stringify({ x: c120.x, y: c120.y, b: c120.bounces }) + ' 144Hz=' + JSON.stringify({ x: c144.x, y: c144.y, b: c144.bounces }));
  assert(c60.bounces === c120.bounces && c60.bounces === c144.bounces, '三档 3s 碰撞次数一致 (' + c60.bounces + ')');
  assert(Math.abs(c60.x - c120.x) < 15 && Math.abs(c60.x - c144.x) < 15, '三档 3s X 位移差 < 15px');
  assert(Math.abs(c60.y - c120.y) < 10 && Math.abs(c60.y - c144.y) < 10, '三档 3s Y 位移差 < 10px');

  // ── 6. 边界钳制：拖动 / 释放 / resize 全程位置不越界 ──
  console.log('\n=== 边界钳制（clampSakanaPosition）===');

  var c1 = clampSakanaPosition(2000, 2000, 1920, 1080, 180, 180, 8);
  assert(c1.left === 1732 && c1.top === 892, '右下越界钳回 (1732, 892)，实际 (' + c1.left + ',' + c1.top + ')');

  var c2 = clampSakanaPosition(-50, -30, 1920, 1080, 180, 180, 8);
  assert(c2.left === 0 && c2.top === 0, '左上越界钳回 (0, 0)，实际 (' + c2.left + ',' + c2.top + ')');

  var c3 = clampSakanaPosition(100, 100, 100, 100, 180, 180, 8);
  assert(c3.left === 0 && c3.top === 0, '视口小于 widget 时贴左上角 (0, 0)，实际 (' + c3.left + ',' + c3.top + ')');

  var c4 = clampSakanaPosition(50, 50, 200, 200, 180, 180, 8);
  assert(c4.left === 12 && c4.top === 12, '视口 200 时最大坐标 12，实际 (' + c4.left + ',' + c4.top + ')');

  var c5 = clampSakanaPosition(12, 12, 1920, 1080, 180, 180, 8);
  assert(c5.left === 12 && c5.top === 12, '界内位置保持不变');

  // ── 7. 碰撞反弹稳定性：不越界 / 不穿透 / 不抖动 ──
  console.log('\n=== 碰撞反弹稳定性 ===');

  // 7a. 起点越界 + 速度朝墙外（resize 缩小后释放）：位置钳回边界并反弹
  var tinyBounds = { width: 800, height: 600, widgetW: 180, widgetH: 180 };
  var oob = simulateBounce(5, 4, 700, tinyBounds); // maxLeft = 620
  assert(oob.x >= 0 && oob.x <= 620, '越界起点被钳回界内 x=' + oob.x);
  assert(oob.bounces >= 1, '越界起点朝墙外速度触发反弹 bounces=' + oob.bounces);

  // 7b. 起点越界但速度=0（resize 后静止释放）：位置被纠正到边界，不产生弹跳
  var oobStill = simulateBounce(0, 0, 700, tinyBounds);
  assert(oobStill.x === 620, '越界静止起点被钳回边界 x=' + oobStill.x);
  assert(oobStill.bounces === 0, '越界静止起点不触发反弹 bounces=' + oobStill.bounces);

  // 7c. 高刷新率长时间模拟：位置始终在界内（不穿透、不飞出）
  var hf = simulateBounce(-22, 22, 100, bounds, 6.944, 5000);
  assert(hf.x >= 0 && hf.x <= 1790, '144Hz 5s 后 x=' + hf.x + ' 在界内 [0,1790]');
  assert(hf.y >= 0 && hf.y <= 930, '144Hz 5s 后 y=' + hf.y + ' 在界内 [0,930]');

  // 7d. 贴墙慢速朝墙释放：仅一次反弹，停在墙边，不来回抖动
  var wallRight = simulateBounce(1.2, 0, 1790, bounds); // maxLeft = 1790
  assert(wallRight.bounces === 1, '贴墙慢速释放仅一次反弹 bounces=' + wallRight.bounces);
  assert(wallRight.x <= 1790 && wallRight.x >= 1785, '贴墙慢速释放停在墙边 x=' + wallRight.x);

  // 7e. 反弹后轨迹单调远离墙（无来回穿越抖动）
  var xT = 1790, vT = 18;
  var monoOk = true;
  var prevX = 1790;
  for (var iT = 0; iT < 30; iT++) {
    vT *= BOUNCE_PARAMS.friction;
    var nxT = xT + vT;
    if (nxT >= 1790) {
      nxT = 1790;
      vT = -Math.min(Math.abs(vT) * BOUNCE_PARAMS.wallBounce, BOUNCE_PARAMS.bounceEnergyCap);
    }
    xT = nxT;
    if (iT > 0 && xT > prevX) monoOk = false;
    prevX = xT;
  }
  assert(monoOk, '撞墙反弹后 30 帧位置单调远离墙（无抖动）');

  // 7f. 碰撞前速度有界（能量上限保护）
  var fast = simulateBounce(-22, 22, 100, bounds, 16.667, 5000);
  assert(Math.abs(fast.preImpactVx) <= BOUNCE_PARAMS.maxVelocity && Math.abs(fast.preImpactVy) <= BOUNCE_PARAMS.maxVelocity, '碰撞前速度有界（<= maxVelocity 22）');

  // ── 8. 边缘释放：法向速度吸收，不整屏飞出 ──
  console.log('\n=== 边缘释放（edgeNormalAbsorb）===');

  // 贴右边缘、以最大速度朝墙释放：法向先吸收 85%（22×0.15=3.3），反弹后迅速停下
  var edgeVx = BOUNCE_PARAMS.maxVelocity * BOUNCE_PARAMS.edgeNormalAbsorb;
  var edge = simulateBounce(edgeVx, 0, 1790, bounds);
  assert(edge.bounces <= 2, '边缘释放反弹次数受限 bounces=' + edge.bounces);
  // 反弹后速度 1.6px/frame 衰减到 0.6 需 ~49 帧，累计滑行 ~56px（不足 widget 宽的 1/3）
  assert(edge.x <= 1790 && edge.x >= 1690, '边缘释放后贴边停下（滑行 <100px）x=' + edge.x);

  // 对照：不吸收时 22px/frame 从右墙反弹后滑行 ~700px（横穿大半屏）
  var noAbsorb = simulateBounce(BOUNCE_PARAMS.maxVelocity, 0, 1790, bounds);
  console.log('  吸收后滑行距离 ' + (1790 - edge.x).toFixed(0) + 'px vs 未吸收 ' + (1790 - noAbsorb.x).toFixed(0) + 'px');
  assert(noAbsorb.x < edge.x - 100, '未吸收时从墙边滑出更远 x=' + noAbsorb.x + ' vs 吸收后 x=' + edge.x);

  // ── 9. 释放链：fallback（单采样）与角色初始状态分离 ──
  // 对应 app.js resolveSakanaRelease：快速拖动并在窗口外松手时，指针采样可能
  // 只有 pointerdown 一个点（samples < 2 无法计算窗口速度），必须回退到拖动
  // 期间保存的最后一次有效速度（fallbackVx/fallbackVy）——整体仍有轻微回弹、
  // 角色仍按真实甩动方向获得明确初始角度。
  console.log('\n=== 释放链（fallback 与角色初始状态）===');

  // 9a. 单采样 fallback：samples 只有 1 个点，使用最后有效速度而不是清零
  var singleSample = [{ x: 500, y: 400, t: 100 }];
  var fbRel = resolveSakanaRelease(singleSample, 1000, 500, 1920, 1080, 130, 150, 0, 0, {
    fallbackVx: 14, fallbackVy: -6
  });
  assert(fbRel.vx === 14 && fbRel.vy === -6, '单采样释放回退到最后有效速度 vx=' + fbRel.vx + ', vy=' + fbRel.vy);
  assert(fbRel.charVx === 14 && fbRel.charVy === -6, '单采样 charVx/charVy 保持最后有效速度（不被清零）');

  // 9b. 单采样 fallback 的角色初始 r/y 可见且方向正确（基于未吸收真实速度）
  console.log('  单采样 fallback 初始: r=' + fbRel.state.r.toFixed(1) + ', y=' + fbRel.state.y.toFixed(1));
  assert(fbRel.state.r > 0, '初始 r 方向与 vx 一致（可见）r=' + fbRel.state.r.toFixed(1));
  assert(fbRel.state.y < 0, '初始 y 方向与 vy 一致（可见）y=' + fbRel.state.y.toFixed(1));
  assert(Math.abs(fbRel.state.r) >= 8, '初始 r 幅度明确 |r|=' + Math.abs(fbRel.state.r).toFixed(1) + ' >= 8');
  assert(Math.abs(fbRel.state.y) >= 4, '初始 y 幅度明确 |y|=' + Math.abs(fbRel.state.y).toFixed(1) + ' >= 4');

  // 9c. 无 fallback 且单采样：平移速度为 0（无速度可回弹），
  //     但角色仍有明确初始角度（低速分支补回摆量，不清零不停摆）
  var fbZero = resolveSakanaRelease(singleSample, 1000, 500, 1920, 1080, 130, 150, 0, 0);
  assert(fbZero.vx === 0 && fbZero.vy === 0, '无 fallback 单采样平移速度 0（无回弹）');
  assert(fbZero.state.r === 8 && fbZero.state.y === 4, '无 fallback 单采样角色仍有明确初始角度 r=' + fbZero.state.r + ', y=' + fbZero.state.y);

  // 9d. fallback 超上限时同样钳制到 maxVelocity
  var fbClamp = resolveSakanaRelease(singleSample, 1000, 500, 1920, 1080, 130, 150, 0, 0, {
    fallbackVx: 40, fallbackVy: 0
  });
  assert(fbClamp.vx === BOUNCE_PARAMS.maxVelocity, 'fallback 超上限钳制到 maxVelocity vx=' + fbClamp.vx);
  assert(fbClamp.charVx === BOUNCE_PARAMS.maxVelocity, 'charVx 同样按真实速度钳制 charVx=' + fbClamp.charVx);

  // 9e. 采样充足时窗口速度优先，fallback 不覆盖真实采样
  var twoSamples = [
    { x: 0, y: 0, t: 0 },
    { x: 60, y: 30, t: 100 }
  ]; // vx=(60/100)*16.667≈10, vy≈5
  var fromSamples = resolveSakanaRelease(twoSamples, 1000, 500, 1920, 1080, 130, 150, 0, 0, {
    fallbackVx: 99, fallbackVy: 99
  });
  assert(Math.abs(fromSamples.vx - 10) < 0.05 && Math.abs(fromSamples.vy - 5) < 0.05, '样本充足时用窗口速度而非 fallback vx=' + fromSamples.vx.toFixed(2) + ', vy=' + fromSamples.vy.toFixed(2));

  // 9f. 边缘法向吸收只作用于平移：贴右边缘向右释放时平移 vx 被吸收（10→1.5），
  //     charVx/charVy 保持真实甩动速度，角色初始角度基于未吸收的真实速度
  var edgeRel = resolveSakanaRelease(twoSamples, 1790, 500, 1920, 1080, 130, 150, 0, 0); // 1790 ≥ 1920-130-16
  console.log('  贴右边缘: vx=' + edgeRel.vx.toFixed(2) + ', charVx=' + edgeRel.charVx.toFixed(2) + ', r=' + edgeRel.state.r.toFixed(1));
  assert(Math.abs(edgeRel.vx - 1.5) < 0.05, '边缘法向吸收作用于平移 vx=' + edgeRel.vx.toFixed(2) + ' (10→≈1.5)');
  assert(edgeRel.vx < edgeRel.charVx, '平移速度小于原速度 vx=' + edgeRel.vx.toFixed(2) + ' < charVx=' + edgeRel.charVx.toFixed(2));
  assert(Math.abs(edgeRel.charVx - 10) < 0.05, 'charVx 保持真实甩动速度（不被吸收覆盖）');
  assert(edgeRel.charVy === edgeRel.vy, '无吸收方向平移速度与角色速度一致 vy=' + edgeRel.vy.toFixed(2));
  assert(edgeRel.state.r > 0, '角色初始角度基于未吸收真实速度（方向正确）r=' + edgeRel.state.r.toFixed(1));

  // 9g. 左上角双轴吸收：vx<0、vy<0 时两个法向分量都只影响平移，
  //     charVx/charVy 完整保留，角色初始角度按负方向
  var negSamples = [
    { x: 60, y: 30, t: 0 },
    { x: 0, y: 0, t: 100 }
  ]; // vx≈-10, vy≈-5
  var cornerRel = resolveSakanaRelease(negSamples, 0, 0, 1920, 1080, 130, 150, 0, 0);
  assert(Math.abs(cornerRel.vx + 1.5) < 0.05 && Math.abs(cornerRel.vy + 0.75) < 0.05, '左上角双轴吸收仅作用于平移 vx=' + cornerRel.vx.toFixed(2) + ', vy=' + cornerRel.vy.toFixed(2));
  assert(Math.abs(cornerRel.charVx + 10) < 0.05 && Math.abs(cornerRel.charVy + 5) < 0.05, '左上角 charVx/charVy 保持真实速度（-10/-5）');
  assert(cornerRel.state.r < 0 && cornerRel.state.y < 0, '角色初始角度方向与负速度一致 r=' + cornerRel.state.r.toFixed(1) + ', y=' + cornerRel.state.y.toFixed(1));

  // 9h. 各收尾路径语义：pointerup / pointercancel / lostpointercapture / blur /
  //     visibilitychange / window pointerup 全部共享同一条释放链（app.js 中
  //     都调用 finishDrag → resolveSakanaRelease），因此窗口外松手只有 blur
  //     到达时与 pointerup 路径行为一致——单采样 fallback 同样生效、输出一致。
  var finishPaths = ['pointerup', 'pointercancel', 'lostpointercapture', 'blur', 'visibilitychange', 'window pointerup'];
  var pathResults = [];
  for (var pi = 0; pi < finishPaths.length; pi++) {
    pathResults.push(resolveSakanaRelease(singleSample, 1000, 500, 1920, 1080, 130, 150, 0, 0, {
      fallbackVx: 14, fallbackVy: -6
    }));
  }
  var firstJson = JSON.stringify(pathResults[0]);
  for (var pi2 = 1; pi2 < finishPaths.length; pi2++) {
    assert(JSON.stringify(pathResults[pi2]) === firstJson, finishPaths[pi2] + ' 与 ' + finishPaths[0] + ' 释放结果一致（共享释放链）');
  }

  // 9i. 收尾守卫：多收尾事件依次到达（pointerup → lostpointercapture → blur →
  //     visibilitychange → window pointerup → pointercancel）只收尾一次。
  //     镜像 app.js finishDrag 的 isDragging 守卫语义（置 false 后再次到达直接返回）。
  var finishCalls = 0;
  var firstRelease = null;
  var makeFinishGuard = function () {
    var isDragging = true;
    return function (opts) {
      if (!isDragging) return;
      isDragging = false;
      finishCalls++;
      firstRelease = resolveSakanaRelease(singleSample, 1000, 500, 1920, 1080, 130, 150, 0, 0, opts);
    };
  };
  var guardedFinish = makeFinishGuard();
  guardedFinish({ fallbackVx: 14, fallbackVy: -6 }); // pointerup
  guardedFinish({ fallbackVx: 14, fallbackVy: -6 }); // lostpointercapture
  guardedFinish({ fallbackVx: 14, fallbackVy: -6 }); // blur
  guardedFinish({ fallbackVx: 14, fallbackVy: -6 }); // visibilitychange
  guardedFinish({ fallbackVx: 14, fallbackVy: -6 }); // window pointerup
  guardedFinish({ fallbackVx: 14, fallbackVy: -6 }); // pointercancel
  assert(finishCalls === 1, '多收尾事件到达只收尾一次（finishCalls=' + finishCalls + '）');
  assert(firstRelease && firstRelease.vx === 14 && firstRelease.vy === -6, '首次收尾即使用最后有效速度 fallback');

  // 9j. 数组有两个样本但最近窗口内只有末点时，窗口速度无效，必须 fallback。
  var staleWindowSamples = [
    { x: 0, y: 0, t: 0 },
    { x: 200, y: 80, t: 500 }
  ];
  var staleFallback = computeFinalVelocity(staleWindowSamples, {
    sampleWindowMs: 120,
    fallbackVx: 14,
    fallbackVy: -6,
    maxVelocity: BOUNCE_PARAMS.maxVelocity
  });
  assert(staleFallback.vx === 14 && staleFallback.vy === -6,
    '窗口内仅末点时回退到最后有效速度 vx=' + staleFallback.vx + ', vy=' + staleFallback.vy);

  // 9k. edgeMargin=undefined 仍使用默认 16px，不能覆盖默认值并禁用吸收。
  var undefinedMarginEdge = applyEdgeAbsorb(10, 5, 1790, 930, 1920, 1080, 130, 150, {
    edgeMargin: undefined,
    absorb: BOUNCE_PARAMS.edgeNormalAbsorb
  });
  assert(Math.abs(undefinedMarginEdge.vx - 1.5) < 0.001 && Math.abs(undefinedMarginEdge.vy - 0.75) < 0.001,
    'edgeMargin=undefined 时使用默认边缘吸收 vx=' + undefinedMarginEdge.vx + ', vy=' + undefinedMarginEdge.vy);

  // ── 10. 角色碰撞状态：碰撞只注入速度，不覆盖当前弹簧姿态 ──
  console.log('\n=== 角色碰撞脉冲（保持弹簧姿态连续）===');
  var initialWallState = { r: 12, y: -7, w: -2, t: 1.5 };
  var afterRight = computeWallCharReactionState(initialWallState, 18, 0);
  var afterBottom = computeWallCharReactionState(afterRight, 0, 10);
  assert(afterRight.r === initialWallState.r && afterRight.y === initialWallState.y,
    '右墙碰撞不覆盖当前 r/y 姿态 r=' + afterRight.r + ', y=' + afterRight.y);
  assert(afterRight.w !== initialWallState.w && afterRight.t === initialWallState.t,
    '右墙碰撞只向横向速度注入脉冲 w=' + afterRight.w + ', t=' + afterRight.t);
  assert(afterBottom.r === afterRight.r && afterBottom.w === afterRight.w,
    '右墙后撞底边保留横向弹簧状态 r=' + afterBottom.r + ', w=' + afterBottom.w);
  assert(afterBottom.y === afterRight.y && afterBottom.t !== afterRight.t,
    '底边碰撞保持 y 并只向 t 注入脉冲 y=' + afterBottom.y + ', t=' + afterBottom.t);

  var afterBottomFirst = computeWallCharReactionState(initialWallState, 0, -12);
  var afterRightSecond = computeWallCharReactionState(afterBottomFirst, -16, 0);
  assert(afterRightSecond.y === afterBottomFirst.y && afterRightSecond.t === afterBottomFirst.t,
    '底边后撞右墙保留纵向状态 y=' + afterRightSecond.y + ', t=' + afterRightSecond.t);
  assert(afterRightSecond.r === afterBottomFirst.r && afterRightSecond.w !== afterBottomFirst.w,
    '右墙碰撞保持 r 并只向 w 注入脉冲 r=' + afterRightSecond.r + ', w=' + afterRightSecond.w);

  var cornerState = computeWallCharReactionState(initialWallState, -20, 14);
  assert(cornerState.r === initialWallState.r && cornerState.y === initialWallState.y,
    '双轴碰撞仍保持当前 r/y 姿态 r=' + cornerState.r + ', y=' + cornerState.y);
  assert(cornerState.w !== initialWallState.w && cornerState.t !== initialWallState.t,
    '双轴碰撞同时向 w/t 注入脉冲 w=' + cornerState.w + ', t=' + cornerState.t);

  // 真实边缘日志回归：释放 r≈21.92，46ms 后 impactVx≈2.97；不能被覆盖成 r≈4.9。
  var observedEdgeState = { r: 21.9163, y: 11.2276, w: -40, t: -30 };
  var afterLightEdgeImpact = computeWallCharReactionState(observedEdgeState, 2.9707, 0);
  assert(afterLightEdgeImpact.r === observedEdgeState.r && Math.abs(afterLightEdgeImpact.w) > 30,
    '轻微边缘碰撞保留释放初始角度与已有角速度 r=' + afterLightEdgeImpact.r + ', w=' + afterLightEdgeImpact.w);

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
