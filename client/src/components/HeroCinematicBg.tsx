/**
 * HeroCinematicBg — Looping text→visual transformation background
 *
 * 4 clips, each showing a text prompt that instantly becomes a visual world.
 * No UI overlays. No icons. No feature text. Only prompts + visual output.
 *
 * Clip 1: "Walking through fire"      → fire scene
 * Clip 2: "A dragon flying over a city" → dragon/skyline
 * Clip 3: "Cartoon animals dancing"   → kids Pixar scene
 * Clip 4: Character consistency       → same figure, two environments
 *
 * Mouse parallax on all layers. Seamless cross-fade transitions.
 */

import { useEffect, useRef, useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  type: "fire" | "spark" | "ember" | "smoke" | "dragon" | "dust";
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CLIP_DURATION = 5500; // ms per clip before cross-fade
const FADE_DURATION = 900;  // ms cross-fade
const CLIPS = 4;

// ── Canvas Renderers ──────────────────────────────────────────────────────────

function drawFireClip(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number,
  particles: Particle[], intensity: number
) {
  ctx.fillStyle = "rgba(0,0,0,1)"; ctx.fillRect(0,0,w,h);

  // Ground glow
  const gg = ctx.createLinearGradient(0, h*0.6, 0, h);
  gg.addColorStop(0, `rgba(220,80,0,${0.5*intensity})`);
  gg.addColorStop(0.55, `rgba(110,25,0,${0.3*intensity})`);
  gg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gg; ctx.fillRect(0, h*0.6, w, h*0.4);

  // Volumetric rays
  for (let i=0; i<12; i++) {
    const ang = -Math.PI/2 + (i-5.5)*0.14 + Math.sin(t*0.001+i)*0.04;
    const len = h*1.1;
    const cx = w/2 + Math.sin(t*0.0007+i*0.6)*w*0.05;
    const cy = h*0.75;
    const rg = ctx.createLinearGradient(cx, cy, cx+Math.cos(ang)*len, cy+Math.sin(ang)*len);
    rg.addColorStop(0, `rgba(255,140,0,${0.16*intensity})`);
    rg.addColorStop(0.45, `rgba(255,70,0,${0.07*intensity})`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    const sp = 0.1;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx+Math.cos(ang-sp)*len, cy+Math.sin(ang-sp)*len);
    ctx.lineTo(cx+Math.cos(ang+sp)*len, cy+Math.sin(ang+sp)*len);
    ctx.closePath(); ctx.fillStyle = rg; ctx.fill();
  }

  // Particles
  particles.forEach(p => {
    const lr = p.life/p.maxLife;
    if (p.type==="fire") {
      const r = lr>0.5 ? 255 : Math.floor(255*lr*2);
      const g = Math.floor(lr*155);
      const a = lr*0.92*intensity;
      const fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      fg.addColorStop(0, `rgba(255,255,${Math.floor(lr*190)},${a})`);
      fg.addColorStop(0.4, `rgba(${r},${g},0,${a*0.8})`);
      fg.addColorStop(1, `rgba(${r},0,0,0)`);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fillStyle = fg; ctx.fill();
    } else if (p.type==="spark") {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*lr, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,220,80,${lr*intensity})`; ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x-p.vx*4, p.y-p.vy*4);
      ctx.strokeStyle = `rgba(255,180,40,${lr*0.5*intensity})`; ctx.lineWidth = p.size*0.5; ctx.stroke();
    } else if (p.type==="ember") {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*lr, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,100,20,${lr*0.75*intensity})`; ctx.fill();
    } else if (p.type==="smoke") {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*(1-lr*0.3), 0, Math.PI*2);
      ctx.fillStyle = `rgba(40,30,20,${lr*0.13*intensity})`; ctx.fill();
    }
  });

  // Anamorphic lens streak
  ctx.beginPath(); ctx.moveTo(0, h*0.75); ctx.lineTo(w, h*0.75);
  const as = ctx.createLinearGradient(0, h*0.75, w, h*0.75);
  as.addColorStop(0, "rgba(255,120,0,0)"); as.addColorStop(0.35, `rgba(255,120,0,${0.1*intensity})`);
  as.addColorStop(0.5, `rgba(255,200,80,${0.35*intensity})`); as.addColorStop(0.65, `rgba(255,120,0,${0.1*intensity})`);
  as.addColorStop(1, "rgba(255,120,0,0)");
  ctx.strokeStyle = as; ctx.lineWidth = 2; ctx.stroke();
}

