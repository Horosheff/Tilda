// Tilda Space AI - Ace Editor Main World Bridge
(function () {
    if ((window as any).TS_ACE_BRIDGE_LOADED) return;
    (window as any).TS_ACE_BRIDGE_LOADED = true;

    window.addEventListener('TS_ACE_INJECT', (e: any) => {
        const html = e.detail?.html;
        if (!html) return;

        try {
            const pres = document.querySelectorAll('pre[id^="aceeditor"]');
            const els = document.querySelectorAll('.ace_editor');
            if (pres.length === 0 && els.length === 0) return;

            const w = window as any;
            const ace = w.ace || (typeof globalThis !== 'undefined' ? (globalThis as any).ace : null);

            const pickByMaxId = (arr: NodeListOf<Element>) => {
                let best: Element | null = null;
                let maxId = 0;
                for (let i = 0; i < arr.length; i++) {
                    const el = arr[i];
                    const id = el.id || (el.closest?.('pre[id^="aceeditor"]') as Element)?.id || '';
                    const m = id.match(/aceeditor(\d+)/);
                    const num = m ? parseInt(m[1], 10) : 0;
                    const r = (el as HTMLElement).getBoundingClientRect?.();
                    if (num > maxId && r && r.width > 80 && r.height > 80) { best = el; maxId = num; }
                }
                return best || (arr.length > 0 ? arr[arr.length - 1] : null);
            };

            const pre = pickByMaxId(pres) as HTMLPreElement | null;
            const el = pickByMaxId(els);

            if (pre && pre.id && ace && typeof ace.edit === 'function') {
                const ed = ace.edit(pre.id);
                if (ed && typeof ed.setValue === 'function') {
                    ed.setValue(html);
                    window.dispatchEvent(new CustomEvent('TS_ACE_INJECT_DONE', { detail: { success: true } }));
                    return;
                }
            }

            if (el) {
                const aceEl = el as any;
                if (aceEl.aceEditor?.setValue) { aceEl.aceEditor.setValue(html); window.dispatchEvent(new CustomEvent('TS_ACE_INJECT_DONE', { detail: { success: true } })); return; }
                if (aceEl.env?.editor?.setValue) { aceEl.env.editor.setValue(html); window.dispatchEvent(new CustomEvent('TS_ACE_INJECT_DONE', { detail: { success: true } })); return; }
                if (ace && typeof ace.edit === 'function') {
                    const ed = ace.edit(el);
                    if (ed?.setValue) { ed.setValue(html); window.dispatchEvent(new CustomEvent('TS_ACE_INJECT_DONE', { detail: { success: true } })); return; }
                }
            }
        } catch (_) { }
        window.dispatchEvent(new CustomEvent('TS_ACE_INJECT_DONE', { detail: { success: false } }));
    });
})();
