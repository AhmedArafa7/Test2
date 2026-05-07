import{hc as i}from"./chunk-EGSW2S3D.js";var n=/^[a-z][a-z\d+.-]*:/i;function o(){let r=typeof window<"u"?window.location.origin:"http://localhost";try{return new URL(i.apiUrl,r).origin}catch{return r}}function a(r){if(!r?.trim())return;let t=r.trim();if(t.startsWith("data:")||n.test(t))return t;let e=t.startsWith("/")?t:`/${t}`;return`${o()}${e}`}function l(r){let t=(r?.trim()||"Baytology property").slice(0,40),e=`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${t}">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1f3d4a" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#background)" rx="36" />
      <circle cx="640" cy="140" r="74" fill="#f59e0b" opacity="0.9" />
      <path d="M110 430L260 290L390 390L500 260L690 430V520H110Z" fill="#1d4ed8" opacity="0.78" />
      <path d="M165 470L305 345L410 430L520 330L645 470V520H165Z" fill="#38bdf8" opacity="0.92" />
      <rect x="265" y="365" width="78" height="84" rx="10" fill="#f8fafc" opacity="0.16" />
      <rect x="530" y="390" width="66" height="58" rx="10" fill="#f8fafc" opacity="0.16" />
      <text x="400" y="546" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#e2e8f0">
        ${t}
      </text>
    </svg>
  `;return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(e)}`}function f(r,t){return a(r)??l(t)}export{l as a,f as b};
