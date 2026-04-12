/**
 * CinematicEntryScreen — IMAX-grade cinematic experience
 * Pure text → visual transformation. No UI. No icons. No cards.
 * Every scene: a text prompt causes an immediate visual world to form.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  type: "fire" | "spark" | "ember" | "smoke" | "star";
}

const SCENE_DURATIONS = [2200, 2200, 4500, 3800, 3200, 5000];
const TOTAL = 6;

// ── Canvas renderers ──────────────────────────────────────────────────────────

function drawStarfield(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, stars: Particle[]) {
  const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.7);
  bg.addColorStop(0, "rgba(8,6,18,1)");
  bg.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);
  stars.forEach(p => {
    const tw = 0.5 + 0.5*Math.sin(t*0.002 + p.x*0.1);
    const sr = Math.max(0.1, p.size*tw);
    ctx.beginPath(); ctx.arc(p.x, p.y, sr, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,255,255,${p.life*tw})`; ctx.fill();
  });
  const neb = ctx.createRadialGradient(w*0.6, h*0.3, 0, w*0.6, h*0.3, w*0.4);
  neb.addColorStop(0, "rgba(60,20,120,0.07)"); neb.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = neb; ctx.fillRect(0,0,w,h);
}

function drawFire(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, particles: Particle[], intensity: number) {
  ctx.fillStyle = "rgba(0,0,0,1)"; ctx.fillRect(0,0,w,h);

  // Ground glow
  const gg = ctx.createLinearGradient(0, h*0.65, 0, h);
  gg.addColorStop(0, `rgba(200,70,0,${0.45*intensity})`);
  gg.addColorStop(0.6, `rgba(100,20,0,${0.25*intensity})`);
  gg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gg; ctx.fillRect(0, h*0.65, w, h*0.35);

  // Volumetric rays
  for (let i=0; i<10; i++) {
    const ang = -Math.PI/2 + (i-4.5)*0.16 + Math.sin(t*0.001+i)*0.04;
    const len = h*0.95;
    const cx2 = w/2 + Math.sin(t*0.0008+i*0.5)*w*0.04;
    const cy2 = h*0.78;
    const rg = ctx.createLinearGradient(cx2, cy2, cx2+Math.cos(ang)*len, cy2+Math.sin(ang)*len);
    rg.addColorStop(0, `rgba(255,130,0,${0.14*intensity})`);
    rg.addColorStop(0.5, `rgba(255,70,0,${0.06*intensity})`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    const sp = 0.11;
    ctx.beginPath();
    ctx.moveTo(cx2, cy2);
    ctx.lineTo(cx2+Math.cos(ang-sp)*len, cy2+Math.sin(ang-sp)*len);
    ctx.lineTo(cx2+Math.cos(ang+sp)*len, cy2+Math.sin(ang+sp)*len);
    ctx.closePath(); ctx.fillStyle = rg; ctx.fill();
  }

  // Particles
  particles.forEach(p => {
    const lr = Math.max(0, p.life/p.maxLife);
    if (lr <= 0) return;
    if (p.type==="fire") {
      const r = lr>0.5 ? 255 : Math.floor(255*lr*2);
      const g = Math.floor(lr*150);
      const a = lr*0.9*intensity;
      const sz = Math.max(0.1, p.size);
      const fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz);
      fg.addColorStop(0, `rgba(255,255,${Math.floor(lr*180)},${a})`);
      fg.addColorStop(0.4, `rgba(${r},${g},0,${a*0.8})`);
      fg.addColorStop(1, `rgba(${r},0,0,0)`);
      ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI*2);
      ctx.fillStyle = fg; ctx.fill();
    } else if (p.type==="spark") {
      const a = lr*intensity;
      const rr = Math.max(0.1, p.size*lr);
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,220,80,${a})`; ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x-p.vx*4, p.y-p.vy*4);
      ctx.strokeStyle = `rgba(255,180,40,${a*0.5})`; ctx.lineWidth = Math.max(0.1, p.size*0.5); ctx.stroke();
    } else if (p.type==="ember") {
      const rr = Math.max(0.1, p.size*lr);
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,100,20,${lr*0.7*intensity})`; ctx.fill();
    } else if (p.type==="smoke") {
      const rr = Math.max(0.1, p.size*(1-lr*0.3));
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI*2);
      ctx.fillStyle = `rgba(40,30,20,${lr*0.12*intensity})`; ctx.fill();
    }
  });

  // Heat shimmer
  const hs = ctx.createLinearGradient(0, h*0.58, 0, h*0.72);
  hs.addColorStop(0, "rgba(0,0,0,0)");
  hs.addColorStop(0.5, `rgba(255,110,0,${0.035*intensity*(0.8+0.2*Math.sin(t*0.012))})`);
  hs.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hs; ctx.fillRect(0, h*0.58, w, h*0.14);
}

function drawForest(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, charX: number) {
  ctx.fillStyle = "rgba(0,0,0,1)"; ctx.fillRect(0,0,w,h);
  // Fog
  for (let i=0; i<5; i++) {
    const fy = h*(0.3+i*0.12) + Math.sin(t*0.0005+i)*15;
    const fg = ctx.createLinearGradient(0, fy-60, 0, fy+60);
    fg.addColorStop(0, "rgba(0,0,0,0)");
    fg.addColorStop(0.5, `rgba(20,40,35,${0.12-i*0.015})`);
    fg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fg; ctx.fillRect(0, fy-60, w, 120);
  }
  // Trees
  ctx.fillStyle = "rgba(4,12,8,1)";
  for (let i=0; i<22; i++) {
    const tx = (i/21)*w; const th = h*(0.22+Math.sin(i*2.3)*0.1);
    const tw = w*0.035+Math.sin(i*1.7)*w*0.008;
    ctx.beginPath();
    ctx.moveTo(tx, h*0.85); ctx.lineTo(tx-tw, h*0.85);
    ctx.lineTo(tx-tw*0.55, h*0.85-th*0.3); ctx.lineTo(tx-tw*0.75, h*0.85-th*0.3);
    ctx.lineTo(tx-tw*0.35, h*0.85-th*0.6); ctx.lineTo(tx-tw*0.55, h*0.85-th*0.6);
    ctx.lineTo(tx, h*0.85-th);
    ctx.lineTo(tx+tw*0.55, h*0.85-th*0.6); ctx.lineTo(tx+tw*0.35, h*0.85-th*0.6);
    ctx.lineTo(tx+tw*0.75, h*0.85-th*0.3); ctx.lineTo(tx+tw*0.55, h*0.85-th*0.3);
    ctx.lineTo(tx+tw, h*0.85); ctx.closePath(); ctx.fill();
  }
  // Ground mist
  const gm = ctx.createLinearGradient(0, h*0.75, 0, h);
  gm.addColorStop(0, "rgba(0,0,0,0)"); gm.addColorStop(0.4, "rgba(14,28,22,0.5)"); gm.addColorStop(1, "rgba(4,12,8,0.8)");
  ctx.fillStyle = gm; ctx.fillRect(0, h*0.75, w, h*0.25);
  // Moonlight
  const ml = ctx.createRadialGradient(w*0.5, 0, 0, w*0.5, 0, h*0.9);
  ml.addColorStop(0, "rgba(180,220,200,0.1)"); ml.addColorStop(0.3, "rgba(100,160,140,0.05)"); ml.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ml; ctx.fillRect(0,0,w,h);
  // Character
  const sc = h*0.0015; const cy = h*0.78;
  const wp = Math.sin(t*0.003)*0.3;
  ctx.fillStyle = "rgba(8,16,12,1)";
  ctx.beginPath(); ctx.ellipse(charX, cy-80*sc, 18*sc, 30*sc, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(charX, cy-120*sc, 14*sc, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "rgba(8,16,12,1)"; ctx.lineWidth = 8*sc; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(charX, cy-55*sc); ctx.lineTo(charX+Math.sin(wp)*20*sc, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(charX, cy-55*sc); ctx.lineTo(charX-Math.sin(wp)*20*sc, cy); ctx.stroke();
  ctx.lineWidth = 6*sc;
  ctx.beginPath(); ctx.moveTo(charX, cy-90*sc); ctx.lineTo(charX+Math.sin(wp+1)*25*sc, cy-65*sc); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(charX, cy-90*sc); ctx.lineTo(charX-Math.sin(wp+1)*25*sc, cy-65*sc); ctx.stroke();
  ctx.fillStyle = "rgba(0,25,20,0.14)"; ctx.fillRect(0,0,w,h);
}

function drawCity(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, charX: number) {
  ctx.fillStyle = "rgba(0,0,0,1)"; ctx.fillRect(0,0,w,h);
  // Buildings
  for (let i=0; i<32; i++) {
    const bx = (i/31)*w*1.1-w*0.05;
    const bh = h*(0.14+Math.sin(i*1.8+0.5)*0.2+Math.cos(i*0.9)*0.1);
    const bw = w*0.038+Math.sin(i*2.1)*w*0.014;
    ctx.fillStyle = `rgba(${6+i%3*2},${4+i%2*2},${18+i%4*2},1)`;
    ctx.fillRect(bx-bw/2, h-bh, bw, bh);
    // Windows
    const wc = Math.floor(bh/(h*0.04));
    for (let j=0; j<wc; j++) {
      if (Math.sin(i*3.7+j*2.1)>0.3) {
        const wx = bx-bw*0.3+Math.sin(j*1.3)*bw*0.2;
        const wy = h-bh+j*(h*0.04)+h*0.01;
        const fl = 0.6+0.4*Math.sin(t*0.002*(i+1)+j);
        const hue = (i*37+j*13)%360;
        ctx.fillStyle = `hsla(${hue},80%,70%,${0.55*fl})`;
        ctx.fillRect(wx, wy, bw*0.14, h*0.014);
      }
    }
  }
  // Wet ground reflections
  const rg = ctx.createLinearGradient(0, h*0.75, 0, h);
  rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(0.3, "rgba(18,0,38,0.4)"); rg.addColorStop(1, "rgba(8,0,18,0.6)");
  ctx.fillStyle = rg; ctx.fillRect(0, h*0.75, w, h*0.25);
  for (let i=0; i<7; i++) {
    const sx = w*(0.08+i*0.14);
    const sg = ctx.createLinearGradient(sx, h*0.8, sx, h);
    const hue = i*55;
    sg.addColorStop(0, `hsla(${hue},100%,60%,0.14)`); sg.addColorStop(1, `hsla(${hue},100%,60%,0)`);
    ctx.fillStyle = sg; ctx.fillRect(sx-2, h*0.8, 4, h*0.2);
  }
  // Haze
  const hz = ctx.createLinearGradient(0, h*0.5, 0, h*0.75);
  hz.addColorStop(0, "rgba(0,0,0,0)"); hz.addColorStop(1, "rgba(18,4,38,0.28)");
  ctx.fillStyle = hz; ctx.fillRect(0, h*0.5, w, h*0.25);
  // Same character
  const sc = h*0.0015; const cy = h*0.78;
  const wp = Math.sin(t*0.003)*0.3;
  ctx.fillStyle = "rgba(4,2,12,1)";
  ctx.beginPath(); ctx.ellipse(charX, cy-80*sc, 18*sc, 30*sc, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(charX, cy-120*sc, 14*sc, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "rgba(4,2,12,1)"; ctx.lineWidth = 8*sc; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(charX, cy-55*sc); ctx.lineTo(charX+Math.sin(wp)*20*sc, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(charX, cy-55*sc); ctx.lineTo(charX-Math.sin(wp)*20*sc, cy); ctx.stroke();
  ctx.lineWidth = 6*sc;
  ctx.beginPath(); ctx.moveTo(charX, cy-90*sc); ctx.lineTo(charX+Math.sin(wp+1)*25*sc, cy-65*sc); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(charX, cy-90*sc); ctx.lineTo(charX-Math.sin(wp+1)*25*sc, cy-65*sc); ctx.stroke();
  ctx.fillStyle = "rgba(18,4,0,0.1)"; ctx.fillRect(0,0,w,h);
}

function drawCinematicLandscape(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // Epic sunset landscape
  const sky = ctx.createLinearGradient(0,0,0,h*0.62);
  sky.addColorStop(0, "rgba(4,4,18,1)"); sky.addColorStop(0.35, "rgba(28,12,48,1)");
  sky.addColorStop(0.7, "rgba(75,28,18,1)"); sky.addColorStop(1, "rgba(175,65,18,1)");
  ctx.fillStyle = sky; ctx.fillRect(0,0,w,h*0.62);
  // Sun glow
  const sg = ctx.createRadialGradient(w*0.5, h*0.56, 0, w*0.5, h*0.56, w*0.32);
  sg.addColorStop(0, "rgba(255,200,80,0.9)"); sg.addColorStop(0.12, "rgba(255,130,40,0.6)");
  sg.addColorStop(0.45, "rgba(200,55,0,0.2)"); sg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sg; ctx.fillRect(0,0,w,h);
  // Mountains
  ctx.fillStyle = "rgba(7,4,14,1)";
  ctx.beginPath(); ctx.moveTo(0, h*0.62);
  for (let i=0; i<=22; i++) {
    const mx = (i/22)*w;
    const my = h*0.62 - h*(0.04+Math.sin(i*0.78)*0.12+Math.cos(i*1.32)*0.07);
    ctx.lineTo(mx, my);
  }
  ctx.lineTo(w, h*0.62); ctx.closePath(); ctx.fill();
  // Foreground
  ctx.fillStyle = "rgba(2,1,6,1)";
  ctx.beginPath(); ctx.moveTo(0,h); ctx.lineTo(0, h*0.73);
  for (let i=0; i<=22; i++) {
    const mx = (i/22)*w;
    const my = h*0.73 + Math.sin(i*1.2+0.5)*h*0.04;
    ctx.lineTo(mx, my);
  }
  ctx.lineTo(w,h); ctx.closePath(); ctx.fill();
  // Lens flare
  const fx = w*0.5 + Math.sin(t*0.0005)*w*0.018;
  const lf = ctx.createRadialGradient(fx, h*0.56, 0, fx, h*0.56, 65);
  lf.addColorStop(0, "rgba(255,240,200,0.85)"); lf.addColorStop(0.3, "rgba(255,170,80,0.3)"); lf.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = lf; ctx.fillRect(0,0,w,h);
  // Anamorphic streak
  ctx.beginPath(); ctx.moveTo(0, h*0.56); ctx.lineTo(w, h*0.56);
  const as = ctx.createLinearGradient(0, h*0.56, w, h*0.56);
  as.addColorStop(0, "rgba(100,180,255,0)"); as.addColorStop(0.38, "rgba(100,180,255,0.12)");
  as.addColorStop(0.5, "rgba(220,230,255,0.45)"); as.addColorStop(0.62, "rgba(100,180,255,0.12)"); as.addColorStop(1, "rgba(100,180,255,0)");
  ctx.strokeStyle = as; ctx.lineWidth = 2; ctx.stroke();
}

function drawVerticalShot(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = "rgba(4,2,14,1)"; ctx.fillRect(0,0,w,h);
  const vw = w*0.42; const vx = (w-vw)/2;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(vx, h*0.05, vw, h*0.9, 12); ctx.clip();
  // Urban bg
  const ub = ctx.createLinearGradient(vx, h*0.05, vx, h*0.95);
  ub.addColorStop(0, "rgba(4,2,18,1)"); ub.addColorStop(0.5, "rgba(12,4,32,1)"); ub.addColorStop(1, "rgba(6,1,16,1)");
  ctx.fillStyle = ub; ctx.fillRect(vx, h*0.05, vw, h*0.9);
  // Bokeh lights
  for (let i=0; i<45; i++) {
    const bx2 = vx + Math.sin(i*2.3)*vw*0.44 + vw*0.5;
    const by2 = h*0.1 + Math.cos(i*1.7)*h*0.34 + h*0.18;
    const br = Math.max(0.1, 3+Math.sin(i*3.1)*9);
    const hue = (i*47)%360;
    const bk = ctx.createRadialGradient(bx2, by2, 0, bx2, by2, br);
    bk.addColorStop(0, `hsla(${hue},90%,70%,0.8)`); bk.addColorStop(1, `hsla(${hue},90%,70%,0)`);
    ctx.fillStyle = bk; ctx.fillRect(bx2-br, by2-br, br*2, br*2);
  }
  // Subject silhouette
  const sx = vx+vw*0.5; const sy = h*0.75;
  ctx.fillStyle = "rgba(6,3,18,1)";
  ctx.beginPath(); ctx.arc(sx, sy-h*0.18, h*0.07, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(sx, sy, h*0.06, h*0.12, 0, 0, Math.PI*2); ctx.fill();
  // Rim light
  const rl = ctx.createRadialGradient(sx-vw*0.3, sy-h*0.1, 0, sx-vw*0.3, sy-h*0.1, Math.max(0.1, vw*0.5));
  rl.addColorStop(0, "rgba(0,140,255,0.18)"); rl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rl; ctx.fillRect(vx, h*0.05, vw, h*0.9);
  ctx.restore();
  ctx.strokeStyle = "rgba(100,100,200,0.28)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(vx, h*0.05, vw, h*0.9, 12); ctx.stroke();
}

function drawKidsScene(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // Pixar-style bright
  const sky = ctx.createLinearGradient(0,0,0,h*0.65);
  sky.addColorStop(0, "rgba(75,155,255,1)"); sky.addColorStop(1, "rgba(145,205,255,1)");
  ctx.fillStyle = sky; ctx.fillRect(0,0,w,h*0.65);
  // Clouds
  const cloud = (cx: number, cy: number, sc: number) => {
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    for (let i=0; i<5; i++) { const ox=(i-2)*22*sc; const oy=Math.abs(i-2)*8*sc; ctx.beginPath(); ctx.arc(cx+ox, cy+oy, 18*sc, 0, Math.PI*2); ctx.fill(); }
  };
  cloud(w*0.2+Math.sin(t*0.0003)*20, h*0.14, 1.2);
  cloud(w*0.7+Math.sin(t*0.0004+1)*15, h*0.09, 0.9);
  cloud(w*0.5+Math.sin(t*0.00025+2)*22, h*0.21, 0.7);
  // Hills
  const hg = ctx.createLinearGradient(0, h*0.5, 0, h);
  hg.addColorStop(0, "rgba(75,175,55,1)"); hg.addColorStop(1, "rgba(48,135,38,1)");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.moveTo(0,h); ctx.lineTo(0, h*0.65);
  for (let i=0; i<=22; i++) { ctx.lineTo((i/22)*w, h*0.65-Math.sin(i*0.7+0.3)*h*0.08); }
  ctx.lineTo(w,h); ctx.closePath(); ctx.fill();
  // Animals
  const b = Math.abs(Math.sin(t*0.004))*h*0.03;
  // Lion
  ctx.fillStyle = "rgba(155,80,18,1)"; ctx.beginPath(); ctx.arc(w*0.3, h*0.72-b, h*0.075, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(220,160,60,1)"; ctx.beginPath(); ctx.arc(w*0.3, h*0.72-b, h*0.055, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.beginPath(); ctx.arc(w*0.3-h*0.018, h*0.715-b, h*0.008, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(w*0.3+h*0.018, h*0.715-b, h*0.008, 0, Math.PI*2); ctx.fill();
  // Elephant
  const eb = Math.abs(Math.sin(t*0.004+1))*h*0.025;
  ctx.fillStyle = "rgba(155,155,175,1)";
  ctx.beginPath(); ctx.ellipse(w*0.65, h*0.73-eb, h*0.07, h*0.06, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(w*0.65+h*0.05, h*0.705-eb, h*0.045, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "rgba(155,155,175,1)"; ctx.lineWidth = h*0.015; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(w*0.65+h*0.09, h*0.71-eb);
  ctx.quadraticCurveTo(w*0.65+h*0.12, h*0.74-eb, w*0.65+h*0.08, h*0.76-eb); ctx.stroke();
  // Sun
  const sg2 = ctx.createRadialGradient(w*0.85, h*0.12, 0, w*0.85, h*0.12, h*0.12);
  sg2.addColorStop(0, "rgba(255,240,80,1)"); sg2.addColorStop(0.4, "rgba(255,200,40,0.8)"); sg2.addColorStop(1, "rgba(255,180,0,0)");
  ctx.fillStyle = sg2; ctx.fillRect(w*0.73, 0, w*0.24, h*0.24);
  ctx.fillStyle = "rgba(255,240,80,1)"; ctx.beginPath(); ctx.arc(w*0.85, h*0.12, h*0.055, 0, Math.PI*2); ctx.fill();
}

function applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.032) {
  const id = ctx.getImageData(0,0,w,h); const d = id.data;
  for (let i=0; i<d.length; i+=4) {
    const n = (Math.random()-0.5)*255*strength;
    d[i]=Math.min(255,Math.max(0,d[i]+n)); d[i+1]=Math.min(255,Math.max(0,d[i+1]+n)); d[i+2]=Math.min(255,Math.max(0,d[i+2]+n));
  }
  ctx.putImageData(id,0,0);
}

function applyVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const v = ctx.createRadialGradient(w/2, h/2, Math.max(0, h*0.28), w/2, h/2, Math.max(0.1, Math.max(w,h)*0.76));
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.68)");
  ctx.fillStyle = v; ctx.fillRect(0,0,w,h);
}

function spawnFire(w: number, h: number): Particle {
  return { x: w/2+(Math.random()-0.5)*w*0.28, y: h*0.82, vx: (Math.random()-0.5)*1.6, vy: -(2+Math.random()*4.5),
    life: 1, maxLife: 1, size: 9+Math.random()*26, type: Math.random()>0.65 ? "smoke" : "fire" };
}
function spawnSpark(w: number, h: number): Particle {
  return { x: w/2+(Math.random()-0.5)*w*0.22, y: h*0.78, vx: (Math.random()-0.5)*7, vy: -(3+Math.random()*9),
    life: 1, maxLife: 1, size: 2+Math.random()*3.5, type: Math.random()>0.5 ? "spark" : "ember" };
}
function spawnStar(w: number, h: number): Particle {
  return { x: Math.random()*w, y: Math.random()*h, vx: 0, vy: 0,
    life: 0.3+Math.random()*0.7, maxLife: 0.3+Math.random()*0.7, size: 0.5+Math.random()*1.5, type: "star" };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onComplete?: () => void; onDismiss?: () => void; }

export default function CinematicEntryScreen({ onComplete, onDismiss }: Props) {
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Particle[]>([]);
  const sceneStartRef = useRef<number>(0);
  const [scene, setScene] = useState(0);
  const [textAlpha, setTextAlpha] = useState(0);
  const [fireIntensity, setFireIntensity] = useState(0);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [overlayAlpha, setOverlayAlpha] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const sceneRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    starsRef.current = Array.from({ length: 220 }, () => spawnStar(canvas.width || window.innerWidth, canvas.height || window.innerHeight));
  }, []);

  const handleSkip = useCallback(() => { onComplete?.(); onDismiss?.(); navigate("/"); }, [onComplete, onDismiss, navigate]);
  const handleCTA = useCallback(() => { onComplete?.(); onDismiss?.(); navigate("/"); }, [onComplete, onDismiss, navigate]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX/window.innerWidth, y: e.clientY/window.innerHeight });
  }, []);

  // Scene sequencer
  useEffect(() => {
    let idx = 0;
    sceneRef.current = 0;
    sceneStartRef.current = performance.now();
    setScene(0); setTextAlpha(0); setFireIntensity(0); setCtaVisible(false); setOverlayAlpha(0);

    const advance = () => {
      idx = (idx+1) % TOTAL;
      sceneRef.current = idx;
      setScene(idx);
      sceneStartRef.current = performance.now();
      setTextAlpha(0); setFireIntensity(0); setCtaVisible(false); setOverlayAlpha(0);
      particlesRef.current = [];
    };

    let tid: ReturnType<typeof setTimeout>;
    const sched = (i: number) => { tid = setTimeout(() => { advance(); sched((i+1)%TOTAL); }, SCENE_DURATIONS[i]); };
    sched(0);
    return () => clearTimeout(tid);
  }, []);

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
      const elapsed = now - sceneStartRef.current;
      const s = sceneRef.current;

      if (s===0) {
        drawStarfield(ctx, w, h, now, starsRef.current);
        setTextAlpha(Math.min(1, elapsed/900));
      } else if (s===1) {
        drawStarfield(ctx, w, h, now, starsRef.current);
        const pulse = Math.sin(elapsed*0.002)*0.5+0.5;
        const gl = ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*0.4);
        gl.addColorStop(0, `rgba(80,40,160,${0.07*pulse})`); gl.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gl; ctx.fillRect(0,0,w,h);
        setTextAlpha(Math.min(1, elapsed/650));
      } else if (s===2) {
        const intensity = Math.min(1, elapsed/280);
        setFireIntensity(intensity);
        if (intensity>0.08) {
          const sc2 = Math.floor(intensity*9);
          for (let i=0; i<sc2; i++) particlesRef.current.push(spawnFire(w,h));
          if (Math.random()<intensity*0.45) particlesRef.current.push(spawnSpark(w,h));
        }
        particlesRef.current = particlesRef.current.filter(p=>p.life>0);
        particlesRef.current.forEach(p => {
          p.x += p.vx + Math.sin(now*0.002+p.y*0.01)*0.5;
          p.y += p.vy; p.vy -= 0.05; p.vx *= 0.99;
          const dec = p.type==="smoke" ? 0.006 : p.type==="spark" ? 0.026 : 0.013;
          p.life -= dec;
          if (p.type==="fire") p.size *= 1.009;
        });
        drawFire(ctx, w, h, now, particlesRef.current, intensity);
        setTextAlpha(Math.min(1, elapsed/180));
      } else if (s===3) {
        const split = elapsed < 1900;
        if (split) {
          ctx.save(); ctx.beginPath(); ctx.rect(0,0,w/2,h); ctx.clip();
          drawForest(ctx, w, h, now, w*0.25); ctx.restore();
          ctx.save(); ctx.beginPath(); ctx.rect(w/2,0,w/2,h); ctx.clip();
          drawCity(ctx, w, h, now, w*0.75); ctx.restore();
          const da = Math.min(1, elapsed/400);
          ctx.strokeStyle = `rgba(200,200,200,${da*0.25})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,h); ctx.stroke();
        } else {
          const fade = Math.min(1, (elapsed-1900)/650);
          drawCity(ctx, w, h, now, w*0.45);
          if (fade<1) {
            ctx.save(); ctx.beginPath(); ctx.rect(0,0,w/2,h); ctx.clip();
            ctx.globalAlpha = 1-fade; drawForest(ctx, w, h, now, w*0.25); ctx.globalAlpha = 1; ctx.restore();
          }
        }
        setTextAlpha(Math.min(1, elapsed/550));
      } else if (s===4) {
        const cd = 960; const ci = Math.floor(elapsed/cd)%3; const ce = elapsed%cd;
        const cf = Math.min(1, ce/140); const cfo = ce>cd-140 ? Math.max(0,1-(ce-(cd-140))/140) : 1;
        ctx.fillStyle = "rgba(0,0,0,1)"; ctx.fillRect(0,0,w,h);
        ctx.globalAlpha = cf*cfo;
        if (ci===0) drawCinematicLandscape(ctx, w, h, now);
        else if (ci===1) drawVerticalShot(ctx, w, h, now);
        else drawKidsScene(ctx, w, h, now);
        ctx.globalAlpha = 1;
        setTextAlpha(0);
      } else if (s===5) {
        const zoom = Math.max(1, 1.32-elapsed*0.00014);
        ctx.save(); ctx.translate(w/2,h/2); ctx.scale(zoom,zoom); ctx.translate(-w/2,-h/2);
        drawCinematicLandscape(ctx, w, h, now); ctx.restore();
        const oa = Math.min(0.55, elapsed*0.00019);
        setOverlayAlpha(oa);
        const ta = Math.min(1, Math.max(0,(elapsed-1300)/850));
        setTextAlpha(ta);
        if (elapsed>1300) setCtaVisible(true);
      }

      applyVignette(ctx, w, h);
      applyGrain(ctx, w, h, 0.028);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black" onMouseMove={handleMouseMove} style={{ cursor: "none" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"
        style={{ transform: `translate(${(mousePos.x-0.5)*-9}px,${(mousePos.y-0.5)*-9}px)`, transition: "transform 0.3s ease-out" }} />

      {/* Anamorphic bars */}
      <div className="absolute inset-x-0 top-0 bg-black" style={{ height:"6.5vh", zIndex:10 }} />
      <div className="absolute inset-x-0 bottom-0 bg-black" style={{ height:"6.5vh", zIndex:10 }} />

      {/* Dark overlay — final scene */}
      {scene===5 && (
        <div className="absolute inset-0" style={{ background:"rgba(0,0,0,0.52)", opacity: overlayAlpha/0.55, zIndex:5 }} />
      )}

      {/* Scene text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex:20, pointerEvents:"none" }}>
        {/* Scene 0 */}
        {scene===0 && (
          <div style={{ opacity:textAlpha, transition:"opacity 0.3s ease", fontFamily:"'Bebas Neue',sans-serif",
            fontSize:"clamp(2.8rem,7.5vw,6.5rem)", letterSpacing:"0.08em", color:"#ffffff",
            textShadow:"0 0 50px rgba(255,255,255,0.18), 0 2px 6px rgba(0,0,0,0.9)", textAlign:"center", padding:"0 2rem" }}>
            Your ideas...
          </div>
        )}
        {/* Scene 1 */}
        {scene===1 && (
          <div style={{ opacity:textAlpha, transition:"opacity 0.3s ease", fontFamily:"'Bebas Neue',sans-serif",
            fontSize:"clamp(2.8rem,7.5vw,6.5rem)", letterSpacing:"0.08em", textAlign:"center", padding:"0 2rem",
            background:"linear-gradient(135deg,#fff 0%,#a78bfa 50%,#60a5fa 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
            filter:"drop-shadow(0 0 45px rgba(167,139,250,0.55))" }}>
            ...become real
          </div>
        )}
        {/* Scene 2 — fire */}
        {scene===2 && (
          <div style={{ opacity:textAlpha, fontFamily:"'Bebas Neue',sans-serif",
            fontSize:"clamp(2.8rem,7.5vw,6.5rem)", letterSpacing:"0.08em", textAlign:"center", padding:"0 2rem",
            color: fireIntensity>0.3 ? "#ff8c00" : "#ffffff",
            textShadow: fireIntensity>0.3
              ? `0 0 ${60+fireIntensity*60}px rgba(255,100,0,${0.9*fireIntensity}), 0 0 ${120+fireIntensity*80}px rgba(255,50,0,${0.5*fireIntensity}), 0 0 200px rgba(200,30,0,0.3)`
              : "0 0 40px rgba(255,255,255,0.2)",
            transform: `scale(${1+fireIntensity*0.045})`,
            transition: "opacity 0.2s ease, color 0.2s, text-shadow 0.2s, transform 0.1s" }}>
            Walking through fire
          </div>
        )}
        {/* Scene 5 — CTA */}
        {scene===5 && (
          <div className="text-center px-8" style={{ maxWidth:"820px", opacity:textAlpha, transition:"opacity 0.4s ease", pointerEvents:"auto" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(2rem,5vw,4.5rem)",
              letterSpacing:"0.06em", color:"#ffffff", lineHeight:1.1, marginBottom:"1rem",
              textShadow:"0 0 60px rgba(255,255,255,0.18), 0 2px 10px rgba(0,0,0,0.95)" }}>
              Turn your ideas into cinematic video
            </div>
            <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:"clamp(0.9rem,1.8vw,1.3rem)",
              color:"rgba(200,200,220,0.82)", letterSpacing:"0.04em", marginBottom:"2.5rem",
              textShadow:"0 1px 4px rgba(0,0,0,0.85)" }}>
              AI that understands your content, lyrics and story
            </div>
            {ctaVisible && (
              <button onClick={handleCTA} style={{
                fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(1rem,2vw,1.4rem)",
                letterSpacing:"0.14em", color:"#000", background:"linear-gradient(135deg,#ff8c00,#ff4500)",
                border:"none", padding:"1rem 3.2rem", borderRadius:"4px", cursor:"pointer",
                boxShadow:"0 0 45px rgba(255,100,0,0.65), 0 4px 22px rgba(0,0,0,0.55)",
                animation:"ctaPulse 2.5s ease-in-out infinite",
                transition:"transform 0.2s ease, box-shadow 0.2s ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="scale(1.06)"; (e.currentTarget as HTMLElement).style.boxShadow="0 0 70px rgba(255,130,0,0.85), 0 6px 30px rgba(0,0,0,0.6)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow="0 0 45px rgba(255,100,0,0.65), 0 4px 22px rgba(0,0,0,0.55)"; }}>
                Create Your First Video
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scene dots */}
      <div className="absolute bottom-12 left-1/2 flex gap-2" style={{ transform:"translateX(-50%)", zIndex:30 }}>
        {Array.from({length:TOTAL}).map((_,i) => (
          <div key={i} style={{ width:i===scene?"26px":"6px", height:"6px", borderRadius:"3px",
            background:i===scene?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.22)", transition:"all 0.4s ease" }} />
        ))}
      </div>

      {/* Skip */}
      <button onClick={handleSkip} style={{ position:"absolute", top:"8vh", right:"2rem", zIndex:30,
        background:"none", border:"none", color:"rgba(255,255,255,0.38)", fontFamily:"'Barlow',sans-serif",
        fontSize:"0.72rem", letterSpacing:"0.22em", cursor:"pointer" }}
        onMouseEnter={e => ((e.target as HTMLElement).style.color="rgba(255,255,255,0.75)")}
        onMouseLeave={e => ((e.target as HTMLElement).style.color="rgba(255,255,255,0.38)")}>
        SKIP
      </button>

      <style>{`
        @keyframes ctaPulse {
          0%,100% { box-shadow:0 0 45px rgba(255,100,0,0.65),0 4px 22px rgba(0,0,0,0.55); }
          50% { box-shadow:0 0 85px rgba(255,140,0,0.95),0 4px 22px rgba(0,0,0,0.55); }
        }
      `}</style>
    </div>
  );
}
