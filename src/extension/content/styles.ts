export const PANEL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :host {
    --ts-primary: #6366f1;
    --ts-primary-soft: rgba(99, 102, 241, 0.1);
    --ts-danger: #ef4444;
    --ts-surface: #030712;
    --ts-surface-soft: #0f172a;
    --ts-surface-card: #1e293b;
    --ts-border: rgba(255, 255, 255, 0.08);
    --ts-border-strong: rgba(255, 255, 255, 0.15);
    --ts-text: #f8fafc;
    --ts-text-muted: #94a3b8;
    --ts-radius-lg: 20px;
    --ts-radius-md: 12px;
    --ts-radius-sm: 8px;
    --ts-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  .ts-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--ts-surface);
    border: 1px solid var(--ts-border);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    z-index: 2147483647;
    overflow: hidden;
  }

  .ts-fab:hover {
    transform: scale(1.1) rotate(5deg);
    border-color: var(--ts-primary);
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
  }

  .ts-fab.active {
    background: var(--ts-danger);
    transform: scale(0.9);
  }

  /* Cloud Icon Animation */
  .tfe-cloud-icon {
    width: 32px;
    height: 32px;
    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
    animation: tfe-cloud-float 3s ease-in-out infinite;
  }
  @keyframes tfe-cloud-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  .tfe-particle { animation: tfe-particle-drift 4s linear infinite alternate; }
  .p1 { animation-delay: 0s; }
  .p2 { animation-delay: -1s; }
  .p3 { animation-delay: -2.5s; }
  .p4 { animation-delay: -0.5s; }
  @keyframes tfe-particle-drift {
    from { transform: translate(0, 0); opacity: 0.3; }
    to { transform: translate(2px, 2px); opacity: 0.8; }
  }

  .ts-panel {
    position: fixed;
    bottom: 100px;
    right: 24px;
    width: 420px;
    max-height: calc(100vh - 140px);
    background: rgba(3, 7, 18, 0.85);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: var(--ts-radius-lg);
    border: 1px solid var(--ts-border);
    box-shadow: var(--ts-shadow);
    z-index: 2147483646;
    display: none;
    flex-direction: column;
    overflow: hidden;
    color: var(--ts-text);
    animation: ts-panel-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes ts-panel-in {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .ts-panel.active { display: flex; }

  .ts-header {
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--ts-border);
    background: rgba(255, 255, 255, 0.02);
  }

  .ts-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--ts-primary);
  }

  .ts-settings-icon, .ts-close {
    background: transparent;
    border: none;
    color: var(--ts-text-muted);
    cursor: pointer;
    padding: 4px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }
  .ts-settings-icon:hover, .ts-close:hover {
    color: var(--ts-text);
    background: rgba(255, 255, 255, 0.05);
  }

  .ts-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    scrollbar-width: thin;
    scrollbar-color: var(--ts-border) transparent;
  }

  .ts-body::-webkit-scrollbar { width: 4px; }
  .ts-body::-webkit-scrollbar-thumb { background: var(--ts-border); border-radius: 10px; }

  /* Accordions */
  .ts-accordion-wrap {
    margin-bottom: 12px;
    border-radius: var(--ts-radius-md);
    border: 1px solid var(--ts-border);
    background: rgba(255, 255, 255, 0.01);
    overflow: hidden;
    transition: all 0.3s;
  }
  .ts-accordion-wrap.open {
    border-color: var(--ts-border-strong);
    background: rgba(255, 255, 255, 0.03);
  }
  .ts-accordion-header {
    width: 100%;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: transparent;
    border: none;
    color: var(--ts-text);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }
  .ts-accordion-chevron {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ts-accordion-wrap.open .ts-accordion-chevron {
    transform: rotate(180deg);
  }
  .ts-accordion-body {
    display: none;
    padding: 0 16px 16px;
  }
  .ts-accordion-wrap.open .ts-accordion-body {
    display: block;
  }

  /* Inputs */
  .ts-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: var(--ts-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
    margin-top: 12px;
  }
  .ts-input {
    width: 100%;
    background: var(--ts-surface-soft);
    border: 1px solid var(--ts-border);
    border-radius: var(--ts-radius-sm);
    padding: 12px;
    color: var(--ts-text);
    font-size: 13px;
    outline: none;
    transition: all 0.2s;
    font-family: inherit;
    resize: vertical;
  }
  .ts-input:focus {
    border-color: var(--ts-primary);
    background: var(--ts-surface-card);
    box-shadow: 0 0 0 4px var(--ts-primary-soft);
  }

  /* Pill Checkboxes */
  .ts-pill-checkbox {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    margin-right: 8px;
    margin-bottom: 8px;
  }
  .ts-pill-label {
    padding: 6px 12px;
    background: var(--ts-surface-soft);
    border: 1px solid var(--ts-border);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    color: var(--ts-text-muted);
    transition: all 0.2s;
  }
  .ts-pill-checkbox-input:checked + .ts-pill-label {
    background: var(--ts-primary);
    border-color: var(--ts-primary);
    color: white;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }
  .ts-visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  /* Suggestions */
  .ts-suggestions-scroll {
    display: flex;
    overflow-x: auto;
    gap: 8px;
    padding-bottom: 4px;
    scrollbar-width: none;
  }
  .ts-suggestions-scroll::-webkit-scrollbar { display: none; }
  .ts-suggestion {
    flex: 0 0 auto;
    padding: 10px 16px;
    background: var(--ts-surface-soft);
    border: 1px solid var(--ts-border);
    border-radius: var(--ts-radius-md);
    color: var(--ts-text);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .ts-suggestion:hover {
    background: var(--ts-surface-card);
    border-color: var(--ts-primary);
    transform: translateY(-2px);
  }

  /* Buttons */
  .ts-actions-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    margin-top: 16px;
  }
  .ts-btn-primary {
    width: 100%;
    padding: 14px;
    background: var(--ts-primary);
    border: none;
    border-radius: var(--ts-radius-md);
    color: white;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.2s cubic-bezier(0.19, 1, 0.22, 1);
  }
  .ts-btn-primary:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
  }
  .ts-btn-primary:active { transform: translateY(0); }
  .ts-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

  .ts-btn-secondary {
    padding: 8px 12px;
    background: var(--ts-surface-soft);
    border: 1px solid var(--ts-border);
    border-radius: var(--ts-radius-sm);
    color: var(--ts-text);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .ts-btn-secondary:hover {
    background: var(--ts-surface-card);
    border-color: var(--ts-border-strong);
  }

  .ts-test-btn {
    padding: 0 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--ts-border);
    border-radius: var(--ts-radius-md);
    color: #94a3b8;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .ts-test-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; }

  /* Recorder */
  .ts-recorder-wrap {
    padding: 8px 0;
  }
  .ts-recorder-btn {
    flex: 1;
    padding: 10px;
    border-radius: var(--ts-radius-sm);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }
  .ts-recorder-start { background: #10b981; color: white; }
  .ts-recorder-start:hover { background: #059669; }
  .ts-recorder-stop { background: var(--ts-danger); color: white; }
  .ts-recorder-stop:hover { background: #dc2626; }

  /* Agent Log */
  #ts-agent-log { margin-top: 16px; }
  .ts-log-entry {
    padding: 10px;
    margin-bottom: 8px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    font-size: 12px;
    border-left: 3px solid var(--ts-primary);
    animation: ts-fade-in 0.3s ease;
  }
  @keyframes ts-fade-in { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }

  /* Debug Area */
  .ts-debug-section {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px dashed var(--ts-border);
  }
  .ts-debug-log {
    margin-top: 12px;
    padding: 12px;
    background: #000;
    border: 1px solid #1e293b;
    border-radius: var(--ts-radius-md);
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #4ade80;
    max-height: 150px;
    overflow-y: auto;
  }

  .ts-loading { display: flex; align-items: center; justify-content: center; padding: 20px; gap: 8px; }
  .ts-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.1); border-top-color: var(--ts-primary); border-radius: 50%; animation: ts-spin 0.8s linear infinite; }
  @keyframes ts-spin { to { transform: rotate(360deg); } }
`;
