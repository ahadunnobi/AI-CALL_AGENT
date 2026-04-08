import { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, Trash2, Settings, Radio, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    // Connect to SSE endpoint
    const backendUrl = 'http://localhost:8000';
    const eventSource = new EventSource(`${backendUrl}/logs`);

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('Connected to log stream');
    };

    eventSource.onmessage = (event) => {
      const newLog = event.data;
      setLogs((prev) => [...prev.slice(-199), newLog]);
    };

    eventSource.onerror = (err) => {
      setIsConnected(false);
      console.error('SSE Error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearLogs = () => setLogs([]);

  const formatLog = (logString) => {
    const levelMatch = logString.match(/\s(INFO|WARNING|ERROR|DEBUG)\s/);
    const level = levelMatch ? levelMatch[1] : 'INFO';
    return { level, content: logString };
  };

  return (
    <div className="dashboard">
      <header>
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
          <div style={{ background: 'var(--accent-color)', padding: '0.6rem', borderRadius: '12px', boxShadow: '0 0 15px rgba(88, 166, 255, 0.3)' }}>
            <Activity color="white" size={24} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1>AURA Dashboard</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>MOBILE ACTIVITY MONITOR</span>
          </div>
        </motion.div>

        <div className="status-badge">
          <div className={`status-dot ${isConnected ? 'status-online' : 'status-offline'}`} />
          <span>{isConnected ? 'System Online' : 'Connecting to Core…'}</span>
        </div>
      </header>

      <main>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="log-container"
        >
          <div className="log-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)' }}>
              <Terminal size={18} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em' }}>LIVE AGENT STREAM</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="secondary" onClick={clearLogs} style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}>
                <Trash2 size={14} /> Clear
              </button>
            </div>
          </div>

          <div className="log-list">
            <AnimatePresence initial={false}>
              {logs.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.5, flexDirection: 'column', gap: '1rem' }}>
                  <Sparkles size={32} />
                  <span>Waiting for system activity...</span>
                </div>
              ) : (
                logs.map((log, index) => {
                  const { level, content } = formatLog(log);
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`log-entry log-${level}`}
                    >
                      {content}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>
        </motion.div>

        <div className="controls">
          <button onClick={() => window.open('http://localhost:8000/docs', '_blank')} className="secondary">
            <Settings size={18} />
            API Core Settings
          </button>
          <button onClick={() => alert('Simulator trigger coming soon!')}>
            <Radio size={18} />
            Start Call Simulation
          </button>
        </div>
      </main>

      <footer style={{ marginTop: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
        AURA Mobile-First AI • Powered by llama.rn & FastAPI
      </footer>
    </div>
  );
}

export default App;
