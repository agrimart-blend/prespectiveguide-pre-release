// Core script for Perspective Guide final
const board = document.getElementById('board');
const boardInner = document.getElementById('boardInner');
const drawCanvas = document.getElementById('drawCanvas');
const overlay = document.getElementById('overlay');

function handleExportBlob(blob, filename){
  try{
    const reader = new FileReader();
    reader.onload = function(){
      try{
        sessionStorage.setItem('perspective_export_data', reader.result);
        sessionStorage.setItem('perspective_export_name', filename);
        window.location.href = 'thankyou.html'; setTimeout(()=>{ state.showGrid=prevGrid; state.showPerspective=prevPersp; },0);
      }catch(e){ console.error(e); }
    };
    reader.readAsDataURL(blob);
  }catch(e){ console.error(e); }
}


function saveBlobForThankYou(blob, filename, cb){
  try{
    const reader = new FileReader();
    reader.onload = function(){ try{ sessionStorage.setItem('perspective_export_data', reader.result); sessionStorage.setItem('perspective_export_name', filename); }catch(e){}
      try{ if(cb) cb(); }catch(e){}
    };
    reader.readAsDataURL(blob);
  }catch(e){ console.warn('saveBlobForThankYou failed', e); try{ if(cb) cb(); }catch(e){} }
}



const ratioSelect = document.getElementById('ratio');
const dpiInput = document.getElementById('dpi');
const vpBtns = document.querySelectorAll('.vp-btn');
const linesCount = document.getElementById('linesCount');
const colorInput = document.getElementById('color');
const canvasColorInput = document.getElementById('canvasColor');
const opacityInput = document.getElementById('opacity');
const strokeInput = document.getElementById('stroke');
const clearPointsBtn = document.getElementById('clearPoints');
const exportBtn = document.getElementById('exportBtn');
const formatSelect = document.getElementById('format');
const curveToggle = document.getElementById('curveToggle');

let state = { paper:[210,297], dpi:300, rect:{w:1320,h:960}, vpCount:1, points:[], linesCount:30, color:'#1e88a8', canvasColor:'#ffffff', opacity:0.8, stroke:1.5, curveEnabled:true };
// --- Grid & view toggles (added) ---
state.showGrid = true;
state.gridDivX = 10;
state.gridDivY = 10;
state.gridColor = '#cccccc';
state.gridOpacity = 0.6;
state.showPerspective = true;
// --- end added ---


function setupCanvas(){
  drawCanvas.style.width = state.rect.w + 'px';
  drawCanvas.style.height = state.rect.h + 'px';
  const cssW = parseInt(getComputedStyle(drawCanvas).width);
  const cssH = parseInt(getComputedStyle(drawCanvas).height);
  drawCanvas.width = cssW;
  drawCanvas.height = cssH;
  overlay.setAttribute('width', boardInner.clientWidth);
  overlay.setAttribute('height', boardInner.clientHeight);
  overlay.style.width = boardInner.clientWidth + 'px';
  overlay.style.height = boardInner.clientHeight + 'px';
}
window.addEventListener('load', ()=>{ state.curveEnabled = curveToggle.checked; setupCanvas(); render(); });
window.addEventListener('resize', ()=>{ setupCanvas(); render(); });

ratioSelect.addEventListener('change', ()=> {
  const v = ratioSelect.value;
  if(v==='1:1'){ state.rect.w=1200; state.rect.h=1200; }
  else if(v==='16:9'){ state.rect.w=1600; state.rect.h=900; }
  else if(v==='1:2'){ state.rect.w=900; state.rect.h=1800; }
  else if(v==='4:3'){ state.rect.w=1200; state.rect.h=900; }
  else { state.rect.w=1320; state.rect.h=960; }
  setupCanvas(); render();
});

vpBtns.forEach(b=>b.addEventListener('click', ()=>{ vpBtns.forEach(bb=>bb.classList.remove('active')); b.classList.add('active'); state.vpCount = parseInt(b.dataset.vp,10); while(state.points.length > state.vpCount){ const p = state.points.pop(); if(p.el) p.el.remove(); } render(); }));



