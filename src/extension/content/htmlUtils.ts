import type { AnimationOptions } from '../shared/aiRuntime';

/**
 * Applies CSS animation classes and IntersectionObserver/scroll scripts
 * based on the provided animation options.
 */
export function applyAnimations(html: string, opts: AnimationOptions): string {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
        const body = doc.body;
        if (!body?.firstElementChild) return html;

        const root = body.firstElementChild;
        const css: string[] = [];
        const eb = 'cubic-bezier(0.22, 1, 0.36, 1)';

        const hasReveal = opts.staggerReveal || opts.fadeInUp || opts.zoomIn;
        if (opts.staggerReveal) css.push(`.tsa-stagger{opacity:0;transform:translateY(40px);transition:opacity .7s ${eb},transform .7s ${eb}}.tsa-stagger.tsa-revealed{opacity:1;transform:translateY(0)}`);
        if (opts.fadeInUp) css.push(`.tsa-fade-up{opacity:0;transform:translateY(28px);transition:opacity .6s ${eb},transform .6s ${eb}}.tsa-fade-up.tsa-revealed{opacity:1;transform:translateY(0)}`);
        if (opts.zoomIn) css.push(`.tsa-zoom{opacity:0;transform:scale(0.92);transition:opacity .55s ${eb},transform .55s ${eb}}.tsa-zoom.tsa-revealed{opacity:1;transform:scale(1)}`);
        if (opts.cardLift) css.push(`.tsa-card-lift{transition:transform .35s ${eb},box-shadow .35s ${eb}}.tsa-card-lift:hover{transform:translateY(-8px);box-shadow:0 20px 40px rgba(0,0,0,.12),0 8px 16px rgba(0,0,0,.08)}`);
        if (opts.glowHover) css.push(`.tsa-glow{transition:box-shadow .4s ease}.tsa-glow:hover{box-shadow:0 0 30px rgba(105,75,232,.35),0 0 60px rgba(105,75,232,.15)}`);
        if (opts.tiltHover) css.push(`.tsa-tilt{transition:transform .3s ${eb};transform-style:preserve-3d}.tsa-tilt:hover{transform:perspective(800px) rotateX(2deg) rotateY(-2deg) scale(1.02)}`);
        if (opts.textClip) css.push(`.tsa-text-clip{opacity:0;clip-path:inset(0 100% 0 0);transition:clip-path .8s ${eb},opacity .6s ${eb}}.tsa-text-clip.tsa-revealed{opacity:1;clip-path:inset(0 0 0 0)}`);
        if (opts.parallax) { css.push(`.tsa-parallax{--py:0;transform:translate3d(0,var(--py),0);transition:transform .15s ease-out;will-change:transform}`); if (opts.cardLift) css.push(`.tsa-card-lift.tsa-parallax:hover{transform:translate3d(0,calc(var(--py) - 8px),0)}`); }
        if (opts.floatSubtle) css.push(`@keyframes tsa-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}.tsa-float{animation:tsa-float 4s ease-in-out infinite}`);
        if (css.length === 0) return html;

        const sectionLike = Array.from(root.children).filter(
            ch => ch.tagName !== 'STYLE' && ch.tagName !== 'SCRIPT'
        ).slice(0, 15);

        sectionLike.forEach((el, i) => {
            if (hasReveal) {
                const cls = opts.staggerReveal ? 'tsa-stagger' : opts.fadeInUp ? 'tsa-fade-up' : 'tsa-zoom';
                el.classList.add(cls, 'tsa-reveal');
                (el as HTMLElement).style.transitionDelay = `${i * 0.08}s`;
            }
            if (opts.cardLift) el.classList.add('tsa-card-lift');
            if (opts.glowHover) el.classList.add('tsa-glow');
            if (opts.tiltHover) el.classList.add('tsa-tilt');
            if (opts.parallax) { el.classList.add('tsa-parallax'); (el as HTMLElement).setAttribute('data-parallax-speed', String(0.2 + (i % 3) * 0.1)); }
            if (opts.floatSubtle && i % 2 === 0) { el.classList.add('tsa-float'); (el as HTMLElement).style.animationDelay = `${i * 0.2}s`; }
        });

        if (opts.textClip) {
            root.querySelectorAll('h1, h2, h3, h4').forEach((h, i) => {
                if (i > 8) return;
                h.classList.add('tsa-text-clip', 'tsa-reveal');
                (h as HTMLElement).style.transitionDelay = `${i * 0.05}s`;
            });
        }

        const style = doc.createElement('style');
        style.textContent = `@media(prefers-reduced-motion:reduce){.tsa-stagger,.tsa-fade-up,.tsa-zoom,.tsa-text-clip,.tsa-float{transition:none;animation:none}}.tsa-reveal{will-change:opacity,transform} ${css.join(' ')}`;
        body.insertBefore(style, body.firstChild);

        const scripts: string[] = [];
        if (hasReveal || opts.textClip) {
            scripts.push(`(function(){var io=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('tsa-revealed');});},{threshold:.06,rootMargin:'0px 0px -50px'}):null;if(io)document.querySelectorAll('.tsa-reveal').forEach(function(el){io.observe(el);});})();`);
        }
        if (opts.parallax) {
            scripts.push(`(function(){var ticking=0;function update(){var sc=window.scrollY||document.documentElement.scrollTop;document.querySelectorAll('.tsa-parallax').forEach(function(el){var s=parseFloat(el.getAttribute('data-parallax-speed'))||0.3;el.style.setProperty('--py',(sc*s*0.1)+'px');});}window.addEventListener('scroll',function(){if(!ticking){requestAnimationFrame(function(){update();ticking=0;});ticking=1;}},{passive:true});update();})();`);
        }
        scripts.forEach(s => {
            const script = doc.createElement('script');
            script.textContent = s;
            body.appendChild(script);
        });

        return body.innerHTML.trim();
    } catch {
        return html;
    }
}

/**
 * Sanitize HTML for Tilda — re-parse and re-serialize to fix unclosed tags.
 */
export function fixHtmlForTilda(html: string): string {
    const trimmed = html.trim();
    if (!trimmed) return trimmed;
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<body>${trimmed}</body>`, 'text/html');
        const body = doc.body;
        if (!body) return trimmed;
        const fixed = body.innerHTML.trim();
        return fixed || trimmed;
    } catch {
        return trimmed;
    }
}

/**
 * Export HTML content as a downloadable file.
 */
export function exportAsHtmlFile(htmlContent: string, filename: string): void {
    const fullHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tilda Space AI — Export</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Write to clipboard with fallback for content script context.
 */
export async function clipboardWrite(text: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        try { document.execCommand('copy'); } catch { /* ignore */ }
        document.body.removeChild(ta);
    }
}
