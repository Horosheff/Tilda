export const PANEL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .ts-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: white;
    border: none;
    cursor: pointer;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(79,70,229,0.4);
    transition: all 0.3s ease;
    z-index: 2147483647;
  }
  .ts-fab:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 28px rgba(79,70,229,0.5);
  }
  .ts-fab.active {
    transform: rotate(45deg) scale(1.1);
    background: #ef4444;
  }

  .ts-panel {
    position: fixed;
    bottom: 92px;
    right: 24px;
    width: 400px;
    max-height: calc(100vh - 120px);
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
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
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: white;
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
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: ts-spin 0.6s linear infinite;
  }
  @keyframes ts-spin {
    to { transform: rotate(360deg); }
  }
`;