// --- grid & view control bindings (added) ---
const showGridCheckbox = document.getElementById('showGrid');
const gridDivXInput = document.getElementById('gridDivX');
const gridDivYInput = document.getElementById('gridDivY');
const gridColorInput = document.getElementById('gridColor');
const gridOpacityInput = document.getElementById('gridOpacity');
const showPerspectiveCheckbox = document.getElementById('showPerspective');

if(showGridCheckbox){
  showGridCheckbox.addEventListener('change', ()=>{ state.showGrid = !!showGridCheckbox.checked; render(); });
}
if(gridDivXInput){
  gridDivXInput.addEventListener('change', ()=>{ state.gridDivX = Math.max(1, parseInt(gridDivXInput.value)||10); render(); });
}
if(gridDivYInput){
  gridDivYInput.addEventListener('change', ()=>{ state.gridDivY = Math.max(1, parseInt(gridDivYInput.value)||10); render(); });
}
if(gridColorInput){
  gridColorInput.addEventListener('input', ()=>{ state.gridColor = gridColorInput.value; render(); });
}
if(gridOpacityInput){
  gridOpacityInput.addEventListener('input', ()=>{ state.gridOpacity = parseFloat(gridOpacityInput.value)||0.6; render(); });
}
if(showPerspectiveCheckbox){
  showPerspectiveCheckbox.addEventListener('change', ()=>{ state.showPerspective = !!showPerspectiveCheckbox.checked; render(); });
}
// --- end added ---
linesCount.addEventListener('change', ()=>{ state.linesCount = parseInt(linesCount.value)||30; render(); });
colorInput.addEventListener('input', ()=>{ state.color = colorInput.value; render(); });
canvasColorInput.addEventListener('input', ()=>{ state.canvasColor = canvasColorInput.value; render(); });
opacityInput.addEventListener('input', ()=>{ state.opacity = parseFloat(opacityInput.value)||0.8; render(); });
strokeInput.addEventListener('input', ()=>{ state.stroke = parseFloat(strokeInput.value)||1.5; render(); });
curveToggle.addEventListener('change', ()=>{ state.curveEnabled = curveToggle.checked; render(); });

clearPointsBtn.addEventListener('click', ()=>{ state.points.slice().forEach(p=>{ if(p.el) p.el.remove(); }); state.points=[]; render(); });

let dragging=null;
boardInner.addEventListener('pointerdown',(ev)=>{
  const b = boardInner.getBoundingClientRect();
  const x = ev.clientX - b.left + board.scrollLeft; const y = ev.clientY - b.top + board.scrollTop;
  const hit = findPointAt(x,y);
  if(hit){ dragging = hit; hit.el.setPointerCapture(ev.pointerId); return; }
  if(state.points.length < state.vpCount){ addPoint(x,y); } else { const near = nearestPointTo(x,y); if(near) movePointTo(near,x,y); }
  render();
});
boardInner.addEventListener('pointermove',(ev)=>{ if(!dragging) return; const b = boardInner.getBoundingClientRect(); movePointTo(dragging, ev.clientX - b.left + board.scrollLeft, ev.clientY - b.top + board.scrollTop); render(); });
boardInner.addEventListener('pointerup',(ev)=>{ if(dragging){ try{ dragging.el.releasePointerCapture(ev.pointerId);}catch(e){} dragging=null; }});
boardInner.addEventListener('contextmenu',(ev)=>{ ev.preventDefault(); const b = boardInner.getBoundingClientRect(); const hit = findPointAt(ev.clientX - b.left + board.scrollLeft, ev.clientY - b.top + board.scrollTop); if(hit) removePoint(hit); render(); });

