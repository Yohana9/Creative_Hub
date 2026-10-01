/* Twinkling star field - single canvas (was 420 animated DOM nodes, which froze toggles on slower devices). */
(function(){
  var box=document.getElementById('stars-container'); if(!box) return;
  var cv=document.createElement('canvas'); cv.setAttribute('aria-hidden','true');
  cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block'; box.appendChild(cv);
  var cx=cv.getContext('2d'), W=0, H=0, stars=[], still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size(){ W=cv.width=innerWidth; H=cv.height=innerHeight;
    var n=W<700?55:110; stars=[]; for(var i=0;i<n;i++) stars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.1+.5,p:Math.random()*6.28,s:.6+Math.random()*1.2}); }
  function draw(t){ cx.clearRect(0,0,W,H); cx.fillStyle=document.body.classList.contains('light-theme')?'#6a63a8':'#fff';
    for(var i=0;i<stars.length;i++){ var s=stars[i]; cx.globalAlpha=still?.6:.15+.75*(.5+.5*Math.sin(t/1000*s.s+s.p)); cx.fillRect(s.x,s.y,s.r*1.6,s.r*1.6); } }
  var last=0; function loop(t){ if(t-last>42){ last=t; draw(t); } if(!document.hidden) requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange',function(){ if(!document.hidden&&!still) requestAnimationFrame(loop); });
  var rt; addEventListener('resize',function(){ clearTimeout(rt); rt=setTimeout(function(){ size(); draw(performance.now()); },200); });
  size(); draw(0); if(!still) requestAnimationFrame(loop);
})();
