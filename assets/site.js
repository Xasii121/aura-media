(()=>{
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width:760px)').matches;
  const finish = () => { document.querySelector('.loader')?.classList.add('done'); document.body.classList.remove('is-loading'); };

  /* ---------- mobile nav toggle ---------- */
  const nav = document.getElementById('siteNav');
  const navToggle = document.getElementById('navToggle');
  navToggle?.addEventListener('click', ()=>{
    const isOpen = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });
  nav?.querySelectorAll('.navlinks a').forEach(a=>{
    a.addEventListener('click', ()=>{
      nav.classList.remove('is-open');
      navToggle?.setAttribute('aria-expanded','false');
      navToggle?.setAttribute('aria-label','Open menu');
    });
  });

  /* ---------- glass pointer-tracking sheen ---------- */
  document.querySelectorAll('.glass').forEach(el=>{
    el.addEventListener('pointermove',e=>{
      const r=el.getBoundingClientRect();
      const px=((e.clientX-r.left)/r.width)*100, py=((e.clientY-r.top)/r.height)*100;
      el.style.setProperty('--mx',px+'%'); el.style.setProperty('--my',py+'%');
    },{passive:true});
  });

  /* ---------- subtle 3D tilt, project + case-study media cards ---------- */
  if(!mobile){
    document.querySelectorAll('.project, .tilt-card').forEach(el=>{
      el.addEventListener('pointermove',e=>{
        const r=el.getBoundingClientRect();
        const px=(e.clientX-r.left)/r.width, py=(e.clientY-r.top)/r.height;
        const rx=((py-.5)/.5)*-5, ry=((px-.5)/.5)*5;
        el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      },{passive:true});
      el.addEventListener('pointerleave',()=>{ el.style.transform=''; });
    });
  }

  /* ---------- bloom frame sequence (only runs on pages with the canvas) ---------- */
  const TOTAL_FRAMES = 83;
  const frames = [];
  const canvas = document.getElementById('bloomCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let lastDrawnIdx = 0;
  function frameSrc(i){ return `assets/bloom/f_${String(i+1).padStart(3,'0')}.webp`; }

  function sizeCanvas(){
    if(!canvas) return;
    const wrap = canvas.parentElement;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if(canvas.width !== w || canvas.height !== h){
      canvas.width = w; canvas.height = h;
    }
  }

  function drawFrame(idx){
    if(!ctx) return;
    idx = Math.max(0, Math.min(TOTAL_FRAMES-1, idx));
    let img = frames[idx];
    if(!img || !img.complete || !img.naturalWidth){
      let found = null;
      for(let d=1; d<TOTAL_FRAMES; d++){
        const back = frames[idx-d], fwd = frames[idx+d];
        if(back && back.complete && back.naturalWidth){ found = back; break; }
        if(fwd && fwd.complete && fwd.naturalWidth){ found = fwd; break; }
      }
      img = found;
    }
    if(!img) return;
    lastDrawnIdx = idx;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const scale = Math.min(canvas.width/img.naturalWidth, canvas.height/img.naturalHeight);
    const w = img.naturalWidth*scale, h = img.naturalHeight*scale;
    ctx.drawImage(img, (canvas.width-w)/2, (canvas.height-h)/2, w, h);
  }

  if(canvas){
    for(let i=0;i<TOTAL_FRAMES;i++){
      const img = new Image();
      img.decoding='async';
      img.onload = ()=>{ if(i===0){ sizeCanvas(); drawFrame(0); } };
      img.src = frameSrc(i);
      frames.push(img);
    }
    let resizeTimer;
    window.addEventListener('resize', ()=>{
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(()=>{ sizeCanvas(); drawFrame(lastDrawnIdx); }, 150);
    });
  }

  gsap.registerPlugin(ScrollTrigger);

  let lenis;
  if(!reduced){
    lenis = new Lenis({ duration:1.05, easing:t=>1-Math.pow(1-t,3), smoothWheel:true, wheelMultiplier:1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t=>lenis.raf(t*1000));
    gsap.ticker.lagSmoothing(0);
  }

  window.addEventListener('load', ()=>{
    if(reduced){ finish(); if(canvas) drawFrame(TOTAL_FRAMES-1); return; }
    setTimeout(()=>{
      finish();

      /* hero entrance — only on pages that have a split-line h1 */
      if(document.querySelector('h1 .line>span')){
        const tl = gsap.timeline({delay:.15});
        tl.to('h1 .line>span',{y:'0%',duration:1.1,stagger:.09,ease:'expo.out'})
          .to('.hero-copy,.hero-actions',{opacity:1,y:0,duration:.9,stagger:.08,ease:'expo.out'},'-=.7')
          .to('.eyebrow',{opacity:1,y:0,duration:.7,ease:'expo.out'},'-=1.05');
      }

      /* generic reveal-on-scroll */
      document.querySelectorAll('.js-reveal').forEach(el=>{
        gsap.to(el,{opacity:1,y:0,duration:1,ease:'power3.out',
          scrollTrigger:{trigger:el,start:'top 88%',once:true}});
      });

      /* ---------- SPIRAL / bloom pin — only on pages that have it ---------- */
      if(document.querySelector('.spiral-pin')){
        const introEl = document.querySelector('.spiral-intro');
        const bloomCopyEl = document.querySelector('.bloom-copy');
        const bloomSideEl = document.querySelector('.bloom-side');
        const canvasWrap = document.getElementById('bloomCanvasWrap');
        const bar = document.getElementById('bloomProgressBar');
        const ease = t => 1 - Math.pow(1-t, 3);
        const clamp01 = v => Math.max(0, Math.min(1, v));
        const PHASE_A_FRAC = 0.36;

        if(!mobile){
          const tileCfg = Array.from(document.querySelectorAll('.spiral-tile')).map((el,i)=>({
            el,
            finalAngle: -100 + i*100,
            startOffset: -300 - i*50,
            extraRadius: 240 + i*26
          }));

          ScrollTrigger.create({
            trigger:'.spiral-pin', start:'top top', end:'bottom bottom', scrub:.4,
            onUpdate(self){
              const progress = self.progress;
              const phaseA = clamp01(progress/PHASE_A_FRAC);
              const phaseB = clamp01((progress-PHASE_A_FRAC)/(1-PHASE_A_FRAC));
              const easedA = ease(phaseA);
              const baseRadius = Math.max(220, Math.min(420, Math.min(window.innerWidth, window.innerHeight)*0.32));

              tileCfg.forEach(cfg=>{
                const angle = cfg.finalAngle + (1-easedA)*cfg.startOffset;
                const radius = baseRadius + (1-easedA)*cfg.extraRadius;
                const rad = angle*Math.PI/180;
                const x = Math.cos(rad)*radius;
                const y = Math.sin(rad)*radius*0.52;
                const scaleA = .55 + .45*easedA;
                const opA = .12 + .88*easedA;
                const scale = scaleA * (1 - phaseB*0.35);
                const op = opA * (1 - phaseB);
                const liftY = y - phaseB*46;
                cfg.el.style.setProperty('--tx', x.toFixed(1)+'px');
                cfg.el.style.setProperty('--ty', liftY.toFixed(1)+'px');
                cfg.el.style.setProperty('--rot', (angle*0.12).toFixed(1)+'deg');
                cfg.el.style.setProperty('--sc', scale.toFixed(3));
                cfg.el.style.setProperty('--op', op.toFixed(3));
              });

              if(introEl) introEl.style.opacity = String(clamp01(easedA*1.4) * (1 - clamp01(phaseB*3)));
              if(bloomCopyEl) bloomCopyEl.style.opacity = String(clamp01(phaseB*2));
              if(bloomSideEl) bloomSideEl.style.opacity = String(clamp01(phaseB*2));

              if(canvasWrap){
                const rotY = (-.5+easedA*.5 + (phaseB-.5)*.12) * 12;
                const scaleW = .82 + easedA*.12 + phaseB*.14;
                canvasWrap.style.transform = `translateZ(-60px) scale(${scaleW.toFixed(3)}) rotateY(${rotY.toFixed(2)}deg)`;
              }

              const idx = phaseB<=0 ? 0 : Math.round(phaseB*(TOTAL_FRAMES-1));
              drawFrame(idx);
              if(bar) bar.style.width = (phaseB*100)+'%';
            }
          });
        } else {
          if(introEl) introEl.style.opacity = 1;
          ScrollTrigger.create({
            trigger:'#bloomCanvasWrap', start:'top 85%', end:'bottom 25%', scrub:.3,
            onUpdate(self){
              drawFrame(Math.round(self.progress*(TOTAL_FRAMES-1)));
              if(bar) bar.style.width = (self.progress*100)+'%';
            }
          });
        }
      }

      /* ---------- statement word-parallax — only where present ---------- */
      if(document.querySelector('.statement')){
        gsap.to('.statement-word:first-child',{x:-55,ease:'none',scrollTrigger:{trigger:'.statement',start:'top bottom',end:'bottom top',scrub:1}});
        gsap.to('.statement-word:last-child',{x:55,ease:'none',scrollTrigger:{trigger:'.statement',start:'top bottom',end:'bottom top',scrub:1}});
        gsap.fromTo('.statement-text',{scale:.94,opacity:.35},{scale:1,opacity:1,ease:'none',scrollTrigger:{trigger:'.statement-text',start:'top 90%',end:'top 40%',scrub:1}});
      }

      /* ---------- top progress bar + nav shrink — every page ---------- */
      ScrollTrigger.create({start:0,end:'max',onUpdate:self=>{
        const p = document.querySelector('.progress'); if(p) p.style.transform=`scaleX(${self.progress})`;
        const n = document.querySelector('.nav'); if(n) n.classList.toggle('scrolled',self.scroll()>50);
      }});

      /* ---------- in-page anchor smooth scroll ---------- */
      document.querySelectorAll('a[href^="#"]').forEach(link=>{
        link.addEventListener('click',e=>{
          const target=document.querySelector(link.getAttribute('href')); if(!target)return;
          e.preventDefault(); if(lenis) lenis.scrollTo(target,{offset:-30,duration:1.25}); else target.scrollIntoView({behavior:'smooth'});
        });
      });

      setTimeout(()=>ScrollTrigger.refresh(),300);
    },250);
  });

  setTimeout(()=>{if(document.body.classList.contains('is-loading')) finish()},2600);

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-question').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const item = btn.closest('.faq-item');
      const wasActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item.active').forEach(i=>i.classList.remove('active'));
      if(!wasActive) item.classList.add('active');
    });
  });

  /* ---------- email reveal ---------- */
  const revealBtn = document.getElementById('reveal-email');
  const revealWrap = document.getElementById('email-reveal');
  revealBtn?.addEventListener('click',()=>{
    revealWrap.classList.add('is-revealed');
    revealBtn.textContent='Email revealed';
    revealBtn.disabled=true;
    revealBtn.setAttribute('aria-expanded','true');
  });
})();