function addPoint(x,y){
  const el = document.createElement('div'); el.className='vp-marker'; el.style.position='absolute'; el.style.left = x + 'px'; el.style.top = y + 'px';
  el.style.width='18px'; el.style.height='18px'; el.style.borderRadius='50%'; el.style.background=state.color; el.style.border='2px solid #fff'; el.style.transform='translate(-50%,-50%)'; el.style.zIndex = 3;
  el.style.display='flex'; el.style.alignItems='center'; el.style.justifyContent='center'; el.style.color='#02254a'; el.style.fontSize='12px';
  el.textContent = state.points.length + 1;
  boardInner.appendChild(el);
  const p = {x,y,el}; state.points.push(p); return p;
}
function removePoint(pt){ try{ pt.el.remove(); }catch(e){} state.points = state.points.filter(p=>p!==pt); state.points.forEach((p,i)=>p.el.textContent = i+1); }
function movePointTo(pt,x,y){ pt.x=x; pt.y=y; pt.el.style.left = x + 'px'; pt.el.style.top = y + 'px'; }
function findPointAt(x,y){ return state.points.find(p=>Math.hypot(p.x-x,p.y-y) < 14); }
function nearestPointTo(x,y){ let best=null,bd=1e9; state.points.forEach(p=>{ const d=Math.hypot(p.x-x,p.y-y); if(d<bd){bd=d;best=p;} }); return best; }

