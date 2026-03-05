export const PANEL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .ts-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #694be8, #8167f0);
    color: white;
    border: 3px solid #e9cc57;
    cursor: pointer;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(105,75,232,0.4);
    transition: all 0.3s ease;
    z-index: 2147483647;
  }
  .ts-fab:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 28px rgba(105,75,232,0.5);
  }
  .ts-fab.active {
    transform: rotate(45deg) scale(1.1);
    background: #ef4444;
    border-color: #ef4444;
  }

  .ts-panel {
    position: fixed;
    bottom: 92px;
    right: 24px;
    width: 400px;
    max-height: calc(100vh - 120px);
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.15), 0 0 0 2px rgba(105,75,232,0.2);
    z-index: 2147483646;
    display: none;
    flex-direction: column;
    overflow: hidden;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #1e293b;
    font-size: 14px;
    line-height: 1.5;
    animation: ts-slide-up 0.25s ease;
  }
  .ts-panel.open { display: flex; }

  @keyframes ts-slide-up {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .ts-header {
    padding: 16px 20px;
    background: linear-gradient(135deg, #694be8, #8167f0);
    color: white;
    border-bottom: 3px solid #e9cc57;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .ts-header h2 {
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ts-close {
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }
  .ts-close:hover { background: rgba(255,255,255,0.3); }

  .ts-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }
  .ts-body::-webkit-scrollbar { width: 5px; }
  .ts-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

  .ts-no-key {
    text-align: center;
    padding: 20px 0;
  }
  .ts-no-key p {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 12px;
  }
  .ts-no-key .ts-btn-open {
    display: inline-block;
    padding: 8px 20px;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .ts-no-key .ts-btn-open:hover { background: #4338ca; }

  .ts-prompt-area {
    margin-bottom: 12px;
  }
  .ts-prompt-area textarea {
    width: 100%;
    min-height: 80px;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s;
    color: #1e293b;
    line-height: 1.5;
  }
  .ts-prompt-area textarea:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
  }
  .ts-prompt-area textarea::placeholder { color: #94a3b8; }

  .ts-template-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .ts-template-btn {
    padding: 6px 10px;
    font-size: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #f8fafc;
    color: #475569;
    cursor: pointer;
  }
  .ts-template-btn:hover { background: #f1f5f9; color: #334155; }
  .ts-template-status { font-size: 12px; color: #64748b; }
  .ts-template-set { color: #166534; }
  .ts-template-clear {
    margin-left: 6px;
    padding: 2px 6px;
    font-size: 11px;
    border: none;
    background: transparent;
    color: #6366f1;
    cursor: pointer;
    text-decoration: underline;
  }
  .ts-template-clear:hover { color: #4f46e5; }

  .ts-mode-row {
    margin-bottom: 12px;
  }
  .ts-mode-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #475569;
    cursor: pointer;
  }
  .ts-mode-label input[type="checkbox"] {
    accent-color: #694be8;
    width: 16px;
    height: 16px;
  }

  .ts-anim-header {
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid #bae6fd;
  }
  .ts-anim-header-title {
    font-size: 12px;
    font-weight: 600;
    color: #0369a1;
    margin-bottom: 8px;
  }
  .ts-anim-presets {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .ts-anim-preset {
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 500;
    color: #0369a1;
    background: #e0f2fe;
    border: 1px solid #7dd3fc;
    border-radius: 6px;
    cursor: pointer;
    transition: background .2s, border-color .2s;
  }
  .ts-anim-preset:hover {
    background: #bae6fd;
  }
  .ts-anim-preset.active {
    background: #0284c7;
    color: #fff;
    border-color: #0284c7;
  }
  .ts-anim-group {
    margin-bottom: 12px;
    padding: 10px 12px;
    background: #f0f9ff;
    border: 1px solid #7dd3fc;
    border-radius: 8px;
  }
  .ts-anim-group-title {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #0c4a6e;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 8px;
  }
  .ts-anim-row {
    margin-bottom: 12px;
    padding: 10px 12px;
    background: #f0f9ff;
    border: 1px solid #7dd3fc;
    border-radius: 8px;
  }
  .ts-anim-title {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #0369a1;
    margin-bottom: 8px;
  }
  .ts-anim-checks {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 16px;
  }
  .ts-anim-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #0c4a6e;
    cursor: pointer;
  }
  .ts-anim-label input[type="checkbox"] {
    accent-color: #0284c7;
    width: 14px;
    height: 14px;
  }

  .ts-svg-row {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 12px;
    padding: 12px 14px;
    background: linear-gradient(135deg, #f5f3ff, #faf5ff);
    border: 1px solid #c4b5fd;
    border-radius: 8px;
  }
  .ts-svg-title {
    font-size: 12px;
    font-weight: 600;
    color: #6d28d9;
    margin-bottom: 4px;
  }
  .ts-svg-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ts-svg-label {
    font-size: 11px;
    font-weight: 500;
    color: #7c3aed;
  }
  .ts-svg-input {
    padding: 8px 10px;
    font-size: 12px;
    border: 1px solid #c4b5fd;
    border-radius: 6px;
    background: #fff;
  }
  .ts-svg-btn {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    color: #6d28d9;
    background: #ede9fe;
    border: 1px solid #c4b5fd;
    border-radius: 6px;
    cursor: pointer;
    align-self: flex-start;
  }
  .ts-svg-btn:hover { background: #ddd6fe; }
  .ts-svg-result {
    margin-top: 8px;
    padding-top: 10px;
    border-top: 1px solid #c4b5fd;
  }
  .ts-svg-preview {
    margin-bottom: 8px;
    overflow: auto;
    max-height: 180px;
  }
  .ts-svg-copy {
    padding: 6px 12px;
    font-size: 11px;
    background: #6d28d9;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  .ts-svg-copy:hover { background: #5b21b6; }

  .ts-recorder-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 10px;
    padding: 10px 12px;
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 8px;
  }
  .ts-recorder-title {
    font-size: 13px;
    font-weight: 600;
    color: #92400e;
  }
  .ts-recorder-btns {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .ts-recorder-start, .ts-recorder-stop, .ts-recorder-copy, .ts-recorder-copy-steps {
    padding: 6px 10px;
    font-size: 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  .ts-recorder-start {
    background: #22c55e;
    color: white;
  }
  .ts-recorder-start:hover:not(:disabled) { background: #16a34a; }
  .ts-recorder-stop {
    background: #ef4444;
    color: white;
  }
  .ts-recorder-stop:hover:not(:disabled) { background: #dc2626; }
  .ts-recorder-copy {
    background: #f59e0b;
    color: white;
  }
  .ts-recorder-copy:hover:not(:disabled) { background: #d97706; }
  .ts-recorder-copy-steps { background: #0891b2; }
  .ts-recorder-copy-steps:hover:not(:disabled) { background: #0e7490; }
  .ts-recorder-start:disabled, .ts-recorder-stop:disabled, .ts-recorder-copy:disabled, .ts-recorder-copy-steps:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ts-generate-btn {
    width: 100%;
    padding: 10px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .ts-generate-btn:hover { opacity: 0.9; }
  .ts-generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .ts-suggestions {
    margin-top: 12px;
  }
  .ts-suggestions p {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .ts-suggestion {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 12px;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 4px;
    font-family: inherit;
  }
  .ts-suggestion:hover {
    background: #eef2ff;
    border-color: #c7d2fe;
    color: #4338ca;
  }

  .ts-suggestion-kvai {
    background: linear-gradient(135deg, #f3f0ff, #ffffff);
    border-color: #694be8;
    color: #694be8;
    font-weight: 600;
  }
  .ts-suggestion-kvai:hover {
    background: linear-gradient(135deg, #694be8, #8167f0) !important;
    color: white !important;
    border-color: #694be8 !important;
  }

  .ts-suggestion-yandex {
    background: linear-gradient(135deg, #f0f7ff, #ffffff);
    border-color: #2D7FF9;
    color: #1a5bb5;
    font-weight: 600;
  }
  .ts-suggestion-yandex:hover {
    background: linear-gradient(135deg, #2D7FF9, #4d94ff) !important;
    color: white !important;
    border-color: #2D7FF9 !important;
  }

  .ts-suggestion-svg {
    background: linear-gradient(135deg, #f5f3ff, #faf5ff);
    border-color: #8b5cf6;
    color: #6d28d9;
    font-weight: 600;
  }
  .ts-suggestion-svg:hover {
    background: linear-gradient(135deg, #8b5cf6, #a78bfa) !important;
    color: white !important;
    border-color: #8b5cf6 !important;
  }

  .ts-result {
    margin-top: 16px;
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
  }
  .ts-result-header {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
  }
  .ts-tab {
    padding: 6px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .ts-tab.active {
    background: #4f46e5;
    color: white;
    border-color: #4f46e5;
  }

  .ts-preview {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    background: white;
  }
  .ts-preview iframe {
    width: 100%;
    height: 300px;
    border: none;
  }

  .ts-code {
    background: #1e293b;
    border-radius: 10px;
    padding: 12px;
    overflow-x: auto;
    max-height: 300px;
    overflow-y: auto;
  }
  .ts-code pre {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 11px;
    color: #e2e8f0;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.6;
  }

  .ts-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  .ts-action-btn {
    flex: 1;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: inherit;
  }
  .ts-btn-copy {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #475569;
  }
  .ts-btn-copy:hover { background: #f1f5f9; }
  .ts-btn-copy.copied {
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #166534;
  }
  .ts-btn-insert {
    background: #4f46e5;
    border: none;
    color: white;
  }
  .ts-btn-insert:hover { background: #4338ca; }

  .ts-mode-toggle {
    margin-top: 8px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
  }
  .ts-mode-toggle label {
    font-size: 12px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  .ts-mode-toggle input[type="checkbox"] {
    accent-color: #4f46e5;
    width: 16px;
    height: 16px;
  }

  .ts-insert-progress {
    margin-top: 10px;
    padding: 10px 14px;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
    border-radius: 8px;
    color: #3730a3;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ts-insert-success {
    margin-top: 10px;
    padding: 10px 14px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    color: #166534;
    font-size: 12px;
    line-height: 1.5;
  }
  .ts-insert-guide {
    margin-top: 10px;
    padding: 10px 14px;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
    border-radius: 8px;
    color: #3730a3;
    font-size: 12px;
    line-height: 1.6;
  }

  .ts-error {
    margin-top: 12px;
    padding: 10px 14px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #991b1b;
    font-size: 12px;
  }

  .ts-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
    color: #64748b;
    font-size: 13px;
  }
  .ts-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top-color: #694be8;
    border-radius: 50%;
    animation: ts-spin 0.6s linear infinite;
  }
  @keyframes ts-spin {
    to { transform: rotate(360deg); }
  }

  #ts-agent-log {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ts-agent-phase {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #694be8;
    border-radius: 8px;
    padding: 12px;
  }
  .ts-agent-title {
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ts-agent-status {
    font-size: 12px;
    color: #475569;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ts-agent-success {
    color: #166534;
    font-weight: 500;
    margin-top: 4px;
    display: block;
  }
  .ts-agent-error {
    color: #dc2626;
    font-weight: 500;
    margin-top: 4px;
    display: block;
  }
  .ts-design-preview {
    margin-top: 8px;
    padding: 8px;
    background: #ffffff;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }
  .ts-color-row {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }
  .ts-color-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid rgba(0,0,0,0.1);
  }
  .ts-plan-blocks {
    font-size: 11px;
    color: #475569;
    word-break: break-word;
  }
  .ts-agent-phase.done {
    border-left-color: #22c55e;
  }

  .ts-debug-section {
    margin-top: 16px;
    border-top: 1px dashed #e2e8f0;
    padding-top: 12px;
  }
  .ts-debug-toggle {
    background: none;
    border: none;
    color: #64748b;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
  }
  .ts-debug-toggle:hover {
    color: #1e293b;
  }
  .ts-debug-log {
    margin-top: 8px;
    background: #1e293b;
    color: #e2e8f0;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 11px;
    padding: 10px;
    border-radius: 6px;
    max-height: 200px;
    overflow-y: auto;
    line-height: 1.5;
  }
`;
