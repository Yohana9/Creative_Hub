/* Hero particles - only where the container exists, much lighter, off on phones/low-end devices. */
(function(){
  var el=document.getElementById('particles-js');
  if(!el||typeof particlesJS!=='function') return;
  var lowEnd=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4||innerWidth<700;
  if(lowEnd||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  particlesJS('particles-js',{particles:{number:{value:36,density:{enable:true,value_area:1000}},color:{value:'#ffffff'},
    shape:{type:'circle'},opacity:{value:.5},size:{value:3,random:true},
    line_linked:{enable:true,distance:140,color:'#ffffff',opacity:.35,width:1},
    move:{enable:true,speed:1.6,direction:'none',random:false,straight:false,out_mode:'out'}},
    interactivity:{detect_on:'canvas',events:{onhover:{enable:false},onclick:{enable:false},resize:true}},retina_detect:false});
})();