function render(){
  setupCanvas();
  const innerW = boardInner.clientWidth, innerH = boardInner.clientHeight;
  const canvasLeft = Math.round((innerW - parseInt(drawCanvas.style.width))/2);
  const canvasTop = Math.round((innerH - parseInt(drawCanvas.style.height))/2);
  drawCanvas.style.position = 'absolute'; drawCanvas.style.left = canvasLeft + 'px'; drawCanvas.style.top = canvasTop + 'px';
  overlay.style.left = '0px'; overlay.style.top = '0px';

  const ctx = drawCanvas.getContext('2d');
  ctx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
  ctx.fillStyle = state.canvasColor; ctx.fillRect(0,0,drawCanvas.width,drawCanvas.height);

  // draw orthogonal grid (if enabled)
  if(state.showGrid){
    ctx.save();
    ctx.setLineDash([]);
    ctx.lineWidth = Math.max(0.4, state.stroke*0.6);
    ctx.strokeStyle = hexToRgba(state.gridColor, state.gridOpacity);
    const gx = Math.max(1, parseInt(state.gridDivX)||10);
    const gy = Math.max(1, parseInt(state.gridDivY)||10);
    for(let i=0;i<=gx;i++){
      const x = Math.round(i * (drawCanvas.width / gx));
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, drawCanvas.height); ctx.stroke();
    }
    for(let j=0;j<=gy;j++){
      const y = Math.round(j * (drawCanvas.height / gy));
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(drawCanvas.width, y); ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save(); ctx.setLineDash([8,6]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(15,63,80,0.12)'; ctx.strokeRect(1.5,1.5,drawCanvas.width-3,drawCanvas.height-3); ctx.restore();

  if(state.showPerspective){
    if(state.curveEnabled && state.vpCount===4 && state.points.length===4){
    const pts = state.points.slice();
    const top = pts.reduce((a,b)=> a.y<b.y? a:b);
    const bottom = pts.reduce((a,b)=> a.y>b.y? a:b);
    const left = pts.reduce((a,b)=> a.x<b.x? a:b);
    const right = pts.reduce((a,b)=> a.x>b.x? a:b);
    const vTop = {x: top.x - canvasLeft, y: top.y - canvasTop};
    const vBottom = {x: bottom.x - canvasLeft, y: bottom.y - canvasTop};
    const vLeft = {x: left.x - canvasLeft, y: left.y - canvasTop};
    const vRight = {x: right.x - canvasLeft, y: right.y - canvasTop};

    const n = Math.max(8, Math.floor(state.linesCount/2));
    ctx.strokeStyle = hexToRgba(state.color, state.opacity);
    ctx.lineWidth = state.stroke;
    for(let i=1;i<=n;i++){
      const t = i/(n+1);
      const y = t * drawCanvas.height;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(vTop.x, vTop.y, drawCanvas.width, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(vBottom.x, vBottom.y, drawCanvas.width, y); ctx.stroke();
    }
    const m = Math.max(8, Math.floor(state.linesCount/2));
    for(let j=1;j<=m;j++){
      const s = j/(m+1);
      const x = s * drawCanvas.width;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(vLeft.x, vLeft.y, x, drawCanvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(vRight.x, vRight.y, x, drawCanvas.height); ctx.stroke();
    }
  } else {
    ctx.lineWidth = state.stroke; ctx.strokeStyle = hexToRgba(state.color, state.opacity);
    const canvasW = drawCanvas.width, canvasH = drawCanvas.height;
    const canvasLeftLocal = parseInt(drawCanvas.style.left);
    const canvasTopLocal = parseInt(drawCanvas.style.top);
    const vps = state.points.map(p=>({x: p.x - canvasLeftLocal, y: p.y - canvasTopLocal}));
    if(vps.length>0){
      const total = Math.max(4, state.linesCount);
      for(let i=0;i<total;i++){
        const angle = (i/total) * Math.PI * 2;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        vps.forEach(vp=>{
          const seg = lineRectSegment(vp.x, vp.y, dx, dy, 0,0, canvasW, canvasH);
          if(seg){ ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke(); }
        });
      }
    }
  }

  
  }

while(overlay.firstChild) overlay.removeChild(overlay.firstChild);
  state.points.forEach((p,i)=>{
    const cx = p.x, cy = p.y;
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', 9); c.setAttribute('fill', state.color); c.setAttribute('stroke','#fff'); c.setAttribute('stroke-width','2');
    overlay.appendChild(c);
    const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
    txt.setAttribute('x', cx + 14); txt.setAttribute('y', cy + 5); txt.setAttribute('font-size', '13'); txt.setAttribute('fill', '#033'); txt.textContent = i+1;
    overlay.appendChild(txt);
  });
}

function lineRectSegment(px,py,dx,dy,rx,ry,rw,rh){
  const pts=[]; const eps=1e-9;
  if(Math.abs(dx)>eps){ const t1=(0-px)/dx; const y1=py+t1*dy; if(y1>=0-1e-6 && y1<=rh+1e-6) pts.push({x:0,y:y1,t:t1}); const t2=(rw-px)/dx; const y2=py+t2*dy; if(y2>=0-1e-6 && y2<=rh+1e-6) pts.push({x:rw,y:y2,t:t2}); }
  if(Math.abs(dy)>eps){ const t3=(0-py)/dy; const x3=px+t3*dx; if(x3>=0-1e-6 && x3<=rw+1e-6) pts.push({x:x3,y:0,t:t3}); const t4=(rh-py)/dy; const x4=px+t4*dx; if(x4>=0-1e-6 && x4<=rw+1e-6) pts.push({x:x4,y:rh,t:t4}); }
  if(pts.length<2) return null; pts.sort((a,b)=>a.t-b.t); const unique=[]; for(const p of pts){ if(!unique.some(u=>Math.hypot(u.x-p.x,u.y-p.y)<0.5)) unique.push(p); if(unique.length==2) break; } if(unique.length<2) return null; return {x1:unique[0].x,y1:unique[0].y,x2:unique[1].x,y2:unique[1].y};
}
function hexToRgba(hex,a){ const r=parseInt(hex.slice(1,3),16); const g=parseInt(hex.slice(3,5),16); const b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; }


exportBtn.addEventListener('click', ()=>{
  // EXPORT_LAYER_PATCH
  saveSnapshot();
  const layerSel = document.getElementById('exportLayers');
  const mode = layerSel ? layerSel.value : 'both';
  const prevGrid = state.showGrid;
  const prevPersp = state.showPerspective;
  if(mode==='grid'){ state.showPerspective = false; state.showGrid = true; }
  if(mode==='perspective'){ state.showGrid = false; state.showPerspective = true; }
  if(mode==='both'){ state.showGrid = true; state.showPerspective = true; }

  const fmt = formatSelect.value;
  const canvasCSSW = parseInt(getComputedStyle(drawCanvas).width);
  const canvasCSSH = parseInt(getComputedStyle(drawCanvas).height);
  const innerRect = boardInner.getBoundingClientRect();
  const canvasLeft = Math.round((innerRect.width - canvasCSSW)/2);
  const canvasTop = Math.round((innerRect.height - canvasCSSH)/2);
  const outW = Math.round(state.paper[0] * (parseInt(dpiInput.value)||300) / 25.4);
  const outH = Math.round(state.paper[1] * (parseInt(dpiInput.value)||300) / 25.4);

  if(fmt === 'svg'){
    let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${outW}' height='${outH}' viewBox='0 0 ${state.rect.w} ${state.rect.h}'>`;
    svg += `<rect width='100%' height='100%' fill='${state.canvasColor}' />`;
    if(state.curveEnabled && state.vpCount===4 && state.points.length===4){
      const pts = state.points.slice();
      const top = pts.reduce((a,b)=> a.y<b.y? a:b);
      const bottom = pts.reduce((a,b)=> a.y>b.y? a:b);
      const left = pts.reduce((a,b)=> a.x<b.x? a:b);
      const right = pts.reduce((a,b)=> a.x>b.x? a:b);
      const vTop = {x: top.x - canvasLeft, y: top.y - canvasTop};
      const vBottom = {x: bottom.x - canvasLeft, y: bottom.y - canvasTop};
      const vLeft = {x: left.x - canvasLeft, y: left.y - canvasTop};
      const vRight = {x: right.x - canvasLeft, y: right.y - canvasTop};
      const n = Math.max(8, Math.floor(state.linesCount/2));
      for(let i=1;i<=n;i++){
        const t = i/(n+1);
        const y = t*state.rect.h;
        svg += `<path d="M 0 ${y} Q ${vTop.x} ${vTop.y} ${state.rect.w} ${y}" stroke="${state.color}" stroke-opacity="${state.opacity}" stroke-width="${state.stroke}" fill="none"/>`;
        svg += `<path d="M 0 ${y} Q ${vBottom.x} ${vBottom.y} ${state.rect.w} ${y}" stroke="${state.color}" stroke-opacity="${state.opacity}" stroke-width="${state.stroke}" fill="none"/>`;
      }
      const m = Math.max(8, Math.floor(state.linesCount/2));
      for(let j=1;j<=m;j++){
        const s=j/(m+1);
        const x = s*state.rect.w;
        svg += `<path d="M ${x} 0 Q ${vLeft.x} ${vLeft.y} ${x} ${state.rect.h}" stroke="${state.color}" stroke-opacity="${state.opacity}" stroke-width="${state.stroke}" fill="none"/>`;
        svg += `<path d="M ${x} 0 Q ${vRight.x} ${vRight.y} ${x} ${state.rect.h}" stroke="${state.color}" stroke-opacity="${state.opacity}" stroke-width="${state.stroke}" fill="none"/>`;
      }
    } else {
      const canvasCSSW = parseInt(getComputedStyle(drawCanvas).width);
      const canvasCSSH = parseInt(getComputedStyle(drawCanvas).height);
      const innerRect = boardInner.getBoundingClientRect();
      const canvasLeft = Math.round((innerRect.width - canvasCSSW)/2);
      const canvasTop = Math.round((innerRect.height - canvasCSSH)/2);
      const vps = state.points.map(p=>({x: p.x - canvasLeft, y: p.y - canvasTop}));
      const total = Math.max(4, state.linesCount);
      for(let i=0;i<total;i++){
        const angle = (i/total) * Math.PI * 2;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        vps.forEach(vp=>{
          const seg = lineRectSegment(vp.x, vp.y, dx, dy, 0,0, state.rect.w, state.rect.h);
          if(seg) svg += `<line x1="${seg.x1}" y1="${seg.y1}" x2="${seg.x2}" y2="${seg.y2}" stroke="${state.color}" stroke-opacity="${state.opacity}" stroke-width="${state.stroke}"/>`;
        });
      }
    }
    svg += `</svg>`;
    const blob = new Blob([svg], {type:'image/svg+xml'});
    try{ saveBlobForThankYou(blob, `perspective.svg`, ()=>{ try{ window.location.href = 'thankyou.html'; setTimeout(()=>{ state.showGrid=prevGrid; state.showPerspective=prevPersp; },0); }catch(e){} }); }catch(e){}
    return;
  }

  const off = document.createElement('canvas'); off.width = outW; off.height = outH;
  const ctx = off.getContext('2d');
  if(false) ctx.clearRect(0,0,outW,outH); else { ctx.fillStyle = state.canvasColor; ctx.fillRect(0,0,outW,outH); }
  const scaleX = outW / state.rect.w; const scaleY = outH / state.rect.h;
  ctx.lineWidth = state.stroke * ((scaleX+scaleY)/2);
  ctx.strokeStyle = hexToRgba(state.color, state.opacity);

  if(state.curveEnabled && state.vpCount===4 && state.points.length===4){
    const pts = state.points.slice();
    const top = pts.reduce((a,b)=> a.y<b.y? a:b);
    const bottom = pts.reduce((a,b)=> a.y>b.y? a:b);
    const left = pts.reduce((a,b)=> a.x<b.x? a:b);
    const right = pts.reduce((a,b)=> a.x>b.x? a:b);
    const vTop = {x: top.x - canvasLeft, y: top.y - canvasTop};
    const vBottom = {x: bottom.x - canvasLeft, y: bottom.y - canvasTop};
    const vLeft = {x: left.x - canvasLeft, y: left.y - canvasTop};
    const vRight = {x: right.x - canvasLeft, y: right.y - canvasTop};
    const n = Math.max(8, Math.floor(state.linesCount/2));
    for(let i=1;i<=n;i++){
      const t = i/(n+1);
      const y = t*off.height;
      ctx.beginPath(); ctx.moveTo(0,y);
      ctx.quadraticCurveTo(vTop.x*scaleX, vTop.y*scaleY, off.width, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,y);
      ctx.quadraticCurveTo(vBottom.x*scaleX, vBottom.y*scaleY, off.width, y); ctx.stroke();
    }
    const m = Math.max(8, Math.floor(state.linesCount/2));
    for(let j=1;j<=m;j++){
      const s=j/(m+1);
      const x = s*off.width;
      ctx.beginPath(); ctx.moveTo(x,0);
      ctx.quadraticCurveTo(vLeft.x*scaleX, vLeft.y*scaleY, x, off.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x,0);
      ctx.quadraticCurveTo(vRight.x*scaleX, vRight.y*scaleY, x, off.height); ctx.stroke();
    }
  } else {
    const canvasCSSW = parseInt(getComputedStyle(drawCanvas).width);
    const canvasCSSH = parseInt(getComputedStyle(drawCanvas).height);
    const innerRect = boardInner.getBoundingClientRect();
    const canvasLeft = Math.round((innerRect.width - canvasCSSW)/2);
    const canvasTop = Math.round((innerRect.height - canvasCSSH)/2);
    const vpsOut = state.points.map(p=>{ const nx=(p.x - canvasLeft)/state.rect.w; const ny=(p.y - canvasTop)/state.rect.h; return {x: nx*outW, y: ny*outH}; });
    const n = Math.max(4, state.linesCount);
    for(let i=0;i<n;i++){
      const angle=(i/n)*Math.PI*2;
      const dx=Math.cos(angle), dy=Math.sin(angle);
      vpsOut.forEach(vp=>{ const seg=lineRectSegment(vp.x,vp.y,dx,dy,0,0,outW,outH); if(seg){ ctx.beginPath(); ctx.moveTo(seg.x1,seg.y1); ctx.lineTo(seg.x2,seg.y2); ctx.stroke(); } });
    }
  }

  const mime = formatSelect.value === 'jpeg' ? 'image/jpeg' : (formatSelect.value === 'webp' ? 'image/webp' : 'image/png');
  off.toBlob(blob=>{ try{ saveBlobForThankYou(blob, `perspective.${ext}`, ()=>{ try{ window.location.href = 'thankyou.html'; setTimeout(()=>{ state.showGrid=prevGrid; state.showPerspective=prevPersp; },0); }catch(e){} }); }catch(e){}
    }, mime, 0.95);
});

board.scrollLeft = (board.scrollWidth - board.clientWidth)/2;
board.scrollTop = (board.scrollHeight - board.clientHeight)/2;



// ===== SAFE EXPORT FIX (override only export click) =====
if (exportBtn) {
  exportBtn.onclick = function () {
    const format = formatSelect ? formatSelect.value : 'png';
    const mime =
      format === 'jpeg' ? 'image/jpeg' :
      format === 'webp' ? 'image/webp' :
      'image/png';

    drawCanvas.toBlob(function (blob) {
      if (!blob) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          sessionStorage.setItem('perspective_export_data', reader.result);
          sessionStorage.setItem(
            'perspective_export_name',
            'perspective_guide.' + format
          );
          window.location.href = 'thankyou.html'; setTimeout(()=>{ state.showGrid=prevGrid; state.showPerspective=prevPersp; },0);
        } catch (e) {
          console.error(e);
        }
      };
      reader.readAsDataURL(blob);
    }, mime, 0.95);
  };
}
// ===== END EXPORT FIX =====


// ===== MULTI-COLOR VANISHING POINTS =====
const vpColors = ['#ff5c5c','#4da6ff','#6ddc91','#f7c948'];

function getVPColor(index){
  return vpColors[index % vpColors.length];
}

// override point creation styling safely
const _oldCreatePoint = createPoint;
createPoint = function(x,y){
  const idx = state.points.length;
  const p = _oldCreatePoint(x,y);
  if(p && p.el){
    p.el.style.background = getVPColor(idx);
    p.el.style.borderColor = getVPColor(idx);
  }
  return p;
};
// ===== END MULTI-COLOR VP =====



// ===== TRANSPARENT PNG + SVG EXPORT FIX =====
function exportTransparentPNG(){
  const off = document.createElement('canvas');
  off.width = drawCanvas.width;
  off.height = drawCanvas.height;
  const ctx = off.getContext('2d');

  // DO NOT fill background → true transparency
  ctx.clearRect(0,0,off.width,off.height);
  ctx.drawImage(drawCanvas,0,0);

  off.toBlob(blob=>{
    const r=new FileReader();
    r.onload=()=>{
      sessionStorage.setItem('perspective_export_data', r.result);
      sessionStorage.setItem('perspective_export_name', 'perspective_guide.png');
      window.location.href='thankyou.html';
    };
    r.readAsDataURL(blob);
  },'image/png');
}

// SVG export (true vector, transparent)
function exportSVG(){
  let svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${drawCanvas.width}" height="${drawCanvas.height}" viewBox="0 0 ${drawCanvas.width} ${drawCanvas.height}">
<g stroke="${state.color}" stroke-width="${state.stroke}" opacity="${state.opacity}" fill="none">
`;

  // draw perspective lines into SVG
  const cx = drawCanvas.width/2;
  const cy = drawCanvas.height/2;
  state.points.forEach(p=>{
    svg += `<circle cx="${p.x}" cy="${p.y}" r="4"/>`;
  });

  svg += `</g></svg>`;

  const blob = new Blob([svg],{type:'image/svg+xml'});
  const r=new FileReader();
  r.onload=()=>{
    sessionStorage.setItem('perspective_export_data', r.result);
    sessionStorage.setItem('perspective_export_name', 'perspective_guide.svg');
    window.location.href='thankyou.html';
  };
  r.readAsDataURL(blob);
}

// override export button safely
exportBtn.onclick = ()=>{
  if(formatSelect.value==='svg'){
    exportSVG();
  }else if(formatSelect.value==='png'){
    exportTransparentPNG();
  }
};
// ===== END TRANSPARENCY FIX =====

// --- SAFE SNAPSHOT HELPERS ---
function saveSnapshot(){
  try{
    sessionStorage.setItem('perspective_saved_state', JSON.stringify({
      state:{
        showGrid: state.showGrid,
        showPerspective: state.showPerspective
      },
      points: state.points.map(p=>({x:p.x,y:p.y}))
    }));
  }catch(e){}
}
function restoreSnapshot(){
  try{
    const raw = sessionStorage.getItem('perspective_saved_state');
    if(!raw) return;
    const obj = JSON.parse(raw);
    if(obj.state){
      if(typeof obj.state.showGrid==='boolean') state.showGrid = obj.state.showGrid;
      if(typeof obj.state.showPerspective==='boolean') state.showPerspective = obj.state.showPerspective;
    }
    if(Array.isArray(obj.points)){
      state.points.forEach(p=>{ if(p.el) p.el.remove(); });
      state.points=[];
      obj.points.forEach(pt=>addPoint(pt.x,pt.y));
    }
    render();
  }catch(e){}
}
window.addEventListener('load', restoreSnapshot);
// --- END SNAPSHOT ---