function drawDragonClip(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number, particles: Particle[]
) {
  // Night city skyline
  ctx.fillStyle = "rgba(0,0,0,1)"; ctx.fillRect(0,0,w,h);

  // Sky gradient — deep purple to dark blue
  const sky = ctx.createLinearGradient(0,0,0,h*0.65);
  sky.addColorStop(0, "rgba(4,2,18,1)"); sky.addColorStop(0.5, "rgba(10,4,32,1)");
  sky.addColorStop(1, "rgba(18,6,40,1)");
  ctx.fillStyle = sky; ctx.fillRect(0,0,w,h*0.65);

  // Moon
  const moonX = w*0.78; const moonY = h*0.12;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, h*0.18);
  moonGlow.addColorStop(0, "rgba(220,230,255,0.9)"); moonGlow.addColorStop(0.08, "rgba(180,200,255,0.7)");
  moonGlow.addColorStop(0.3, "rgba(100,120,200,0.15)"); moonGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = moonGlow; ctx.fillRect(moonX-h*0.18, moonY-h*0.18, h*0.36, h*0.36);
  ctx.fillStyle = "rgba(230,240,255,1)"; ctx.beginPath(); ctx.arc(moonX, moonY, h*0.04, 0, Math.PI*2); ctx.fill();

  // City buildings
  for (let i=0; i<36; i++) {
    const bx = (i/35)*w*1.05-w*0.025;
    const bh = h*(0.12+Math.sin(i*1.8+0.4)*0.22+Math.cos(i*0.85)*0.1);
    const bw = w*0.032+Math.sin(i*2.2)*w*0.012;
    ctx.fillStyle = `rgba(${5+i%4*2},${3+i%3*2},${15+i%5*3},1)`;
    ctx.fillRect(bx-bw/2, h-bh, bw, bh);
    // Windows
    const wc = Math.floor(bh/(h*0.038));
    for (let j=0; j<wc; j++) {
      if (Math.sin(i*3.8+j*2.2)>0.25) {
        const wx = bx-bw*0.28+Math.sin(j*1.4)*bw*0.18;
        const wy = h-bh+j*(h*0.038)+h*0.009;
        const fl = 0.5+0.5*Math.sin(t*0.0018*(i+1)+j);
        const hue = (i*42+j*15)%360;
        ctx.fillStyle = `hsla(${hue},75%,65%,${0.5*fl})`;
        ctx.fillRect(wx, wy, bw*0.13, h*0.013);
      }
    }
  }

  // Wet ground
  const rg = ctx.createLinearGradient(0, h*0.73, 0, h);
  rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(0.3, "rgba(15,0,35,0.45)"); rg.addColorStop(1, "rgba(6,0,16,0.65)");
  ctx.fillStyle = rg; ctx.fillRect(0, h*0.73, w, h*0.27);

  // Dragon flight path — sinusoidal arc across sky
  const dragonT = ((t * 0.00025) % 1);
  const dragonX = dragonT * (w * 1.4) - w * 0.2;
  const dragonY = h * 0.28 + Math.sin(dragonT * Math.PI * 2.5) * h * 0.12;
  const dragonScale = 0.8 + Math.sin(dragonT * Math.PI * 3) * 0.15;
  const wingFlap = Math.sin(t * 0.008) * 0.4;

  ctx.save();
  ctx.translate(dragonX, dragonY);
  ctx.scale(dragonScale, dragonScale);

  // Dragon body
  ctx.fillStyle = "rgba(80,20,10,1)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 55, 22, 0, 0, Math.PI*2); ctx.fill();
  // Head
  ctx.beginPath(); ctx.ellipse(52, -8, 22, 16, -0.3, 0, Math.PI*2); ctx.fill();
  // Snout
  ctx.beginPath(); ctx.ellipse(70, -10, 14, 9, -0.2, 0, Math.PI*2); ctx.fill();
  // Eye
  ctx.fillStyle = "rgba(255,200,0,1)";
  ctx.beginPath(); ctx.arc(58, -12, 5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.beginPath(); ctx.arc(59, -12, 2.5, 0, Math.PI*2); ctx.fill();
  // Tail
  ctx.fillStyle = "rgba(80,20,10,1)";
  ctx.beginPath(); ctx.moveTo(-55, 0); ctx.quadraticCurveTo(-90, 20, -110, 5); ctx.lineWidth = 12; ctx.strokeStyle = "rgba(80,20,10,1)"; ctx.stroke();
  // Wings
  ctx.fillStyle = "rgba(120,30,15,0.85)";
  // Left wing
  ctx.beginPath(); ctx.moveTo(0, -10);
  ctx.lineTo(-30, -50-wingFlap*60); ctx.lineTo(-70, -30-wingFlap*40); ctx.lineTo(-50, 5); ctx.closePath(); ctx.fill();
  // Right wing
  ctx.beginPath(); ctx.moveTo(0, -10);
  ctx.lineTo(-30, -50+wingFlap*60); ctx.lineTo(-70, -30+wingFlap*40); ctx.lineTo(-50, 5); ctx.closePath(); ctx.fill();

  // Fire breath
  if (dragonT > 0.1) {
    const fireLen = 80 + Math.sin(t*0.006)*30;
    const fg2 = ctx.createLinearGradient(70, -10, 70+fireLen, -10);
    fg2.addColorStop(0, "rgba(255,240,100,0.95)"); fg2.addColorStop(0.3, "rgba(255,120,0,0.8)");
    fg2.addColorStop(0.7, "rgba(255,50,0,0.4)"); fg2.addColorStop(1, "rgba(255,0,0,0)");
    ctx.beginPath(); ctx.moveTo(70, -10);
    ctx.lineTo(70+fireLen, -10-15); ctx.lineTo(70+fireLen, -10+15); ctx.closePath();
    ctx.fillStyle = fg2; ctx.fill();
  }
  ctx.restore();

  // Dragon dust particles
  particles.forEach(p => {
    if (p.type==="dust") {
      const lr = p.life/p.maxLife;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*lr, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,${80+Math.floor(lr*120)},0,${lr*0.6})`; ctx.fill();
    }
  });

  // Anamorphic streak
  ctx.beginPath(); ctx.moveTo(0, dragonY); ctx.lineTo(w, dragonY);
  const ds = ctx.createLinearGradient(0, dragonY, w, dragonY);
  ds.addColorStop(0, "rgba(80,40,200,0)"); ds.addColorStop(Math.max(0,dragonT-0.1), "rgba(80,40,200,0)");
  ds.addColorStop(dragonT, "rgba(160,120,255,0.25)"); ds.addColorStop(Math.min(1,dragonT+0.1), "rgba(80,40,200,0)");
  ds.addColorStop(1, "rgba(80,40,200,0)");
  ctx.strokeStyle = ds; ctx.lineWidth = 2; ctx.stroke();
}

function drawKidsClip(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number
) {
  // Pixar-style bright meadow
  const sky = ctx.createLinearGradient(0,0,0,h*0.65);
  sky.addColorStop(0, "rgba(70,150,255,1)"); sky.addColorStop(1, "rgba(140,200,255,1)");
  ctx.fillStyle = sky; ctx.fillRect(0,0,w,h*0.65);

  // Clouds
  const cloud = (cx: number, cy: number, sc: number) => {
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    for (let i=0; i<6; i++) { const ox=(i-2.5)*24*sc; const oy=Math.abs(i-2.5)*9*sc; ctx.beginPath(); ctx.arc(cx+ox, cy+oy, 20*sc, 0, Math.PI*2); ctx.fill(); }
  };
  cloud(w*0.18+Math.sin(t*0.00028)*22, h*0.13, 1.3);
  cloud(w*0.68+Math.sin(t*0.00035+1)*18, h*0.08, 1.0);
  cloud(w*0.45+Math.sin(t*0.00022+2)*26, h*0.2, 0.75);
  cloud(w*0.88+Math.sin(t*0.0003+3)*12, h*0.16, 0.6);

  // Rolling hills
  const hg = ctx.createLinearGradient(0, h*0.48, 0, h);
  hg.addColorStop(0, "rgba(72,170,52,1)"); hg.addColorStop(0.5, "rgba(55,145,40,1)"); hg.addColorStop(1, "rgba(40,110,30,1)");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.moveTo(0,h); ctx.lineTo(0, h*0.63);
  for (let i=0; i<=24; i++) { ctx.lineTo((i/24)*w, h*0.63-Math.sin(i*0.65+0.4)*h*0.09); }
  ctx.lineTo(w,h); ctx.closePath(); ctx.fill();

  // Flowers
  for (let i=0; i<18; i++) {
    const fx = (i/17)*w*0.9+w*0.05;
    const fy = h*0.72 - Math.sin(i*0.65+0.4)*h*0.09 + h*0.03;
    const hue = (i*40)%360;
    ctx.fillStyle = `hsla(${hue},90%,65%,0.9)`;
    ctx.beginPath(); ctx.arc(fx, fy, h*0.012, 0, Math.PI*2); ctx.fill();
  }

  // Animals — bouncing in sync
  const b1 = Math.abs(Math.sin(t*0.004))*h*0.032;
  const b2 = Math.abs(Math.sin(t*0.004+1.2))*h*0.028;
  const b3 = Math.abs(Math.sin(t*0.004+2.4))*h*0.025;

  // Lion (left)
  ctx.fillStyle = "rgba(145,72,15,1)"; ctx.beginPath(); ctx.arc(w*0.22, h*0.73-b1, h*0.078, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(215,155,55,1)"; ctx.beginPath(); ctx.arc(w*0.22, h*0.73-b1, h*0.058, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.beginPath(); ctx.arc(w*0.22-h*0.019, h*0.726-b1, h*0.009, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(w*0.22+h*0.019, h*0.726-b1, h*0.009, 0, Math.PI*2); ctx.fill();
  // Smile
  ctx.beginPath(); ctx.arc(w*0.22, h*0.733-b1, h*0.02, 0, Math.PI); ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 2; ctx.stroke();

  // Elephant (center)
  ctx.fillStyle = "rgba(150,150,170,1)";
  ctx.beginPath(); ctx.ellipse(w*0.5, h*0.74-b2, h*0.075, h*0.065, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(w*0.5+h*0.055, h*0.715-b2, h*0.048, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "rgba(150,150,170,1)"; ctx.lineWidth = h*0.016; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(w*0.5+h*0.095, h*0.72-b2);
  ctx.quadraticCurveTo(w*0.5+h*0.125, h*0.75-b2, w*0.5+h*0.085, h*0.77-b2); ctx.stroke();
  // Ears
  ctx.fillStyle = "rgba(170,140,160,1)";
  ctx.beginPath(); ctx.ellipse(w*0.5-h*0.04, h*0.72-b2, h*0.035, h*0.05, -0.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.beginPath(); ctx.arc(w*0.5+h*0.065, h*0.71-b2, h*0.008, 0, Math.PI*2); ctx.fill();

  // Giraffe (right)
  ctx.fillStyle = "rgba(210,160,50,1)";
  // Body
  ctx.beginPath(); ctx.ellipse(w*0.78, h*0.76-b3, h*0.055, h*0.05, 0, 0, Math.PI*2); ctx.fill();
  // Neck
  ctx.beginPath(); ctx.moveTo(w*0.78-h*0.02, h*0.72-b3); ctx.lineTo(w*0.78+h*0.01, h*0.72-b3);
  ctx.lineTo(w*0.78+h*0.025, h*0.62-b3); ctx.lineTo(w*0.78-h*0.005, h*0.62-b3); ctx.closePath(); ctx.fill();
  // Head
  ctx.beginPath(); ctx.ellipse(w*0.78+h*0.015, h*0.6-b3, h*0.03, h*0.022, 0, 0, Math.PI*2); ctx.fill();
  // Spots
  ctx.fillStyle = "rgba(160,100,20,0.6)";
  for (let i=0; i<5; i++) {
    const sx = w*0.78 + Math.sin(i*2.1)*h*0.04;
    const sy = h*0.74-b3 + Math.cos(i*1.7)*h*0.03;
    ctx.beginPath(); ctx.arc(sx, sy, h*0.012, 0, Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.beginPath(); ctx.arc(w*0.78+h*0.022, h*0.597-b3, h*0.007, 0, Math.PI*2); ctx.fill();

  // Sun
  const sg = ctx.createRadialGradient(w*0.88, h*0.1, 0, w*0.88, h*0.1, h*0.14);
  sg.addColorStop(0, "rgba(255,240,80,1)"); sg.addColorStop(0.4, "rgba(255,200,40,0.8)"); sg.addColorStop(1, "rgba(255,180,0,0)");
  ctx.fillStyle = sg; ctx.fillRect(w*0.74, 0, w*0.28, h*0.24);
  ctx.fillStyle = "rgba(255,240,80,1)"; ctx.beginPath(); ctx.arc(w*0.88, h*0.1, h*0.058, 0, Math.PI*2); ctx.fill();
  // Sun rays
  ctx.strokeStyle = "rgba(255,220,60,0.6)"; ctx.lineWidth = 3;
  for (let i=0; i<8; i++) {
    const ang = (i/8)*Math.PI*2 + t*0.001;
    ctx.beginPath();
    ctx.moveTo(w*0.88+Math.cos(ang)*h*0.07, h*0.1+Math.sin(ang)*h*0.07);
    ctx.lineTo(w*0.88+Math.cos(ang)*h*0.1, h*0.1+Math.sin(ang)*h*0.1);
    ctx.stroke();
  }
}

function drawConsistencyClip(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number, phase: number
) {
  // Split screen: forest (left) + neon city (right)
  // Same character silhouette in both

  // Left: misty forest
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,w/2,h); ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,1)"; ctx.fillRect(0,0,w,h);
  // Fog
  for (let i=0; i<5; i++) {
    const fy = h*(0.28+i*0.13)+Math.sin(t*0.0005+i)*14;
    const fg2 = ctx.createLinearGradient(0, fy-55, 0, fy+55);
    fg2.addColorStop(0, "rgba(0,0,0,0)"); fg2.addColorStop(0.5, `rgba(18,38,30,${0.12-i*0.015})`); fg2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fg2; ctx.fillRect(0, fy-55, w, 110);
  }
  // Trees
  ctx.fillStyle = "rgba(3,10,6,1)";
  for (let i=0; i<14; i++) {
    const tx = (i/13)*(w/2); const th = h*(0.2+Math.sin(i*2.3)*0.1);
    const tw = w*0.032+Math.sin(i*1.7)*w*0.007;
    ctx.beginPath(); ctx.moveTo(tx, h*0.85); ctx.lineTo(tx-tw, h*0.85);
    ctx.lineTo(tx-tw*0.5, h*0.85-th*0.35); ctx.lineTo(tx-tw*0.7, h*0.85-th*0.35);
    ctx.lineTo(tx-tw*0.3, h*0.85-th*0.65); ctx.lineTo(tx-tw*0.5, h*0.85-th*0.65);
    ctx.lineTo(tx, h*0.85-th);
    ctx.lineTo(tx+tw*0.5, h*0.85-th*0.65); ctx.lineTo(tx+tw*0.3, h*0.85-th*0.65);
    ctx.lineTo(tx+tw*0.7, h*0.85-th*0.35); ctx.lineTo(tx+tw*0.5, h*0.85-th*0.35);
    ctx.lineTo(tx+tw, h*0.85); ctx.closePath(); ctx.fill();
  }
  // Ground mist
  const gm = ctx.createLinearGradient(0, h*0.74, 0, h);
  gm.addColorStop(0, "rgba(0,0,0,0)"); gm.addColorStop(0.4, "rgba(12,25,18,0.55)"); gm.addColorStop(1, "rgba(3,10,6,0.85)");
  ctx.fillStyle = gm; ctx.fillRect(0, h*0.74, w, h*0.26);
  // Moonlight
  const ml = ctx.createRadialGradient(w*0.25, 0, 0, w*0.25, 0, h*0.8);
  ml.addColorStop(0, "rgba(170,210,190,0.1)"); ml.addColorStop(0.3, "rgba(90,150,130,0.05)"); ml.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ml; ctx.fillRect(0,0,w,h);
  ctx.restore();

  // Right: neon city
  ctx.save(); ctx.beginPath(); ctx.rect(w/2,0,w/2,h); ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,1)"; ctx.fillRect(0,0,w,h);
  for (let i=0; i<20; i++) {
    const bx = w/2+(i/19)*(w/2)*1.05-w*0.025;
    const bh = h*(0.12+Math.sin(i*1.9+0.5)*0.22+Math.cos(i*0.9)*0.1);
    const bw = w*0.028+Math.sin(i*2.1)*w*0.01;
    ctx.fillStyle = `rgba(${5+i%3*2},${3+i%2*2},${16+i%4*3},1)`;
    ctx.fillRect(bx-bw/2, h-bh, bw, bh);
    const wc = Math.floor(bh/(h*0.04));
    for (let j=0; j<wc; j++) {
      if (Math.sin(i*3.7+j*2.1)>0.3) {
        const wx = bx-bw*0.28+Math.sin(j*1.3)*bw*0.18;
        const wy = h-bh+j*(h*0.04)+h*0.01;
        const fl = 0.6+0.4*Math.sin(t*0.002*(i+1)+j);
        const hue = (i*42+j*14)%360;
        ctx.fillStyle = `hsla(${hue},80%,68%,${0.52*fl})`;
        ctx.fillRect(wx, wy, bw*0.13, h*0.013);
      }
    }
  }
  // Ground reflections
  const rg = ctx.createLinearGradient(0, h*0.74, 0, h);
  rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(0.3, "rgba(16,0,34,0.42)"); rg.addColorStop(1, "rgba(7,0,16,0.62)");
  ctx.fillStyle = rg; ctx.fillRect(0, h*0.74, w, h*0.26);
  ctx.restore();

  // Divider
  const da = 0.5 + 0.5*Math.sin(t*0.001);
  ctx.strokeStyle = `rgba(200,200,200,${da*0.2})`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,h); ctx.stroke();

  // Same character in both halves
  const drawChar = (cx: number, cy: number, sc: number, color: string) => {
    const wp = Math.sin(t*0.003)*0.3;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(cx, cy-80*sc, 18*sc, 30*sc, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy-120*sc, 14*sc, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 8*sc; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy-55*sc); ctx.lineTo(cx+Math.sin(wp)*20*sc, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy-55*sc); ctx.lineTo(cx-Math.sin(wp)*20*sc, cy); ctx.stroke();
    ctx.lineWidth = 6*sc;
    ctx.beginPath(); ctx.moveTo(cx, cy-90*sc); ctx.lineTo(cx+Math.sin(wp+1)*25*sc, cy-65*sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy-90*sc); ctx.lineTo(cx-Math.sin(wp+1)*25*sc, cy-65*sc); ctx.stroke();
  };

  const sc = h*0.0015;
  drawChar(w*0.25, h*0.78, sc, "rgba(6,14,10,1)");
  drawChar(w*0.75, h*0.78, sc, "rgba(4,2,12,1)");
}

function applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.028) {
  const id = ctx.getImageData(0,0,w,h); const d = id.data;
  for (let i=0; i<d.length; i+=4) {
    const n = (Math.random()-0.5)*255*strength;
    d[i]=Math.min(255,Math.max(0,d[i]+n)); d[i+1]=Math.min(255,Math.max(0,d[i+1]+n)); d[i+2]=Math.min(255,Math.max(0,d[i+2]+n));
  }
  ctx.putImageData(id,0,0);
}

function applyVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const v = ctx.createRadialGradient(w/2, h/2, h*0.25, w/2, h/2, Math.max(w,h)*0.78);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = v; ctx.fillRect(0,0,w,h);
}

// ── Particle spawners ─────────────────────────────────────────────────────────

function spawnFireP(w: number, h: number): Particle {
  return { x: w/2+(Math.random()-0.5)*w*0.3, y: h*0.82, vx: (Math.random()-0.5)*1.8, vy: -(2+Math.random()*5),
    life: 1, maxLife: 1, size: 10+Math.random()*28, type: Math.random()>0.62 ? "smoke" : "fire" };
}
function spawnSparkP(w: number, h: number): Particle {
  return { x: w/2+(Math.random()-0.5)*w*0.24, y: h*0.78, vx: (Math.random()-0.5)*8, vy: -(3+Math.random()*10),
    life: 1, maxLife: 1, size: 2+Math.random()*4, type: Math.random()>0.5 ? "spark" : "ember" };
}
function spawnDust(x: number, y: number): Particle {
  return { x, y, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*2-1,
    life: 1, maxLife: 1, size: 3+Math.random()*8, type: "dragon" };
}

// ── Prompt overlay ────────────────────────────────────────────────────────────

const PROMPTS = [
  "Walking through fire",
  "A dragon flying over a city",
  "Cartoon animals dancing",
  "",  // consistency clip — no prompt text
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  mouseX?: number;
  mouseY?: number;
}

export default function HeroCinematicBg({ mouseX = 0.5, mouseY = 0.5 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const clipStartRef = useRef<number>(0);
  const [clip, setClip] = useState(0);
  const [promptAlpha, setPromptAlpha] = useState(0);
  const [promptText, setPromptText] = useState("");
  const [typedText, setTypedText] = useState("");
  const clipRef = useRef(0);

  // Clip sequencer
  useEffect(() => {
    let idx = 0;
    clipRef.current = 0;
    clipStartRef.current = performance.now();
    setClip(0); setPromptAlpha(0); setTypedText(""); setPromptText(PROMPTS[0]);
    particlesRef.current = [];

    const advance = () => {
      idx = (idx+1) % CLIPS;
      clipRef.current = idx;
      setClip(idx);
      clipStartRef.current = performance.now();
      setPromptAlpha(0); setTypedText(""); setPromptText(PROMPTS[idx]);
      particlesRef.current = [];
    };

    let tid: ReturnType<typeof setTimeout>;
    const sched = (i: number) => { tid = setTimeout(() => { advance(); sched((i+1)%CLIPS); }, CLIP_DURATION); };
    sched(0);
    return () => clearTimeout(tid);
  }, []);

  // Typewriter effect for prompt
  useEffect(() => {
    const text = PROMPTS[clip];
    if (!text) { setTypedText(""); return; }
    setTypedText("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedText(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 38);
    return () => clearInterval(interval);
  }, [clip]);

  // Prompt fade in
  useEffect(() => {
    const tid = setTimeout(() => setPromptAlpha(1), 200);
    return () => clearTimeout(tid);
  }, [clip]);

  // Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);

    const loop = (now: number) => {
      const w = canvas.width; const h = canvas.height;
      const elapsed = now - clipStartRef.current;
      const c = clipRef.current;

      if (c===0) {
        // Fire clip
        const intensity = Math.min(1, elapsed/350);
        if (intensity>0.05) {
          const sc = Math.floor(intensity*10);
          for (let i=0; i<sc; i++) particlesRef.current.push(spawnFireP(w,h));
          if (Math.random()<intensity*0.5) particlesRef.current.push(spawnSparkP(w,h));
        }
        particlesRef.current = particlesRef.current.filter(p=>p.life>0);
        particlesRef.current.forEach(p => {
          p.x += p.vx + Math.sin(now*0.002+p.y*0.01)*0.5; p.y += p.vy; p.vy -= 0.05; p.vx *= 0.99;
          const dec = p.type==="smoke" ? 0.006 : p.type==="spark" ? 0.026 : 0.013;
          p.life -= dec;
          if (p.type==="fire") p.size *= 1.009;
        });
        drawFireClip(ctx, w, h, now, particlesRef.current, intensity);
      } else if (c===1) {
        // Dragon clip
        const dragonT = ((now * 0.00025) % 1);
        const dragonX = dragonT * (w * 1.4) - w * 0.2;
        const dragonY = h * 0.28 + Math.sin(dragonT * Math.PI * 2.5) * h * 0.12;
        if (Math.random() < 0.3) particlesRef.current.push(spawnDust(dragonX, dragonY+20));
        particlesRef.current = particlesRef.current.filter(p=>p.life>0);
        particlesRef.current.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.life -= 0.018;
        });
        drawDragonClip(ctx, w, h, now, particlesRef.current);
      } else if (c===2) {
        // Kids clip
        drawKidsClip(ctx, w, h, now);
        particlesRef.current = [];
      } else if (c===3) {
        // Consistency clip
        drawConsistencyClip(ctx, w, h, now, elapsed);
        particlesRef.current = [];
      }

      applyVignette(ctx, w, h);
      applyGrain(ctx, w, h, 0.025);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, []);

  const parallaxX = (mouseX - 0.5) * -12;
  const parallaxY = (mouseY - 0.5) * -8;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `translate(${parallaxX}px, ${parallaxY}px) scale(1.04)`,
          transition: "transform 0.35s ease-out",
        }}
      />

      {/* Prompt text — bottom left, typewriter style */}
      {PROMPTS[clip] && (
        <div
          className="absolute"
          style={{
            bottom: "12%",
            left: "5%",
            zIndex: 10,
            opacity: promptAlpha,
            transition: "opacity 0.4s ease",
            pointerEvents: "none",
          }}
        >
          {/* Prompt label */}
          <div style={{
            fontFamily: "'Barlow', sans-serif",
            fontSize: "0.65rem",
            letterSpacing: "0.25em",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            marginBottom: "0.4rem",
          }}>
            prompt
          </div>
          {/* Prompt text with cursor */}
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(1.2rem, 2.5vw, 2rem)",
            letterSpacing: "0.06em",
            color: clip === 0 ? "#ff8c00" : clip === 1 ? "#a78bfa" : "#60d060",
            textShadow: clip === 0
              ? "0 0 30px rgba(255,100,0,0.7)"
              : clip === 1
              ? "0 0 30px rgba(167,139,250,0.7)"
              : "0 0 30px rgba(80,200,80,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}>
            "{typedText}
            <span style={{
              display: "inline-block",
              width: "2px",
              height: "1.1em",
              background: "currentColor",
              marginLeft: "1px",
              animation: "cursorBlink 0.8s ease-in-out infinite",
              opacity: typedText.length < (PROMPTS[clip]?.length || 0) ? 1 : 0,
            }} />
            {typedText.length >= (PROMPTS[clip]?.length || 0) ? '"' : ''}
          </div>
          {/* Arrow → output */}
          {typedText.length >= (PROMPTS[clip]?.length || 0) && (
            <div style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              color: "rgba(255,255,255,0.28)",
              marginTop: "0.3rem",
              animation: "fadeInUp 0.5s ease forwards",
            }}>
              → generating...
            </div>
          )}
        </div>
      )}

      {/* Consistency clip label */}
      {clip === 3 && (
        <div
          className="absolute"
          style={{
            bottom: "12%",
            left: "5%",
            zIndex: 10,
            opacity: promptAlpha,
            transition: "opacity 0.4s ease",
            pointerEvents: "none",
          }}
        >
          <div style={{
            fontFamily: "'Barlow', sans-serif",
            fontSize: "0.65rem",
            letterSpacing: "0.25em",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            marginBottom: "0.4rem",
          }}>
            character consistency
          </div>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(1rem, 2vw, 1.6rem)",
            letterSpacing: "0.06em",
            color: "rgba(200,200,220,0.7)",
          }}>
            Same face · Same outfit · Any world
          </div>
        </div>
      )}

      {/* Clip indicator dots */}
      <div
        className="absolute flex gap-2"
        style={{ bottom: "8%", right: "5%", zIndex: 10, pointerEvents: "none" }}
      >
        {Array.from({ length: CLIPS }).map((_, i) => (
          <div key={i} style={{
            width: i === clip ? "20px" : "5px",
            height: "5px",
            borderRadius: "2.5px",
            background: i === clip ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.18)",
            transition: "all 0.4s ease",
          }} />
        ))}
      </div>

      <style>{`
        @keyframes cursorBlink { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
