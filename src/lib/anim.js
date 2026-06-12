/* SignaalBrug v2 — entrance choreography via the Web Animations API.
   Base CSS state is always visible (capture/print/reduced-motion safe);
   animations are layered on top when elements mount. */

const EASE_OUT = "cubic-bezier(.2,.8,.2,1)";
const EASE_SPRING = "cubic-bezier(.34,1.4,.4,1)";
const SELECTOR = ".rev, .modal, .drawer, .toast, .overlay";

function run(el, keyframes, opts) {
  try {
    const a = el.animate(keyframes, opts);
    // In throttled/hidden tabs the document timeline can freeze, leaving
    // fill:'backwards' stuck at frame 0. Force-finish as a safety net.
    setTimeout(() => {
      try { if (a.playState !== "finished") a.finish(); } catch { /* detached */ }
    }, (opts.delay || 0) + opts.duration + 200);
  } catch { /* WAAPI unavailable — content simply appears */ }
}

function animateEl(el) {
  if (el.__sbAnim) return;
  el.__sbAnim = true;
  if (el.classList.contains("rev")) {
    let idx = 0;
    el.classList.forEach((c) => { const m = /^rev-(\d)$/.exec(c); if (m) idx = +m[1]; });
    run(el,
      [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
      { duration: 450, delay: idx * 65, easing: EASE_OUT, fill: "backwards" });
  } else if (el.classList.contains("modal")) {
    run(el,
      [{ opacity: 0, transform: "scale(.94) translateY(8px)" }, { opacity: 1, transform: "none" }],
      { duration: 260, easing: EASE_SPRING });
  } else if (el.classList.contains("drawer")) {
    run(el,
      [{ opacity: 0, transform: "translateX(40px)" }, { opacity: 1, transform: "none" }],
      { duration: 280, easing: EASE_OUT });
  } else if (el.classList.contains("toast")) {
    run(el,
      [{ opacity: 0, transform: "translateY(14px) scale(.96)" }, { opacity: 1, transform: "none" }],
      { duration: 300, easing: EASE_SPRING });
  } else if (el.classList.contains("overlay")) {
    run(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: EASE_OUT });
  }
}

function scan(node) {
  if (node.nodeType !== 1) return;
  if (node.matches && node.matches(SELECTOR)) animateEl(node);
  if (node.querySelectorAll) node.querySelectorAll(SELECTOR).forEach(animateEl);
}

/* Call once after the React root mounts; returns a cleanup function. */
export function initAnimations() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const root = document.getElementById("root");
  if (!root) return () => {};
  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => m.addedNodes.forEach(scan));
  });
  mo.observe(root, { childList: true, subtree: true });
  scan(root);
  return () => mo.disconnect();
}
