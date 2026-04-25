import{c as e,r as t,t as n}from"./jsx-runtime-CmkdlxPh.js";import{Y as r,r as i}from"./index-BwPU30_a.js";import{t as a}from"./proxy-B-tLEZs5.js";import{t as o}from"./use-scroll-CGJh8aJ1.js";import{t as s}from"./use-transform-BwjzMnBo.js";var c=e(t(),1);function l(e,t,n){(0,c.useInsertionEffect)(()=>e.on(t,n),[e,t,n])}var u=n();function d({children:e,delay:t=0,skew:n=!0}){return(0,u.jsx)(`span`,{style:{display:`block`,overflow:`hidden`},children:(0,u.jsx)(a.span,{style:{display:`block`},initial:{y:`115%`,skewY:n?3:0},whileInView:{y:0,skewY:0},viewport:{once:!0},transition:{duration:.85,delay:t,ease:[.16,1,.3,1]},children:e})})}function f({src:e,alt:t,style:n}){let r=(0,c.useRef)(null),{scrollYProgress:i}=o({target:r,offset:[`start end`,`end start`]}),l=s(i,[0,1],[`-15%`,`15%`]),d=s(i,[0,.5,1],[1.2,1.06,1.2]);return(0,u.jsx)(`div`,{ref:r,style:{overflow:`hidden`,...n},children:(0,u.jsx)(a.img,{src:e,alt:t,style:{width:`100%`,height:`100%`,objectFit:`cover`,y:l,scale:d}})})}function p({sectionRef:e}){let t=(0,c.useMemo)(()=>Array.from({length:192},(e,t)=>`/videos/pen-frames/frame-${String(t+1).padStart(3,`0`)}.webp`),[]),[n,r]=(0,c.useState)(0),i=(0,c.useRef)(0),a=(0,c.useRef)(0),s=(0,c.useRef)(null),d=(0,c.useRef)(null),{scrollYProgress:f}=o({target:e,offset:[`start end`,`end start`]});return(0,c.useEffect)(()=>{let e=e=>{let t=new Image;t.decoding=`async`,t.src=e};t.slice(0,24).forEach(e);let n=()=>{t.slice(24).forEach(e)};if(`requestIdleCallback`in window){let e=window.requestIdleCallback(n);return()=>window.cancelIdleCallback(e)}let r=globalThis.setTimeout(n,0);return()=>globalThis.clearTimeout(r)},[t]),(0,c.useEffect)(()=>{let e=n=>{let o=d.current??n,c=Math.min(.05,Math.max(.001,(n-o)/1e3));d.current=n;let l=i.current-a.current;if(Math.abs(l)>.001)if(Math.abs(l)>20)a.current=i.current;else{let e=1-Math.exp(-9*c),t=Math.max(-2,Math.min(2,l*e));a.current+=t}let u=Math.max(0,Math.min(t.length-1,Math.round(a.current)));r(e=>e===u?e:u),s.current=requestAnimationFrame(e)};return d.current=null,s.current=requestAnimationFrame(e),()=>{s.current!==null&&cancelAnimationFrame(s.current),d.current=null}},[]),l(f,`change`,e=>{let n=Math.max(0,Math.min(1,e))**1.65*(t.length-1);i.current=n,Math.abs(n-a.current)>20*2.5&&(a.current=n,r(Math.max(0,Math.min(t.length-1,Math.round(n)))))}),(0,u.jsx)(`img`,{src:t[n],alt:``,"aria-hidden":`true`,draggable:!1,style:{position:`absolute`,inset:0,width:`100%`,height:`100%`,objectFit:`cover`,pointerEvents:`none`,transform:`translateZ(0)`,willChange:`transform, contents`}})}function m(){let{t:e}=i(),[,t]=r(),n=(0,c.useRef)(null),l=(0,c.useRef)(null),m=(0,c.useRef)(null),h=(0,c.useRef)(null),g=(0,c.useRef)(null),{scrollYProgress:_}=o({target:n,offset:[`start start`,`end start`]});s(_,[0,1],[`0%`,`-24%`]),s(_,[0,1],[`0%`,`24%`]);let{scrollYProgress:v}=o({target:l,offset:[`start end`,`end start`]}),y=s(v,[0,.28],[`#ffffff`,`#09090b`]),b=s(v,[0,.28],[`#09090b`,`#ffffff`]),x=s(v,[0,.28],[`rgba(0,0,0,0.45)`,`rgba(255,255,255,0.38)`]),S=s(v,[0,.28],[`rgba(0,0,0,0.08)`,`rgba(255,255,255,0.08)`]),{scrollYProgress:C}=o({target:m,offset:[`start end`,`end start`]}),w=s(C,[0,1],[`60px`,`-60px`]),T=s(C,[0,1],[`-44px`,`44px`]),{scrollYProgress:E}=o({target:h,offset:[`start end`,`end start`]});s(E,[0,1],[`0%`,`-20%`]);let D=e(`manifesto.stats`,{returnObjects:!0}),O=e(`manifesto.ticker`,{returnObjects:!0}),k=e(`manifesto.cards`,{returnObjects:!0}),A=e(`manifesto.proof`,{returnObjects:!0}),j=e(`manifesto.checklist`,{returnObjects:!0}),M=e(`manifesto.sideA.items`,{returnObjects:!0}),N=e(`manifesto.sideB.items`,{returnObjects:!0}),P=e(`manifesto.ticker2`,{returnObjects:!0}),F=e(`manifesto.whyCards`,{returnObjects:!0}),I=e(`manifesto.field.freeItems`,{returnObjects:!0}),L=e(`manifesto.field.freeItemsDesktop`,{returnObjects:!0}),R=e(`manifesto.featureStrip.brandTags`,{returnObjects:!0}),z=e(`manifesto.featureStrip.historyItems`,{returnObjects:!0}),B=e(`manifesto.featureStrip.plans`,{returnObjects:!0});return(0,u.jsxs)(`div`,{style:{fontFamily:`'DM Sans','Inter',sans-serif`,userSelect:`none`},children:[(0,u.jsx)(`style`,{children:`
        /* Base responsive styles */
        * {
          box-sizing: border-box;
        }
        
        .man-header { padding: 80px 64px 0; }
        .man-header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid rgba(0,0,0,0.07); padding-bottom: 48px; }
        .man-header-left { padding-right: 56px; border-right: 1px solid rgba(0,0,0,0.07); }
        .man-header-right { padding-left: 56px; display: flex; flex-direction: column; justify-content: space-between; }
        .man-stats-row { display: flex; align-items: center; justify-content: space-between; margin-top: 32px; }
        .man-stats { display: flex; gap: 28px; }
        .man-cards-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .man-bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: stretch; }
        .man-checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 32px; }
        .man-impact-grid { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr) minmax(0, 0.9fr); gap: 14px; align-items: stretch; width: 100%; }
        .man-impact-copy { display: flex; flex-direction: column; justify-content: space-between; gap: 28px; }
        .man-proof-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 26px; }
        .man-proof-card { padding: 16px 14px; border-radius: 16px; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.06); min-height: 132px; display: flex; flex-direction: column; justify-content: space-between; }
        .man-side-stack { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .man-side-card { border-radius: 18px; padding: 22px 20px; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; }
        .man-side-list { display: grid; gap: 10px; margin-top: 18px; }
        .man-side-list > div { padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.12); }
        .man-side-list.dark > div { border-top-color: rgba(0,0,0,0.08); }
        .man-mosaic { display: grid; grid-template-columns: 1.2fr 0.8fr; grid-template-rows: 1fr 1fr; gap: 10px; height: 460px; }
        .man-dark-grid { display: grid; grid-template-columns: 0.9fr 1.35fr 0.75fr; grid-template-rows: 380px 190px; gap: 12px; padding-top: 20px; }
        .man-feat-cards { display: flex; gap: 12px; padding-left: 64px; padding-right: 64px; }
        .man-cta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        /* Responsive styles */
        @media (max-width: 1024px) {
          .man-impact-grid { grid-template-columns: 1fr 1fr !important; }
          .man-impact-grid > div:last-child { grid-column: 1 / -1; }
          .man-proof-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .man-side-stack { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .man-header { padding: 60px 48px 0; }
          .man-header-left { padding-right: 40px; }
          .man-header-right { padding-left: 40px; }
          .man-cards-grid { gap: 8px; }
          .man-trans { padding: 80px 48px !important; }
          .man-dark-grid { gap: 10px; }
        }

        @media (max-width: 900px) {
          .man-header { padding: 48px 32px 0; }
          .man-header-left { padding-right: 32px; }
          .man-header-right { padding-left: 32px; }
          .man-stats { gap: 20px; }
          .man-cards-grid { gap: 8px; }
        }

        @media (max-width: 768px) {
          .man-impact-grid { grid-template-columns: 1fr !important; }
          .man-proof-grid, .man-side-stack { grid-template-columns: 1fr !important; }
          .man-header { padding: 40px 24px 0 !important; }
          .man-header-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .man-header-left { 
            padding-right: 0 !important; 
            border-right: none !important; 
            border-bottom: 1px solid rgba(0,0,0,0.07); 
            padding-bottom: 24px;
          }
          .man-header-right { 
            padding-left: 0 !important; 
            padding-top: 24px;
          }
          .man-stats-row { 
            flex-direction: column !important; 
            align-items: flex-start !important; 
            gap: 24px;
          }
          .man-stats { 
            flex-wrap: wrap; 
            gap: 24px !important;
            width: 100%;
          }
          .man-cta-btn-top { 
            width: 100% !important;
            white-space: normal !important;
          }
          .man-cards-grid { 
            grid-template-columns: repeat(2, 1fr) !important; 
            padding: 24px 24px 0 !important;
            gap: 12px !important;
          }
          .man-cards-grid > * { 
            aspect-ratio: unset !important; 
            min-height: 180px !important; 
            padding: 20px 16px !important;
          }
          .man-cards-grid p { font-size: 12px !important; }
          .man-cards-grid p:last-child { font-size: 11px !important; display: block !important; }
          
          .man-bottom-grid { 
            grid-template-columns: 1fr !important; 
            padding: 40px 24px 48px !important;
            gap: 24px !important;
          }
          
          .man-mosaic { 
            height: auto !important; 
            grid-template-columns: 1fr 1fr !important;
            min-height: 280px;
          }
          
          .man-ticker2 { padding: 18px 0 !important; }
          
          .man-trans { padding: 64px 24px !important; }
          .man-trans-cards { 
            grid-template-columns: 1fr !important; 
            gap: 16px !important; 
            margin-top: 40px !important;
          }
          .man-trans-card { 
            border-radius: 16px !important;
            border: 1px solid rgba(0,0,0,0.08) !important;
          }
          
          .man-dark-section { padding: 0 0 80px !important; }
          .man-dark-grid { display: none !important; }
          .man-dark-mobile { display: flex !important; }
          
          .man-feat-header { padding: 0 24px 36px !important; }
          .man-feat-mobile { display: flex !important; }
          .man-feat-desktop { display: none !important; }
          .man-feat-cards { 
            padding-left: 24px !important; 
            padding-right: 24px !important;
            overflow: visible !important;
            flex-wrap: wrap !important;
          }
          .man-feat-card { min-width: 0 !important; width: 100% !important; }
          
          .man-cta-section { padding: 80px 24px !important; }
          .man-cta-btns { flex-direction: column !important; gap: 16px !important; }
          .man-cta-btns button { width: 100% !important; }
        }

        @media (max-width: 640px) {
          .man-header { padding: 32px 20px 0 !important; }
          .man-cards-grid { 
            grid-template-columns: 1fr !important;
            padding: 20px 20px 0 !important;
          }
          .man-cards-grid > * { 
            min-height: auto !important;
            aspect-ratio: auto !important;
          }
          .man-stats { gap: 20px !important; }
          .man-stats div { text-align: center; flex: 1; }
          
          .man-mosaic { 
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          
          .man-trans { padding: 48px 20px !important; }
          .man-trans-cards { margin-top: 32px !important; }
          .man-trans-card { padding: 28px 24px !important; }
          
          .man-dark-mobile { padding: 40px 16px 48px !important; }
          
          .man-cta-section { padding: 64px 20px !important; }
        }

        @media (max-width: 480px) {
          .man-header { padding: 24px 16px 0 !important; }
          .man-header-left h2 { font-size: clamp(24px, 8vw, 32px) !important; }
          .man-stats { 
            flex-direction: column !important;
            gap: 16px !important;
            align-items: center !important;
          }
          .man-stats div { text-align: center; }
          .man-proof-card { min-height: auto !important; padding: 14px 13px !important; }
          .man-side-card { padding: 18px 16px !important; }
          
          .man-cards-grid { gap: 10px !important; }
          .man-cards-grid > * { padding: 18px 14px !important; }
          
          .man-bottom-grid { padding: 32px 16px 40px !important; }
          
          .man-trans { padding: 40px 16px !important; }
          .man-trans-card { padding: 24px 20px !important; }
          
          .man-dark-mobile { padding: 32px 12px 40px !important; }
          
          .man-cta-section { padding: 48px 16px !important; }
          .man-cta-section h2 { font-size: clamp(32px, 10vw, 40px) !important; }
        }

        /* Ensure images are responsive */
        img {
          max-width: 100%;
          height: auto;
          object-fit: cover;
        }

        /* Smooth transitions */
        .man-cards-grid > *,
        .man-trans-card,
        .man-cta-btns button {
          transition: all 0.3s ease;
        }

        /* Touch-friendly hover states for mobile */
        @media (hover: hover) {
          .man-cards-grid > *:hover {
            transform: translateY(-4px);
          }
          .man-trans-card:hover {
            transform: translateY(-4px);
          }
        }

        /* Fix for marquee on mobile */
        @media (max-width: 768px) {
          .ticker1-track {
            animation-duration: 20s !important;
          }
          .ticker3-track {
            animation-duration: 24s !important;
          }
          
          [style*="skewY"] {
            transform: skewY(-0.8deg) !important;
          }
        }

        /* Improve touch targets on mobile */
        @media (max-width: 768px) {
          button, 
          .man-cta-btns button,
          .man-cta-btn-top {
            min-height: 44px;
            padding: 12px 20px !important;
          }
          
          .man-checklist > div {
            padding: 10px 12px !important;
          }
        }

        /* Fix grid layouts on tablet */
        @media (min-width: 769px) and (max-width: 1024px) {
          .man-dark-grid {
            grid-template-columns: 0.8fr 1.2fr 0.7fr;
            gap: 10px;
          }
          
          .man-dark-grid > * {
            min-height: auto;
          }
        }

        /* Improve readability on larger screens */
        @media (min-width: 1400px) {
          .man-header,
          .man-cards-grid,
          .man-bottom-grid,
          .man-dark-grid,
          .man-cta-section {
            max-width: 1400px;
            margin-left: auto;
            margin-right: auto;
          }
          
          .man-header {
            padding: 80px auto 0;
          }
        }
      `}),(0,u.jsxs)(`section`,{ref:n,style:{background:`#fff`,color:`#09090b`,overflow:`hidden`},children:[(0,u.jsx)(`div`,{className:`man-header`,children:(0,u.jsxs)(`div`,{className:`man-header-grid`,children:[(0,u.jsxs)(`div`,{className:`man-header-left`,children:[(0,u.jsxs)(a.p,{initial:{opacity:0},whileInView:{opacity:1},viewport:{once:!0},style:{fontSize:10,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.26em`,color:`#ff6600`,marginBottom:20},children:[`◈ `,e(`manifesto.headerEyebrow`)]}),(0,u.jsxs)(`h2`,{style:{fontSize:`clamp(28px, 5vw, 64px)`,fontWeight:900,letterSpacing:`-0.045em`,lineHeight:.92,margin:0},children:[(0,u.jsx)(d,{delay:0,children:e(`manifesto.headlineLine1`)}),(0,u.jsx)(d,{delay:.08,children:e(`manifesto.headlineLine2`)}),(0,u.jsxs)(d,{delay:.16,children:[e(`manifesto.headlineLine3Start`),` `,(0,u.jsx)(`span`,{style:{color:`#ff6600`,fontStyle:`italic`},children:e(`manifesto.headlineLine3Em`)})]})]})]}),(0,u.jsxs)(`div`,{className:`man-header-right`,children:[(0,u.jsx)(a.p,{initial:{opacity:0,y:14},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:.25},style:{fontSize:`clamp(13px, 1.5vw, 16px)`,lineHeight:1.72,color:`rgba(0,0,0,0.48)`,fontWeight:300},children:e(`manifesto.intro`)}),(0,u.jsxs)(`div`,{className:`man-stats-row`,children:[(0,u.jsx)(`div`,{className:`man-stats`,children:D.map((e,t)=>(0,u.jsxs)(a.div,{initial:{opacity:0,y:10},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:.3+t*.08},children:[(0,u.jsx)(`p`,{style:{fontSize:`clamp(18px, 2vw, 22px)`,fontWeight:900,letterSpacing:`-0.04em`,lineHeight:1,color:`#09090b`},children:e.n}),(0,u.jsx)(`p`,{style:{fontSize:10,color:`rgba(0,0,0,0.35)`,marginTop:3,textTransform:`uppercase`,letterSpacing:`0.1em`},children:e.label})]},t))}),(0,u.jsx)(a.button,{className:`man-cta-btn-top`,onClick:()=>t(`/register`),initial:{opacity:0},whileInView:{opacity:1},viewport:{once:!0},transition:{delay:.45},whileHover:{scale:1.04,background:`#e55a00`},whileTap:{scale:.97},style:{padding:`12px 24px`,borderRadius:999,background:`#ff6600`,border:`none`,color:`#fff`,fontSize:13,fontWeight:700,cursor:`pointer`,whiteSpace:`nowrap`,transition:`background 0.2s`},children:e(`common.createFreeAccountArrow`)})]})]})]})}),(0,u.jsx)(`style`,{children:`
          @keyframes marquee-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ticker1-track {
            animation: marquee-left 24s linear infinite;
            display: flex;
            width: max-content;
            align-items: center;
          }
          .ticker1-track:hover { animation-play-state: paused; }
          
          @media (max-width: 768px) {
            .ticker1-track {
              animation-duration: 20s;
            }
          }
        `}),(0,u.jsxs)(`div`,{style:{position:`relative`,overflow:`hidden`,background:`#ff6600`,marginTop:40,transform:`skewY(-1.4deg)`,transformOrigin:`left`,padding:`18px 0`},children:[(0,u.jsx)(`div`,{style:{position:`absolute`,top:`50%`,left:0,right:0,height:1,background:`rgba(255,255,255,0.15)`,transform:`translateY(-50%)`}}),(0,u.jsx)(`div`,{className:`ticker1-track`,children:[...[,,]].map((e,t)=>(0,u.jsx)(`span`,{style:{display:`inline-flex`,alignItems:`center`},children:O.map((e,t)=>(0,u.jsxs)(`span`,{style:{display:`inline-flex`,alignItems:`center`},children:[(0,u.jsx)(`span`,{style:{fontSize:`clamp(28px, 4vw, 52px)`,fontWeight:900,letterSpacing:`-0.04em`,lineHeight:1,padding:`0 8px`,fontStyle:e===`Fechou!`||e===`R$ 0`?`italic`:`normal`,color:t%2==1?`transparent`:`#fff`,WebkitTextStroke:t%2==1?`1.5px rgba(255,255,255,0.6)`:`0`,textTransform:`capitalize`,flexShrink:0},children:e},t),(0,u.jsx)(`span`,{style:{fontSize:16,color:`rgba(255,255,255,0.3)`,padding:`0 20px`,flexShrink:0},children:`✦`})]},`${e}-${t}`))},t))})]}),(0,u.jsx)(`div`,{style:{padding:`48px 64px 0`},children:(0,u.jsx)(`div`,{className:`man-cards-grid`,children:k.map((e,t)=>{let n=[{icon:`⌨`,accent:!1},{icon:`◉`,accent:!0},{icon:`◎`,accent:!1},{icon:`◆`,accent:!1}][t]??{icon:`•`,accent:!1},r={...e,...n};return(0,u.jsxs)(a.div,{initial:{opacity:0,y:24},whileInView:{opacity:1,y:0},viewport:{once:!0,margin:`-30px`},transition:{duration:.65,delay:t*.09,ease:[.16,1,.3,1]},whileHover:{y:-4},style:{aspectRatio:`1 / 1`,padding:`22px 18px`,borderRadius:18,background:r.accent?`#09090b`:`rgba(0,0,0,0.03)`,border:`1.5px solid ${r.accent?`transparent`:`rgba(0,0,0,0.07)`}`,transition:`all 0.22s`,cursor:`default`,position:`relative`,overflow:`hidden`,display:`flex`,flexDirection:`column`,justifyContent:`space-between`},children:[r.accent&&(0,u.jsx)(`div`,{style:{position:`absolute`,top:-40,right:-40,width:100,height:100,borderRadius:`50%`,background:`rgba(255,102,0,0.12)`}}),(0,u.jsx)(`div`,{style:{width:36,height:36,borderRadius:10,background:r.accent?`rgba(255,102,0,0.15)`:`rgba(0,0,0,0.05)`,border:`1px solid ${r.accent?`rgba(255,102,0,0.3)`:`rgba(0,0,0,0.08)`}`,display:`flex`,alignItems:`center`,justifyContent:`center`,fontSize:15,color:`#ff6600`},children:r.icon}),(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{style:{fontSize:13,fontWeight:700,marginBottom:5,letterSpacing:`-0.02em`,color:r.accent?`#fff`:`#09090b`},children:r.title}),(0,u.jsx)(`p`,{style:{fontSize:11,lineHeight:1.6,fontWeight:300,color:r.accent?`rgba(255,255,255,0.45)`:`rgba(0,0,0,0.45)`},children:r.body})]})]},t)})})}),(0,u.jsx)(`div`,{style:{padding:`56px 64px 72px`},children:(0,u.jsxs)(`div`,{className:`man-impact-grid`,children:[(0,u.jsxs)(`div`,{className:`man-impact-copy`,children:[(0,u.jsxs)(`div`,{children:[(0,u.jsxs)(a.p,{initial:{opacity:0},whileInView:{opacity:1},viewport:{once:!0},style:{fontSize:10,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.22em`,color:`#ff6600`,marginBottom:16},children:[`◈ `,e(`manifesto.impactEyebrow`)]}),(0,u.jsxs)(`div`,{style:{fontSize:`clamp(22px, 4vw, 52px)`,fontWeight:900,letterSpacing:`-0.045em`,lineHeight:.92},children:[(0,u.jsx)(d,{children:e(`manifesto.impactLine1`)}),(0,u.jsx)(d,{delay:.08,children:e(`manifesto.impactLine2`)}),(0,u.jsxs)(d,{delay:.16,children:[e(`manifesto.impactLine3Start`),` `,(0,u.jsx)(`span`,{style:{color:`#ff6600`,fontStyle:`italic`},children:e(`manifesto.impactLine3Em`)})]})]}),(0,u.jsx)(a.p,{initial:{opacity:0,y:12},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:.3},style:{marginTop:22,fontSize:14,lineHeight:1.72,color:`rgba(0,0,0,0.45)`,fontWeight:300},children:e(`manifesto.impactBody`)}),(0,u.jsx)(a.div,{initial:{opacity:0,y:16},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:.35},className:`man-proof-grid`,children:A.map((e,t)=>(0,u.jsxs)(`div`,{className:`man-proof-card`,children:[(0,u.jsx)(`p`,{style:{fontSize:11,fontWeight:700,letterSpacing:`-0.02em`,color:`#09090b`,margin:0},children:e.label}),(0,u.jsx)(`p`,{style:{fontSize:12,lineHeight:1.65,color:`rgba(0,0,0,0.48)`,margin:0},children:e.body})]},t))})]}),(0,u.jsx)(a.div,{initial:{opacity:0,y:16},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:.2},className:`man-checklist`,children:j.map((e,t)=>(0,u.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:7,padding:`8px 12px`,borderRadius:9,background:`rgba(0,0,0,0.03)`,border:`1px solid rgba(0,0,0,0.06)`},children:[(0,u.jsx)(`div`,{style:{width:15,height:15,borderRadius:`50%`,background:`rgba(255,102,0,0.1)`,border:`1px solid rgba(255,102,0,0.2)`,display:`flex`,alignItems:`center`,justifyContent:`center`,flexShrink:0},children:(0,u.jsx)(`svg`,{width:`7`,height:`7`,viewBox:`0 0 10 10`,fill:`none`,children:(0,u.jsx)(`path`,{d:`M2 5l2.5 2.5L8 3`,stroke:`#ff6600`,strokeWidth:`1.6`,strokeLinecap:`round`,strokeLinejoin:`round`})})}),(0,u.jsx)(`span`,{style:{fontSize:11,fontWeight:500,color:`rgba(0,0,0,0.55)`},children:e})]},t))})]}),(0,u.jsx)(`div`,{ref:g,style:{borderRadius:18,overflow:`hidden`,minHeight:860,position:`relative`},children:(0,u.jsx)(p,{sectionRef:g})}),(0,u.jsxs)(`div`,{className:`man-side-stack`,children:[(0,u.jsxs)(a.div,{initial:{opacity:0,scale:.95},whileInView:{opacity:1,scale:1},viewport:{once:!0},transition:{duration:.55,ease:[.16,1,.3,1]},className:`man-side-card`,style:{background:`#ff6600`},children:[(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{style:{fontSize:10,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.1em`,color:`rgba(0,0,0,0.45)`,margin:0},children:e(`manifesto.sideA.eyebrow`)}),(0,u.jsx)(`p`,{style:{fontSize:28,fontWeight:900,letterSpacing:`-0.045em`,lineHeight:.95,color:`#000`,margin:`14px 0 0`},children:e(`manifesto.sideA.title`)})]}),(0,u.jsx)(`div`,{className:`man-side-list dark`,children:M.map(e=>(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{style:{fontSize:11,fontWeight:700,color:`#000`,margin:0},children:e.label}),(0,u.jsx)(`p`,{style:{fontSize:11,lineHeight:1.6,color:`rgba(0,0,0,0.58)`,margin:`4px 0 0`},children:e.body})]},e.label))})]}),(0,u.jsxs)(a.div,{initial:{opacity:0,scale:.95},whileInView:{opacity:1,scale:1},viewport:{once:!0},transition:{duration:.55,delay:.1,ease:[.16,1,.3,1]},className:`man-side-card`,style:{background:`#09090b`},children:[(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{style:{fontSize:10,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.1em`,color:`rgba(255,255,255,0.3)`,margin:0},children:e(`manifesto.sideB.eyebrow`)}),(0,u.jsx)(`p`,{style:{fontSize:28,fontWeight:900,letterSpacing:`-0.045em`,lineHeight:.95,color:`#fff`,margin:`14px 0 0`},children:e(`manifesto.sideB.title`)})]}),(0,u.jsx)(`div`,{className:`man-side-list`,children:N.map(e=>(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{style:{fontSize:11,fontWeight:700,color:`#fff`,margin:0},children:e.label}),(0,u.jsx)(`p`,{style:{fontSize:11,lineHeight:1.6,color:`rgba(255,255,255,0.42)`,margin:`4px 0 0`},children:e.body})]},e.label))})]})]})]})}),(0,u.jsx)(`style`,{children:`
          @keyframes marquee-slow-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ticker3-track { animation: marquee-slow-left 28s linear infinite; display: flex; width: max-content; align-items: center; }
          .ticker3-track:hover { animation-play-state: paused; }
          
          @media (max-width: 768px) {
            .ticker3-track { animation-duration: 24s; }
          }
        `}),(0,u.jsxs)(`div`,{style:{overflow:`hidden`,padding:`32px 0`,borderTop:`1px solid rgba(0,0,0,0.06)`,borderBottom:`1px solid rgba(0,0,0,0.06)`,background:`#fff`,position:`relative`},children:[(0,u.jsx)(`div`,{style:{position:`absolute`,left:0,top:0,bottom:0,width:120,background:`linear-gradient(to right, #fff, transparent)`,zIndex:2,pointerEvents:`none`}}),(0,u.jsx)(`div`,{style:{position:`absolute`,right:0,top:0,bottom:0,width:120,background:`linear-gradient(to left, #fff, transparent)`,zIndex:2,pointerEvents:`none`}}),(0,u.jsx)(`div`,{className:`ticker3-track`,children:[...[,,]].map((e,t)=>(0,u.jsx)(`span`,{style:{display:`inline-flex`,alignItems:`center`},children:P.map((e,t)=>(0,u.jsxs)(`span`,{style:{display:`inline-flex`,alignItems:`center`,gap:0},children:[(0,u.jsx)(`span`,{style:{fontSize:`clamp(20px, 3.5vw, 42px)`,fontWeight:900,letterSpacing:`-0.04em`,textTransform:`uppercase`,padding:`0 24px`,color:t%2==0?`#09090b`:`transparent`,WebkitTextStroke:t%2==0?`0`:`1.5px rgba(0,0,0,0.18)`,lineHeight:1.1,transition:`all 0.2s`},children:e}),(0,u.jsx)(`span`,{style:{color:`#ff6600`,fontSize:`clamp(14px, 2vw, 20px)`,flexShrink:0},children:`◈`})]},t))},t))})]})]}),(0,u.jsx)(a.section,{ref:l,className:`man-trans`,style:{background:y,overflow:`hidden`,padding:`120px 64px`},children:(0,u.jsxs)(`div`,{style:{maxWidth:1100,margin:`0 auto`},children:[(0,u.jsxs)(a.p,{initial:{opacity:0},whileInView:{opacity:1},viewport:{once:!0},style:{fontSize:11,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.22em`,color:`#ff6600`,marginBottom:20},children:[`◈ `,e(`manifesto.whyEyebrow`)]}),(0,u.jsxs)(a.div,{style:{fontSize:`clamp(28px, 5.5vw, 72px)`,fontWeight:900,letterSpacing:`-0.043em`,lineHeight:.92,color:b},children:[(0,u.jsx)(d,{children:e(`manifesto.whyLine1`)}),(0,u.jsxs)(d,{delay:.08,children:[e(`manifesto.whyLine2Start`),` `,(0,u.jsx)(`span`,{style:{color:`#ff6600`},children:e(`manifesto.whyLine2Em`)})]})]}),(0,u.jsx)(a.p,{initial:{opacity:0,y:18},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:.3},style:{fontSize:`clamp(14px, 1.5vw, 18px)`,lineHeight:1.75,maxWidth:620,marginTop:36,fontWeight:300,color:x},children:e(`manifesto.whyBody`)}),(0,u.jsx)(`div`,{className:`man-trans-cards`,style:{display:`grid`,gridTemplateColumns:`repeat(3, 1fr)`,gap:2,marginTop:64},children:F.map((e,t)=>{let n={num:String(t+1).padStart(2,`0`),...e};return(0,u.jsxs)(a.div,{className:`man-trans-card`,initial:{opacity:0,y:26},whileInView:{opacity:1,y:0},viewport:{once:!0,margin:`-40px`},transition:{duration:.7,delay:t*.1,ease:[.16,1,.3,1]},whileHover:{y:-4},style:{padding:`34px 28px`,border:`1px solid`,borderColor:S,borderRadius:t===0?`20px 0 0 20px`:t===2?`0 20px 20px 0`:0,background:`rgba(128,128,128,0.03)`,transition:`all 0.25s`,cursor:`default`},children:[(0,u.jsx)(`p`,{style:{fontSize:42,fontWeight:900,color:`rgba(255,102,0,0.2)`,letterSpacing:`-0.04em`,marginBottom:16},children:n.num}),(0,u.jsx)(a.p,{style:{fontSize:`clamp(14px, 1.5vw, 17px)`,fontWeight:700,marginBottom:10,lineHeight:1.2,letterSpacing:`-0.02em`,color:b},children:n.title}),(0,u.jsx)(a.p,{style:{fontSize:14,lineHeight:1.72,fontWeight:300,color:x},children:n.body})]},t)})})]})}),(0,u.jsxs)(`section`,{ref:m,className:`man-dark-section`,style:{background:`#09090b`,overflow:`hidden`,paddingBottom:130},children:[(0,u.jsxs)(`div`,{className:`man-dark-mobile`,style:{display:`none`,flexDirection:`column`,gap:0,padding:`48px 16px 56px`},children:[(0,u.jsxs)(`div`,{style:{marginBottom:28},children:[(0,u.jsxs)(`p`,{style:{fontSize:10,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.26em`,color:`#ff6600`,marginBottom:12},children:[`◈ `,e(`manifesto.field.eyebrow`)]}),(0,u.jsxs)(`h3`,{style:{fontSize:`clamp(24px, 7vw, 34px)`,fontWeight:900,letterSpacing:`-0.04em`,lineHeight:.95,color:`#fff`,margin:0},children:[e(`manifesto.field.titleLine1`),(0,u.jsx)(`br`,{}),(0,u.jsx)(`span`,{style:{color:`rgba(255,255,255,0.25)`,fontStyle:`italic`},children:e(`manifesto.field.titleLine2`)})]})]}),(0,u.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`1fr 1fr`,gridTemplateRows:`auto auto auto`,gap:10},children:[(0,u.jsxs)(a.div,{initial:{opacity:0,y:16},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{duration:.6},style:{gridColumn:`1 / 3`,position:`relative`,borderRadius:18,overflow:`hidden`,height:180},children:[(0,u.jsx)(`img`,{src:`https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=85`,alt:e(`manifesto.field.altTeam`),style:{width:`100%`,height:`100%`,objectFit:`cover`}}),(0,u.jsx)(`div`,{style:{position:`absolute`,inset:0,background:`linear-gradient(135deg, rgba(9,9,11,0.6) 0%, transparent 60%, rgba(9,9,11,0.7) 100%)`}}),(0,u.jsxs)(`div`,{style:{position:`absolute`,top:18,left:18},children:[(0,u.jsx)(`p`,{style:{fontSize:10,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.14em`,color:`#ff6600`,marginBottom:6},children:e(`manifesto.field.imageEyebrow`)}),(0,u.jsx)(`p`,{style:{fontSize:18,fontWeight:900,color:`#fff`,letterSpacing:`-0.03em`,lineHeight:1.1},children:String(e(`manifesto.field.imageTitle`)).split(`
`).map((e,t,n)=>(0,u.jsxs)(`span`,{children:[e,t<n.length-1?(0,u.jsx)(`br`,{}):null]},e))})]})]}),(0,u.jsxs)(a.div,{initial:{opacity:0,y:16},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{duration:.6,delay:.07},style:{borderRadius:18,background:`#ff6600`,padding:`18px 14px`,display:`flex`,flexDirection:`column`,justifyContent:`space-between`,minHeight:180},children:[(0,u.jsx)(`p`,{style:{fontSize:9,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.14em`,color:`rgba(0,0,0,0.45)`,marginBottom:10},children:e(`manifesto.field.freePlan`)}),(0,u.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:6},children:I.map(e=>(0,u.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:6},children:[(0,u.jsx)(`div`,{style:{width:13,height:13,borderRadius:`50%`,background:`rgba(0,0,0,0.12)`,display:`flex`,alignItems:`center`,justifyContent:`center`,flexShrink:0},children:(0,u.jsx)(`svg`,{width:`6`,height:`6`,viewBox:`0 0 10 10`,fill:`none`,children:(0,u.jsx)(`path`,{d:`M2 5l2.5 2.5L8 3`,stroke:`#000`,strokeWidth:`1.8`,strokeLinecap:`round`,strokeLinejoin:`round`})})}),(0,u.jsx)(`span`,{style:{fontSize:10.5,fontWeight:500,color:`rgba(0,0,0,0.7)`,lineHeight:1.2},children:e})]},e))}),(0,u.jsx)(`button`,{onClick:()=>t(`/register`),style:{marginTop:12,padding:`9px 10px`,borderRadius:10,background:`rgba(0,0,0,0.1)`,border:`none`,color:`#000`,fontSize:11,fontWeight:700,cursor:`pointer`,width:`100%`},children:e(`manifesto.field.createAccount`)})]}),(0,u.jsxs)(a.div,{initial:{opacity:0,y:16},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{duration:.6,delay:.12},style:{borderRadius:18,overflow:`hidden`,position:`relative`,minHeight:180},children:[(0,u.jsx)(`img`,{src:`https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&q=85`,alt:e(`manifesto.field.altFreelancer`),style:{width:`100%`,height:`100%`,objectFit:`cover`}}),(0,u.jsx)(`div`,{style:{position:`absolute`,inset:0,background:`linear-gradient(to top, rgba(9,9,11,0.88) 0%, transparent 55%)`}}),(0,u.jsxs)(`div`,{style:{position:`absolute`,bottom:14,left:14,right:14},children:[(0,u.jsx)(`span`,{style:{fontSize:9,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.12em`,color:`#ff6600`,border:`1px solid rgba(255,102,0,0.4)`,borderRadius:999,padding:`3px 8px`,display:`inline-block`,marginBottom:5},children:`R$ 0`}),(0,u.jsx)(`p`,{style:{fontSize:12,fontWeight:700,color:`#fff`,lineHeight:1.25},children:e(`manifesto.field.freeToStart`)})]})]}),(0,u.jsxs)(a.div,{initial:{opacity:0,y:16},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{duration:.6,delay:.18},style:{gridColumn:`1 / 3`,borderRadius:18,background:`rgba(255,255,255,0.04)`,border:`1px solid rgba(255,255,255,0.07)`,padding:`20px 18px`,display:`flex`,alignItems:`center`,gap:16},children:[(0,u.jsx)(`p`,{style:{fontSize:28,color:`#ff6600`,lineHeight:1,flexShrink:0},children:`◈`}),(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{style:{fontSize:14,fontWeight:700,color:`#fff`,lineHeight:1.3,letterSpacing:`-0.02em`,marginBottom:4},children:e(`manifesto.field.trustTitle`)}),(0,u.jsx)(`p`,{style:{fontSize:11,color:`rgba(255,255,255,0.32)`,lineHeight:1.55,fontWeight:300},children:e(`manifesto.field.trustBody`)})]})]})]})]}),(0,u.jsx)(`div`,{style:{maxWidth:1200,margin:`0 auto`,padding:`60px 64px 0`},children:(0,u.jsxs)(`div`,{className:`man-dark-grid`,children:[(0,u.jsx)(a.div,{className:`man-dark-img-tall`,style:{y:w,gridRow:`1 / 3`},children:(0,u.jsx)(f,{src:`https://images.unsplash.com/photo-1551434678-e076c223a692?w=700&q=85`,alt:e(`manifesto.field.altWork`),style:{height:`100%`,borderRadius:20}})}),(0,u.jsxs)(`div`,{className:`man-dark-img-main`,style:{position:`relative`,borderRadius:20,overflow:`hidden`},children:[(0,u.jsx)(f,{src:`https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=85`,alt:e(`manifesto.field.altTeam`),style:{height:`100%`,borderRadius:20}}),(0,u.jsx)(`div`,{style:{position:`absolute`,inset:0,borderRadius:20,background:`linear-gradient(to top, rgba(9,9,11,0.88) 0%, transparent 55%)`,display:`flex`,alignItems:`flex-end`,padding:28},children:(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{style:{fontSize:11,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.14em`,color:`#ff6600`,marginBottom:8},children:e(`manifesto.field.imageEyebrow`)}),(0,u.jsx)(`p`,{style:{fontSize:`clamp(16px, 2vw, 22px)`,fontWeight:700,color:`#fff`,letterSpacing:`-0.025em`,lineHeight:1.2},children:String(e(`manifesto.field.imageTitle`)).split(`
`).map((e,t,n)=>(0,u.jsxs)(`span`,{children:[e,t<n.length-1?(0,u.jsx)(`br`,{}):null]},e))})]})})]}),(0,u.jsx)(a.div,{className:`man-dark-card-side`,style:{y:T},children:(0,u.jsxs)(a.div,{initial:{opacity:0,scale:.92},whileInView:{opacity:1,scale:1},viewport:{once:!0},transition:{duration:.7,ease:[.16,1,.3,1]},style:{borderRadius:20,padding:26,height:`100%`,background:`#ff6600`,display:`flex`,flexDirection:`column`,justifyContent:`space-between`},children:[(0,u.jsx)(`p`,{style:{fontSize:12,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.1em`,color:`rgba(0,0,0,0.42)`},children:e(`manifesto.field.freePlanIncludes`)}),(0,u.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:8},children:L.map((e,t)=>(0,u.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:8},children:[(0,u.jsx)(`div`,{style:{width:16,height:16,borderRadius:`50%`,background:`rgba(0,0,0,0.12)`,display:`flex`,alignItems:`center`,justifyContent:`center`,flexShrink:0},children:(0,u.jsx)(`svg`,{width:`8`,height:`8`,viewBox:`0 0 10 10`,fill:`none`,children:(0,u.jsx)(`path`,{d:`M2 5l2.5 2.5L8 3`,stroke:`#000`,strokeWidth:`1.6`,strokeLinecap:`round`,strokeLinejoin:`round`})})}),(0,u.jsx)(`span`,{style:{fontSize:13,fontWeight:500,color:`rgba(0,0,0,0.65)`},children:e})]},t))}),(0,u.jsx)(a.button,{onClick:()=>t(`/register`),whileHover:{background:`rgba(0,0,0,0.1)`},style:{padding:`11px 16px`,borderRadius:10,background:`rgba(0,0,0,0.07)`,border:`1px solid rgba(0,0,0,0.1)`,color:`#000`,fontSize:13,fontWeight:700,cursor:`pointer`,width:`100%`,transition:`background 0.2s`},children:e(`manifesto.field.createAccount`)})]})}),(0,u.jsxs)(a.div,{initial:{opacity:0,y:22},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{duration:.7,delay:.12},style:{borderRadius:20,padding:26,background:`rgba(255,255,255,0.04)`,border:`1px solid rgba(255,255,255,0.07)`,display:`flex`,flexDirection:`column`,justifyContent:`space-between`},children:[(0,u.jsx)(`p`,{style:{fontSize:28,color:`#ff6600`},children:`◈`}),(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{style:{fontSize:`clamp(14px, 1.5vw, 17px)`,fontWeight:700,lineHeight:1.3,color:`#fff`,letterSpacing:`-0.02em`},children:e(`manifesto.field.trustTitleLong`)}),(0,u.jsx)(`p`,{style:{marginTop:8,fontSize:13,color:`rgba(255,255,255,0.32)`,lineHeight:1.65},children:e(`manifesto.field.trustBody`)})]})]}),(0,u.jsx)(f,{src:`https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=85`,alt:e(`manifesto.field.altFreelancer`),style:{borderRadius:20,height:`100%`}})]})})]}),(0,u.jsxs)(`section`,{ref:h,style:{background:`#09090b`,overflow:`hidden`,paddingBottom:130},children:[(0,u.jsx)(`style`,{children:`
          @keyframes feat-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes feat-scroll-rev {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .feat-row-1 {
            display: flex;
            width: max-content;
            animation: feat-scroll 40s linear infinite;
            will-change: transform;
          }
          .feat-row-2 {
            display: flex;
            width: max-content;
            animation: feat-scroll-rev 34s linear infinite reverse;
            will-change: transform;
          }
          .feat-row-1:hover, .feat-row-2:hover { animation-play-state: paused; }
          .feat-card-wrap { transition: transform 0.3s ease; cursor: default; flex-shrink: 0; }
          .feat-card-wrap:hover { transform: translateY(-6px) scale(1.02); }

          .fc { border-radius: 20px; padding: clamp(18px,2.5vw,28px) clamp(16px,2vw,24px); display: flex; flex-direction: column; justify-content: space-between; flex-shrink: 0; }
          .fc-a { width: clamp(150px,18vw,200px); min-height: clamp(170px,22vw,220px); background: #ff6600; }
          .fc-b { width: clamp(190px,24vw,260px); min-height: clamp(170px,22vw,220px); background: transparent; border: 1px solid rgba(255,255,255,0.1); }
          .fc-c { width: clamp(170px,20vw,220px); min-height: clamp(170px,22vw,220px); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); }
          .fc-d { width: clamp(140px,16vw,180px); min-height: clamp(170px,22vw,220px); background: #09090b; border: 1px solid rgba(255,102,0,0.2); }
          .fc-e { width: clamp(180px,22vw,240px); min-height: clamp(155px,20vw,200px); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); }
          .fc-f { width: clamp(150px,18vw,200px); min-height: clamp(155px,20vw,200px); background: #ff6600; }
          .fc-g { width: clamp(140px,16vw,180px); min-height: clamp(155px,20vw,200px); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); }
          .fc-h { width: clamp(190px,24vw,260px); min-height: clamp(155px,20vw,200px); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); }

          .feat-gap { gap: clamp(8px,1.2vw,12px); padding-right: clamp(8px,1.2vw,12px); }

          @media (max-width: 768px) {
            .feat-row-1 { animation-duration: 28s; }
            .feat-row-2 { animation-duration: 24s; }
            .fc { border-radius: 16px; }
          }
          
          @media (max-width: 480px) {
            .fc { padding: 16px 14px; }
          }
        `}),(0,u.jsx)(`div`,{style:{maxWidth:1200,margin:`0 auto`,padding:`0 clamp(20px,5vw,64px) clamp(40px,5vw,64px)`},children:(0,u.jsxs)(`div`,{style:{display:`flex`,alignItems:`flex-end`,justifyContent:`space-between`,flexWrap:`wrap`,gap:16},children:[(0,u.jsxs)(`div`,{style:{fontSize:`clamp(26px, 4.5vw, 54px)`,fontWeight:900,letterSpacing:`-0.04em`,lineHeight:.93,color:`#fff`},children:[(0,u.jsx)(d,{children:e(`manifesto.featureStrip.titleLine1`)}),(0,u.jsx)(d,{delay:.08,children:(0,u.jsx)(`span`,{style:{color:`rgba(255,255,255,0.18)`,fontStyle:`italic`},children:e(`manifesto.featureStrip.titleLine2`)})})]}),(0,u.jsx)(a.p,{initial:{opacity:0},whileInView:{opacity:1},viewport:{once:!0},transition:{delay:.3},style:{fontSize:13,color:`rgba(255,255,255,0.28)`,maxWidth:220,lineHeight:1.6,fontWeight:300},children:e(`manifesto.featureStrip.body`)})]})}),(0,u.jsx)(`div`,{style:{overflow:`hidden`,marginBottom:`clamp(8px,1vw,12px)`},children:(0,u.jsx)(`div`,{className:`feat-row-1`,children:[...[,,,,]].map((t,n)=>(0,u.jsxs)(`div`,{"aria-hidden":n>0?!0:void 0,className:`feat-gap`,style:{display:`flex`},children:[(0,u.jsxs)(`div`,{className:`feat-card-wrap fc fc-a`,children:[(0,u.jsx)(`span`,{style:{fontSize:`clamp(9px,1vw,11px)`,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.14em`,color:`rgba(0,0,0,0.45)`},children:e(`manifesto.featureStrip.liveEditorLabel`)}),(0,u.jsxs)(`div`,{children:[(0,u.jsxs)(`p`,{style:{fontSize:`clamp(28px,4vw,42px)`,lineHeight:1,fontWeight:900,color:`#000`,letterSpacing:`-0.05em`},children:[e(`manifesto.featureStrip.liveEditorTitleLine1`),(0,u.jsx)(`br`,{}),e(`manifesto.featureStrip.liveEditorTitleLine2`)]}),(0,u.jsx)(`p`,{style:{fontSize:`clamp(10px,1.1vw,11px)`,color:`rgba(0,0,0,0.5)`,marginTop:8,lineHeight:1.5},children:e(`manifesto.featureStrip.liveEditorBody`)})]})]}),(0,u.jsxs)(`div`,{className:`feat-card-wrap fc fc-b`,children:[(0,u.jsx)(`div`,{style:{width:`clamp(34px,4vw,44px)`,height:`clamp(34px,4vw,44px)`,borderRadius:14,background:`rgba(255,102,0,0.08)`,border:`1px solid rgba(255,102,0,0.2)`,display:`flex`,alignItems:`center`,justifyContent:`center`,fontSize:`clamp(15px,2vw,20px)`},children:`◉`}),(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{style:{fontSize:`clamp(13px,1.5vw,16px)`,fontWeight:800,color:`#fff`,letterSpacing:`-0.03em`,marginBottom:6,lineHeight:1.2},children:String(e(`manifesto.featureStrip.signatureTitle`)).split(`
`).map((e,t,n)=>(0,u.jsxs)(`span`,{children:[e,t<n.length-1?(0,u.jsx)(`br`,{}):null]},e))}),(0,u.jsx)(`p`,{style:{fontSize:`clamp(10px,1.1vw,12px)`,color:`rgba(255,255,255,0.28)`,lineHeight:1.55},children:e(`manifesto.featureStrip.signatureBody`)})]})]}),(0,u.jsxs)(`div`,{className:`feat-card-wrap fc fc-c`,children:[(0,u.jsx)(`p`,{style:{fontSize:`clamp(12px,1.4vw,15px)`,fontWeight:800,color:`#fff`,letterSpacing:`-0.03em`,lineHeight:1.2},children:String(e(`manifesto.featureStrip.brandTitle`)).split(`
`).map((e,t,n)=>(0,u.jsxs)(`span`,{children:[e,t<n.length-1?(0,u.jsx)(`br`,{}):null]},e))}),(0,u.jsx)(`div`,{style:{display:`flex`,flexWrap:`wrap`,gap:5,marginTop:10},children:R.map(e=>(0,u.jsx)(`span`,{style:{fontSize:`clamp(9px,1vw,11px)`,fontWeight:600,padding:`3px 8px`,borderRadius:999,background:`rgba(255,255,255,0.07)`,border:`1px solid rgba(255,255,255,0.1)`,color:`rgba(255,255,255,0.6)`},children:e},e))}),(0,u.jsx)(`p`,{style:{fontSize:`clamp(10px,1.1vw,11px)`,color:`rgba(255,255,255,0.28)`,lineHeight:1.5,marginTop:8},children:e(`manifesto.featureStrip.brandBody`)})]}),(0,u.jsxs)(`div`,{className:`feat-card-wrap fc fc-d`,children:[(0,u.jsx)(`span`,{style:{fontSize:`clamp(20px,2.5vw,28px)`,lineHeight:1},children:`◆`}),(0,u.jsxs)(`div`,{children:[(0,u.jsxs)(`p`,{style:{fontSize:`clamp(22px,3vw,32px)`,fontWeight:900,color:`#ff6600`,letterSpacing:`-0.05em`,lineHeight:.95},children:[`PIX`,(0,u.jsx)(`br`,{}),(0,u.jsx)(`span`,{style:{fontSize:`clamp(11px,1.2vw,14px)`,color:`rgba(255,255,255,0.4)`,fontWeight:400,letterSpacing:0},children:e(`manifesto.featureStrip.pixAfter`)})]}),(0,u.jsx)(`p`,{style:{fontSize:`clamp(10px,1.1vw,11px)`,color:`rgba(255,255,255,0.28)`,marginTop:8,lineHeight:1.5},children:e(`manifesto.featureStrip.pixBody`)})]})]})]},n))})}),(0,u.jsx)(`div`,{style:{overflow:`hidden`},children:(0,u.jsx)(`div`,{className:`feat-row-2`,children:[...[,,,,]].map((t,n)=>(0,u.jsxs)(`div`,{"aria-hidden":n>0?!0:void 0,className:`feat-gap`,style:{display:`flex`},children:[(0,u.jsxs)(`div`,{className:`feat-card-wrap fc fc-e`,children:[(0,u.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:8},children:[(0,u.jsx)(`span`,{style:{fontSize:`clamp(16px,2vw,22px)`,color:`#ff6600`},children:`◷`}),(0,u.jsx)(`span`,{style:{fontSize:`clamp(9px,1vw,11px)`,fontWeight:700,color:`rgba(255,255,255,0.3)`,textTransform:`uppercase`,letterSpacing:`0.12em`},children:e(`manifesto.featureStrip.deadlineLabel`)})]}),(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{style:{fontSize:`clamp(12px,1.4vw,15px)`,fontWeight:800,color:`#fff`,letterSpacing:`-0.03em`,lineHeight:1.3,marginBottom:6},children:e(`manifesto.featureStrip.deadlineTitle`)}),(0,u.jsx)(`p`,{style:{fontSize:`clamp(10px,1.1vw,11px)`,color:`rgba(255,255,255,0.25)`,lineHeight:1.5},children:e(`manifesto.featureStrip.deadlineBody`)})]})]}),(0,u.jsxs)(`div`,{className:`feat-card-wrap fc fc-f`,children:[(0,u.jsx)(`span`,{style:{fontSize:`clamp(9px,1vw,11px)`,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.14em`,color:`rgba(0,0,0,0.4)`},children:e(`manifesto.featureStrip.historyLabel`)}),(0,u.jsx)(`div`,{children:z.map((e,t)=>(0,u.jsx)(`div`,{style:{fontSize:`clamp(10px,1.2vw,12px)`,fontWeight:700,color:t===3?`#000`:`rgba(0,0,0,0.45)`,padding:`4px 0`,borderBottom:t<3?`1px solid rgba(0,0,0,0.1)`:`none`},children:e},t))})]}),(0,u.jsxs)(`div`,{className:`feat-card-wrap fc fc-g`,children:[(0,u.jsx)(`span`,{style:{fontSize:`clamp(9px,1vw,11px)`,fontWeight:700,color:`rgba(255,255,255,0.25)`,textTransform:`uppercase`,letterSpacing:`0.12em`},children:e(`manifesto.featureStrip.typesLabel`)}),(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{style:{fontSize:`clamp(44px,6vw,64px)`,fontWeight:900,color:`rgba(255,102,0,0.15)`,letterSpacing:`-0.06em`,lineHeight:.85},children:`10+`}),(0,u.jsx)(`p`,{style:{fontSize:`clamp(11px,1.3vw,13px)`,fontWeight:700,color:`#fff`,letterSpacing:`-0.02em`,marginTop:6},children:e(`manifesto.featureStrip.modelsTitle`)}),(0,u.jsx)(`p`,{style:{fontSize:`clamp(10px,1.1vw,11px)`,color:`rgba(255,255,255,0.25)`,marginTop:3},children:e(`manifesto.featureStrip.modelsBody`)})]})]}),(0,u.jsxs)(`div`,{className:`feat-card-wrap fc fc-h`,children:[(0,u.jsx)(`div`,{style:{display:`flex`,gap:6,flexWrap:`wrap`},children:B.map((e,t)=>(0,u.jsx)(`span`,{style:{fontSize:`clamp(9px,1vw,11px)`,fontWeight:700,padding:`3px 10px`,borderRadius:999,background:t===2?`#ff6600`:t===1?`rgba(255,255,255,0.08)`:`transparent`,border:t===0?`1px solid rgba(255,255,255,0.1)`:`none`,color:t===2?`#000`:t===1?`#fff`:`rgba(255,255,255,0.35)`},children:e},e))}),(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{style:{fontSize:`clamp(12px,1.4vw,15px)`,fontWeight:800,color:`#fff`,letterSpacing:`-0.03em`,lineHeight:1.3,marginBottom:6},children:e(`manifesto.featureStrip.growthTitle`)}),(0,u.jsx)(`p`,{style:{fontSize:`clamp(10px,1.1vw,11px)`,color:`rgba(255,255,255,0.25)`,lineHeight:1.5},children:e(`manifesto.featureStrip.growthBody`)})]})]})]},n))})})]})]})}export{m as default};