// Core script for Perspective Guide final
const board = document.getElementById('board');
const boardInner = document.getElementById('boardInner');
const drawCanvas = document.getElementById('drawCanvas');
const overlay = document.getElementById('overlay');

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
  const x = ev.clientX - b.left; const y = ev.clientY - b.top;
  const hit = findPointAt(x,y);
  if(hit){ dragging = hit; hit.el.setPointerCapture(ev.pointerId); return; }
  if(state.points.length < state.vpCount){ addPoint(x,y); } else { const near = nearestPointTo(x,y); if(near) movePointTo(near,x,y); }
  render();
});
boardInner.addEventListener('pointermove',(ev)=>{ if(!dragging) return; const b = boardInner.getBoundingClientRect(); movePointTo(dragging, ev.clientX - b.left, ev.clientY - b.top); render(); });
boardInner.addEventListener('pointerup',(ev)=>{ if(dragging){ try{ dragging.el.releasePointerCapture(ev.pointerId);}catch(e){} dragging=null; }});
boardInner.addEventListener('contextmenu',(ev)=>{ ev.preventDefault(); const b = boardInner.getBoundingClientRect(); const hit = findPointAt(ev.clientX - b.left, ev.clientY - b.top); if(hit) removePoint(hit); render(); });

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
  ctx.save(); ctx.setLineDash([8,6]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(15,63,80,0.12)'; ctx.strokeRect(1.5,1.5,drawCanvas.width-3,drawCanvas.height-3); ctx.restore();

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
    const canvas