export const PANEL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :host, :root {
    --ts-bg: #07111f;
    --ts-surface: rgba(8, 15, 29, 0.92);
    --ts-surface-strong: rgba(13, 22, 39, 0.96);
    --ts-surface-soft: rgba(17, 29, 49, 0.82);
    --ts-border: rgba(148, 163, 184, 0.18);
    --ts-border-strong: rgba(129, 103, 240, 0.38);
    --ts-text: #eef2ff;
    --ts-text-muted: #9fb0ca;
    --ts-text-soft: #7f92b1;
    --ts-primary: #7c5cff;
    --ts-primary-2: #9b8cff;
    --ts-accent: #f4c95d;
    --ts-success: #34d399;
    --ts-warning: #fb923c;
    --ts-danger: #f87171;
    --ts-shadow: 0 24px 80px rgba(2, 6, 23, 0.55);
    --ts-radius-xl: 24px;
    --ts-radius-lg: 18px;
    --ts-radius-md: 14px;
  }

  .ts-fab {
    position: fixed;
    right: 28px;
    bottom: 28px;
    width: 64px;
    height: 64px;
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 22px;
    background:
      radial-gradient(circle at 30% 25%, rgba(244, 201, 93, 0.35), transparent 34%),
      linear-gradient(145deg, #7c5cff, #4c35c7 72%);
    color: #fff;
    cursor: pointer;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 18px 42px rgba(76, 53, 199, 0.42);
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    z-index: 2147483647;
    backdrop-filter: blur(18px);
  }
  .ts-fab:hover {
    transform: translateY(-3px) scale(1.03);
    box-shadow: 0 24px 56px rgba(76, 53, 199, 0.5);
    border-color: rgba(255,255,255,0.42);
  }
  .ts-fab.active {
    transform: rotate(45deg);
    background: linear-gradient(145deg, #ef4444, #dc2626);
    box-shadow: 0 20px 48px rgba(220, 38, 38, 0.35);
  }

  .ts-panel {
    position: fixed;
    right: 28px;
    bottom: 108px;
    width: 440px;
    max-height: calc(100vh - 136px);
    display: none;
    flex-direction: column;
    overflow: hidden;
    border-radius: 30px;
    background:
      radial-gradient(circle at top left, rgba(124, 92, 255, 0.22), transparent 28%),
      linear-gradient(180deg, rgba(10, 18, 33, 0.98), rgba(7, 13, 25, 0.98));
    border: 1px solid rgba(148, 163, 184, 0.18);
    box-shadow: var(--ts-shadow);
    backdrop-filter: blur(22px);
    z-index: 2147483646;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: var(--ts-text);
    font-size: 14px;
    line-height: 1.5;
    animation: ts-slide-up 0.25s ease;
  }
  .ts-panel.open { display: flex; }

  @keyframes ts-slide-up {
    from { opacity: 0; transform: translateY(14px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .ts-header {
    padding: 20px 22px 18px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  .ts-header-copy {
    min-width: 0;
  }
  .ts-header-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    margin-bottom: 10px;
    border: 1px solid rgba(244, 201, 93, 0.22);
    border-radius: 999px;
    background: rgba(244, 201, 93, 0.1);
    color: #f7d87f;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .ts-header h2 {
    font-size: 20px;
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #ffffff;
    margin-bottom: 6px;
  }
  .ts-header-meta {
    font-size: 12px;
    color: var(--ts-text-muted);
  }
  .ts-close {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: #fff;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  }
  .ts-close:hover {
    transform: translateY(-1px);
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.22);
  }

  .ts-body {
    flex: 1;
    overflow-y: auto;
    padding: 18px 18px 22px;
    background:
      radial-gradient(circle at bottom right, rgba(124, 92, 255, 0.08), transparent 26%);
  }
  .ts-body::-webkit-scrollbar { width: 8px; }
  .ts-body::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.22);
    border-radius: 999px;
  }

  .ts-hero-card,
  .ts-section,
  .ts-anim-row,
  .ts-recorder-row,
  .ts-svg-row,
  .ts-agent-phase,
  .ts-design-preview,
  .ts-insert-progress,
  .ts-insert-success,
  .ts-insert-guide,
  .ts-error {
    border-radius: var(--ts-radius-lg);
    border: 1px solid var(--ts-border);
    background: var(--ts-surface-soft);
    backdrop-filter: blur(16px);
  }

  .ts-hero-card {
    padding: 18px;
    margin-bottom: 14px;
    background:
      radial-gradient(circle at top left, rgba(244, 201, 93, 0.16), transparent 24%),
      linear-gradient(145deg, rgba(124, 92, 255, 0.16), rgba(9, 16, 29, 0.92));
    border-color: rgba(124, 92, 255, 0.34);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .ts-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    margin-bottom: 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    color: #d7defd;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .ts-hero-title {
    font-size: 20px;
    line-height: 1.08;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #fff;
    margin-bottom: 8px;
  }
  .ts-hero-text {
    font-size: 13px;
    color: var(--ts-text-muted);
    line-height: 1.65;
    margin-bottom: 14px;
  }
  .ts-hero-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .ts-metric {
    padding: 12px;
    border-radius: 16px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .ts-metric strong {
    display: block;
    font-size: 16px;
    line-height: 1;
    color: #fff;
    margin-bottom: 6px;
  }
  .ts-metric span {
    display: block;
    font-size: 11px;
    color: var(--ts-text-soft);
    line-height: 1.4;
  }

  .ts-section {
    padding: 16px;
    margin-bottom: 12px;
  }
  .ts-section-head {
    margin-bottom: 12px;
  }
  .ts-section-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #f8fbff;
    margin-bottom: 4px;
  }
  .ts-section-subtitle {
    font-size: 12px;
    color: var(--ts-text-soft);
    line-height: 1.55;
  }

  .ts-no-key {
    padding: 12px 0 6px;
  }
  .ts-empty-state {
    padding: 18px;
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
    border: 1px solid rgba(148, 163, 184, 0.14);
    text-align: left;
  }
  .ts-empty-state h3 {
    color: #fff;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 8px;
  }
  .ts-empty-state p {
    color: var(--ts-text-muted);
    font-size: 13px;
    line-height: 1.65;
    margin-bottom: 14px;
  }
  .ts-empty-actions {
    display: flex;
    gap: 10px;
  }
  .ts-empty-actions .ts-btn-open {
    flex: 1;
  }

  .ts-btn-open,
  .ts-template-btn,
  .ts-svg-btn,
  .ts-svg-copy,
  .ts-recorder-start,
  .ts-recorder-stop,
  .ts-recorder-copy,
  .ts-recorder-copy-steps,
  .ts-debug-toggle,
  .ts-action-btn,
  .ts-tab {
    appearance: none;
    border: 1px solid var(--ts-border);
    background: rgba(255,255,255,0.06);
    color: var(--ts-text);
    font-family: inherit;
    cursor: pointer;
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
  }
  .ts-btn-open,
  .ts-template-btn,
  .ts-svg-btn,
  .ts-svg-copy,
  .ts-recorder-start,
  .ts-recorder-stop,
  .ts-recorder-copy,
  .ts-recorder-copy-steps,
  .ts-action-btn {
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 700;
  }
  .ts-btn-open:hover,
  .ts-template-btn:hover,
  .ts-svg-btn:hover,
  .ts-svg-copy:hover,
  .ts-recorder-start:hover:not(:disabled),
  .ts-recorder-stop:hover:not(:disabled),
  .ts-recorder-copy:hover:not(:disabled),
  .ts-recorder-copy-steps:hover:not(:disabled),
  .ts-debug-toggle:hover,
  .ts-action-btn:hover,
  .ts-tab:hover {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.22);
    background: rgba(255,255,255,0.1);
  }
  .ts-btn-open {
    background: linear-gradient(135deg, var(--ts-primary), var(--ts-primary-2));
    border-color: rgba(155, 140, 255, 0.4);
    box-shadow: 0 12px 26px rgba(124, 92, 255, 0.26);
  }

  .ts-prompt-area {
    margin-bottom: 12px;
  }
  .ts-prompt-area textarea,
  .ts-svg-input {
    width: 100%;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(4, 10, 19, 0.6);
    color: var(--ts-text);
    font-family: inherit;
    outline: none;
    transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  }
  .ts-prompt-area textarea {
    min-height: 110px;
    padding: 14px 16px;
    font-size: 13px;
    line-height: 1.65;
    resize: vertical;
  }
  .ts-svg-input {
    padding: 10px 12px;
    font-size: 12px;
  }
  .ts-prompt-area textarea:focus,
  .ts-svg-input:focus {
    border-color: rgba(124, 92, 255, 0.65);
    box-shadow: 0 0 0 4px rgba(124, 92, 255, 0.14);
    background: rgba(7, 15, 27, 0.86);
  }
  .ts-prompt-area textarea::placeholder,
  .ts-svg-input::placeholder {
    color: #6f819f;
  }

  .ts-template-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .ts-template-status {
    font-size: 12px;
    color: var(--ts-text-muted);
  }
  .ts-template-set {
    color: #8ff0c5;
    font-weight: 700;
  }
  .ts-template-clear {
    margin-left: 8px;
    border: none;
    background: transparent;
    color: #b8c4ff;
    font-size: 11px;
    cursor: pointer;
    text-decoration: underline;
  }
  .ts-template-clear:hover {
    color: #ffffff;
  }

  .ts-mode-row {
    margin-bottom: 6px;
  }
  .ts-mode-label,
  .ts-anim-label {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    cursor: pointer;
  }
  .ts-mode-label {
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(148, 163, 184, 0.14);
    color: var(--ts-text-muted);
    font-size: 12px;
  }
  .ts-mode-label input[type="checkbox"],
  .ts-anim-label input[type="checkbox"] {
    accent-color: var(--ts-primary);
    width: 16px;
    height: 16px;
    margin-top: 1px;
  }

  .ts-anim-row {
    padding: 16px;
    margin-bottom: 12px;
  }
  .ts-anim-header {
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ts-anim-title {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
  }
  .ts-anim-presets {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ts-anim-preset {
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(255,255,255,0.06);
    color: var(--ts-text-muted);
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    transition: all 0.18s ease;
  }
  .ts-anim-preset:hover,
  .ts-anim-preset.active {
    background: linear-gradient(135deg, rgba(124,92,255,0.28), rgba(155,140,255,0.2));
    border-color: rgba(155, 140, 255, 0.44);
    color: #fff;
  }
  .ts-anim-group {
    padding: 12px 14px;
    margin-bottom: 10px;
    border-radius: 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(148, 163, 184, 0.12);
  }
  .ts-anim-group:last-child { margin-bottom: 0; }
  .ts-anim-group-title {
    display: block;
    margin-bottom: 10px;
    color: #dbe4ff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .ts-anim-checks {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .ts-anim-label {
    font-size: 12px;
    color: var(--ts-text-muted);
    line-height: 1.5;
  }

  .ts-recorder-row {
    margin-bottom: 12px;
    padding: 16px;
    background: linear-gradient(180deg, rgba(251, 146, 60, 0.08), rgba(255,255,255,0.03));
    border-color: rgba(251, 146, 60, 0.24);
  }
  .ts-recorder-title,
  .ts-svg-title {
    display: block;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .ts-recorder-btns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .ts-recorder-start { background: rgba(52, 211, 153, 0.12); border-color: rgba(52, 211, 153, 0.24); }
  .ts-recorder-stop { background: rgba(248, 113, 113, 0.12); border-color: rgba(248, 113, 113, 0.24); }
  .ts-recorder-copy { background: rgba(244, 201, 93, 0.12); border-color: rgba(244, 201, 93, 0.2); }
  .ts-recorder-copy-steps { background: rgba(96, 165, 250, 0.12); border-color: rgba(96, 165, 250, 0.24); }
  .ts-recorder-start:disabled,
  .ts-recorder-stop:disabled,
  .ts-recorder-copy:disabled,
  .ts-recorder-copy-steps:disabled,
  .ts-generate-btn:disabled,
  .ts-test-btn:disabled,
  .ts-svg-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .ts-svg-row {
    margin-bottom: 12px;
    padding: 16px;
    background: linear-gradient(180deg, rgba(124, 92, 255, 0.08), rgba(255,255,255,0.03));
    border-color: rgba(124, 92, 255, 0.24);
  }
  .ts-svg-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }
  .ts-svg-section:last-child { margin-bottom: 0; }
  .ts-svg-label {
    font-size: 11px;
    font-weight: 700;
    color: #c8d3ff;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .ts-svg-btn {
    align-self: flex-start;
  }
  .ts-svg-result {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(148, 163, 184, 0.16);
  }
  .ts-svg-preview {
    margin-bottom: 10px;
    border-radius: 16px;
    background: rgba(3, 8, 16, 0.62);
    border: 1px solid rgba(148, 163, 184, 0.14);
    overflow: auto;
    max-height: 190px;
  }

  .ts-generate-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }
  .ts-generate-btn,
  .ts-test-btn {
    width: 100%;
    min-height: 48px;
    border-radius: 16px;
    border: 1px solid transparent;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  }
  .ts-generate-btn {
    background: linear-gradient(135deg, var(--ts-primary), var(--ts-primary-2));
    color: #fff;
    box-shadow: 0 16px 34px rgba(124, 92, 255, 0.28);
  }
  .ts-generate-btn:hover {
    transform: translateY(-1px);
  }
  .ts-test-btn {
    background: rgba(244, 201, 93, 0.1);
    border-color: rgba(244, 201, 93, 0.22);
    color: #f7d87f;
  }
  .ts-test-btn:hover {
    transform: translateY(-1px);
    background: rgba(244, 201, 93, 0.16);
  }

  .ts-suggestions {
    margin-bottom: 14px;
  }
  .ts-suggestions p {
    margin-bottom: 8px;
    color: var(--ts-text-soft);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .ts-suggestion {
    display: block;
    width: 100%;
    margin-bottom: 6px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    background: rgba(255,255,255,0.04);
    color: var(--ts-text-muted);
    text-align: left;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .ts-suggestion:hover {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.08);
    color: #fff;
  }
  .ts-suggestion-kvai { border-color: rgba(124, 92, 255, 0.28); }
  .ts-suggestion-yandex { border-color: rgba(45, 127, 249, 0.28); }
  .ts-suggestion-svg { border-color: rgba(168, 85, 247, 0.28); }

  #ts-agent-log {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ts-agent-phase {
    padding: 14px;
    border-left: 3px solid rgba(124, 92, 255, 0.7);
  }
  .ts-agent-phase.done {
    border-left-color: rgba(52, 211, 153, 0.9);
  }
  .ts-agent-title {
    margin-bottom: 6px;
    color: #ffffff;
    font-size: 13px;
    font-weight: 700;
  }
  .ts-agent-status {
    color: var(--ts-text-muted);
    font-size: 12px;
    line-height: 1.55;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ts-design-preview {
    margin-top: 10px;
    padding: 12px;
    background: rgba(2, 7, 15, 0.44);
  }
  .ts-color-row {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .ts-color-dot {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.18);
  }
  .ts-plan-blocks {
    color: var(--ts-text-soft);
    font-size: 11px;
    line-height: 1.55;
    word-break: break-word;
  }

  .ts-result {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(148, 163, 184, 0.12);
  }
  .ts-result-header,
  .ts-actions {
    display: flex;
    gap: 8px;
  }
  .ts-result-header { margin-bottom: 12px; }
  .ts-tab {
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    color: var(--ts-text-soft);
  }
  .ts-tab.active {
    background: linear-gradient(135deg, rgba(124,92,255,0.28), rgba(155,140,255,0.18));
    border-color: rgba(155, 140, 255, 0.4);
    color: #fff;
  }
  .ts-preview,
  .ts-code {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.12);
  }
  .ts-preview {
    background: rgba(255,255,255,0.04);
  }
  .ts-preview iframe {
    width: 100%;
    height: 300px;
    border: none;
    background: #fff;
  }
  .ts-code {
    padding: 14px;
    background: #020817;
    max-height: 300px;
    overflow: auto;
  }
  .ts-code pre,
  .ts-debug-log {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 11px;
    line-height: 1.6;
  }
  .ts-code pre {
    color: #d8e1ff;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .ts-action-btn {
    flex: 1;
    justify-content: center;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ts-btn-copy {
    color: var(--ts-text-muted);
  }
  .ts-btn-copy.copied {
    background: rgba(52, 211, 153, 0.12);
    border-color: rgba(52, 211, 153, 0.24);
    color: #b8f6df;
  }
  .ts-btn-insert {
    background: linear-gradient(135deg, var(--ts-primary), #5b4ad6);
    border-color: rgba(124, 92, 255, 0.35);
    color: #fff;
  }

  .ts-insert-progress,
  .ts-insert-success,
  .ts-insert-guide,
  .ts-error {
    margin-top: 10px;
    padding: 12px 14px;
    font-size: 12px;
    line-height: 1.6;
  }
  .ts-insert-progress,
  .ts-insert-guide {
    color: #c9d7ff;
    border-color: rgba(96, 165, 250, 0.22);
  }
  .ts-insert-success {
    color: #b8f6df;
    border-color: rgba(52, 211, 153, 0.24);
  }
  .ts-error {
    color: #fecaca;
    border-color: rgba(248, 113, 113, 0.24);
    background: rgba(127, 29, 29, 0.22);
  }

  .ts-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 22px;
    color: var(--ts-text-muted);
    font-size: 13px;
  }
  .ts-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(148, 163, 184, 0.16);
    border-top-color: var(--ts-primary-2);
    border-radius: 999px;
    animation: ts-spin 0.7s linear infinite;
  }
  @keyframes ts-spin {
    to { transform: rotate(360deg); }
  }

  .ts-debug-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(148, 163, 184, 0.12);
  }
  .ts-debug-toggle {
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 700;
    color: var(--ts-text-muted);
  }
  .ts-debug-log {
    margin-top: 10px;
    max-height: 210px;
    overflow-y: auto;
    padding: 12px;
    border-radius: 16px;
    background: #020817;
    border: 1px solid rgba(148, 163, 184, 0.12);
    color: #d8e1ff;
  }

  @media (max-height: 860px) {
    .ts-panel {
      max-height: calc(100vh - 108px);
    }
    .ts-hero-metrics {
      grid-template-columns: 1fr;
    }
  }
`;
