import { useState, useEffect, useRef } from 'react'
import './App.css'
import Background3D from './Background3D'
import { io } from 'socket.io-client'
import { 
  Cloud, Droplet, BarChart2, Activity, Settings, HelpCircle, 
  Globe, Mic, AlertTriangle, Sun,
  Waves, LayoutDashboard, User, History, Sprout, Thermometer,
  Wifi, WifiOff
} from 'lucide-react'

// ============================================================
// BACKEND URL — change this ONE LINE when you deploy
// ============================================================
const BASE_URL = 'http://localhost:5000'

// ============================================================
// API FUNCTIONS
// ============================================================
const fetchDashboardSummary    = () => fetch(`${BASE_URL}/api/plant/summary`).then(r => r.json())
const fetchHealthScore         = () => fetch(`${BASE_URL}/api/plant/health`).then(r => r.json())
const fetchConditions          = () => fetch(`${BASE_URL}/api/plant/conditions`).then(r => r.json())
const fetchPlantClassification = () => fetch(`${BASE_URL}/api/plant/classify`).then(r => r.json())
const fetchAlerts              = () => fetch(`${BASE_URL}/api/plant/alerts`).then(r => r.json())
const fetchRecommendations     = () => fetch(`${BASE_URL}/api/plant/recommendations`).then(r => r.json())
const fetchTrends              = (hours = 24) => fetch(`${BASE_URL}/api/plant/trends?hours=${hours}`).then(r => r.json())
const fetchPlantTypes          = () => fetch(`${BASE_URL}/api/plant/types`).then(r => r.json())

const sendCommand      = (command, value = 0) => fetch(`${BASE_URL}/api/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command, value }) }).then(r => r.json())
const sendPumpOn       = () => sendCommand('pump_on')
const sendPumpOff      = () => sendCommand('pump_off')
const sendServoAngle   = (angle) => sendCommand('servo', angle)
const enableManualMode = () => sendCommand('manual_on')
const enableAutoMode   = () => sendCommand('manual_off')

// ============================================================
// SENSOR RING
// ============================================================
const SensorRing = ({ value, max, label, unit, subtext, status }) => {
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const safeValue = isNaN(value) || value === null ? 0 : value
  const strokeDashoffset = circumference - (safeValue / max) * circumference
  const statusColor = status === 'optimal' ? '#388e3c' : status === 'warning' ? '#f57c00' : status === 'critical' ? '#e53935' : 'var(--accent-color)'
  return (
    <div className="sensor-card glass-panel">
      <div className="ring-container">
        <svg className="ring-svg">
          <circle className="ring-bg" cx="60" cy="60" r={radius} />
          <circle className="ring-fill" cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ stroke: statusColor }} />
        </svg>
        <div className="ring-text">
          <span className="ring-val">{value !== null && value !== undefined ? Number(value).toFixed(1) : '--'}</span>
          <span className="ring-unit">{unit}</span>
        </div>
      </div>
      <h4 className="sensor-title">{label}</h4>
      <p className="sensor-desc" style={{ color: statusColor }}>{subtext || (status ? status.toUpperCase() : 'WAITING...')}</p>
    </div>
  )
}

// ============================================================
// APP
// ============================================================
function App() {
  const [lang, setLang] = useState('ENGLISH')
  const [activeTab, setActiveTab] = useState('Atmosphere')
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  const [data, setData] = useState({ soilMoisture: null, temperature: null, humidity: null, irrigationMode: 'AUTO', surfaceMode: 'AUTO' })
  const [conditions, setConditions] = useState({})
  const [health, setHealth] = useState({ score: null, label: '...', color: 'gray', grade: '-' })
  const [plantMatch, setPlantMatch] = useState([])
  const [alerts, setAlerts] = useState([])
  const [trends, setTrends] = useState(null)
  const [isIrrigating, setIsIrrigating] = useState(false)
  const [isSurfaceOpen, setIsSurfaceOpen] = useState(false)
  const [logs, setLogs] = useState([])

  useEffect(() => {
    loadDashboard()
    loadHistory()

    const socket = io(BASE_URL)
    socketRef.current = socket
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('sensor_update', (reading) => {
      setData(prev => ({ ...prev, soilMoisture: reading.soil_moisture_percent, temperature: reading.temperature, humidity: reading.humidity }))
      setIsIrrigating(reading.pump_on)
      setIsSurfaceOpen(reading.servo_angle > 45)
      loadAnalysis()
    })
    socket.on('command_queued', (cmd) => addLog('info', `Command: ${cmd.command}`, `Value: ${cmd.value}`, new Date().toLocaleTimeString()))
    return () => socket.disconnect()
  }, [])

  const loadDashboard = async () => {
    try {
      const summary = await fetchDashboardSummary()
      if (summary.latest_reading) {
        const r = summary.latest_reading
        setData(prev => ({ ...prev, soilMoisture: r.soil_moisture_percent, temperature: r.temperature, humidity: r.humidity }))
        setIsIrrigating(r.pump_on)
        setIsSurfaceOpen(r.servo_angle > 45)
      }
      if (summary.health)      setHealth(summary.health)
      if (summary.conditions)  setConditions(summary.conditions)
      if (summary.plant_match) setPlantMatch(summary.plant_match)
      if (summary.alerts)      setAlerts(summary.alerts)
    } catch (e) { console.log('Backend not reachable yet') }
  }

  const loadAnalysis = async () => {
    try {
      const [h, c, p, a] = await Promise.all([fetchHealthScore(), fetchConditions(), fetchPlantClassification(), fetchAlerts()])
      setHealth(h); setConditions(c); setPlantMatch(p); setAlerts(a)
    } catch (e) {}
  }

  const loadHistory = async () => {
    try {
      const t = await fetchTrends(24)
      setTrends(t)
      if (t.chart_data) {
        const pumpLogs = t.chart_data.filter(d => d.pump_on).slice(-5).map((d, i) => ({
          id: i, type: 'irrigate', title: 'Auto-Irrigation triggered',
          desc: `Soil triggered pump. Temp: ${d.temperature}°C`,
          time: new Date(d.timestamp).toLocaleTimeString(),
          color: '#388e3c', icon: <Waves size={14} />
        }))
        if (pumpLogs.length > 0) setLogs(pumpLogs)
      }
    } catch (e) {}
  }

  const addLog = (type, title, desc, time) => {
    setLogs(prev => [{ id: Date.now(), type, title, desc, time, color: type === 'irrigate' ? '#388e3c' : '#1976d2', icon: type === 'irrigate' ? <Droplet size={14} /> : <Activity size={14} /> }, ...prev].slice(0, 20))
  }

  const handlePumpOn = async () => { await sendPumpOn(); setIsIrrigating(true); addLog('irrigate', 'Manual Pump ON', 'Triggered from dashboard.', new Date().toLocaleTimeString()); setTimeout(() => setIsIrrigating(false), 5000) }
  const handlePumpOff = async () => { await sendPumpOff(); setIsIrrigating(false); addLog('info', 'Pump OFF', 'Manual stop.', new Date().toLocaleTimeString()) }
  const handleServo = async (angle) => { await sendServoAngle(angle); setIsSurfaceOpen(angle > 45); addLog('info', `Shade ${angle > 45 ? 'opened' : 'closed'}`, `Servo → ${angle}°`, new Date().toLocaleTimeString()) }
  const handleIrrigationMode = async (mode) => { setData(d => ({ ...d, irrigationMode: mode })); mode === 'MANUAL' ? await enableManualMode() : await enableAutoMode() }

  const languages = ['ENGLISH', 'हिन्दी', 'தமிழ்', 'తెలుగు', 'ಕನ್ನಡ']
  const healthColor = health.color === 'green' ? '#388e3c' : health.color === 'yellow' ? '#f9a825' : health.color === 'orange' ? '#f57c00' : '#e53935'

  return (
    <>
      <Background3D activeTab={activeTab} isIrrigating={isIrrigating} isSurfaceOpen={isSurfaceOpen} />
      <div className="app-wrapper">

        <aside className="sidebar">
          <div className="brand">Greenhouse AI</div>
          <div className="user-profile">
            <div className="avatar"><User size={24} /></div>
            <div className="user-info"><h4>Lead Scientist</h4><p>SECTOR 7G</p></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.75rem', color: connected ? '#388e3c' : '#e53935' }}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? 'ESP8266 LIVE' : 'WAITING FOR ESP...'}
          </div>

          {health.score !== null && (
            <div style={{ margin: '0.5rem 1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: healthColor }}>{health.score}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>HEALTH SCORE</div>
              <div style={{ fontSize: '0.85rem', color: healthColor }}>{health.label}</div>
            </div>
          )}

          <nav className="nav-links">
            {['Atmosphere', 'Hydration', 'Growth Log', 'History'].map(tab => (
              <div key={tab} className={`nav-link ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'Atmosphere' && <Cloud size={18} />}
                {tab === 'Hydration' && <Droplet size={18} />}
                {tab === 'Growth Log' && <BarChart2 size={18} />}
                {tab === 'History' && <History size={18} />}
                {tab}
              </div>
            ))}
          </nav>

          <div className="bottom-actions">
            <button className="btn-override" onClick={loadDashboard}>Refresh Data</button>
            <div className="nav-link" style={{ marginTop: '1rem' }}><Settings size={18} /> Settings</div>
            <div className="nav-link"><HelpCircle size={18} /> Support</div>
          </div>
        </aside>

        <main className="main-content">
          <header className="top-bar">
            <div className="nav-tabs">
              {['Atmosphere', 'Hydration', 'Growth Log', 'History'].map(tab => (
                <div key={tab} className={`nav-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
              ))}
            </div>
            <div className="language-toggle">
              {languages.map(l => (<span key={l} className={`lang-option ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>{l}</span>))}
              <div className="lang-icon" style={{ marginLeft: '0.5rem' }}><Globe size={16} /></div>
              <div className="lang-icon"><Mic size={16} /></div>
            </div>
          </header>

          <div className="content-area-scrollable">

            {/* ATMOSPHERE */}
            {activeTab === 'Atmosphere' && (
              <div className="dashboard-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ color: 'var(--accent-color)', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '1rem', letterSpacing: '1px' }}><Activity size={18} /> LIVE SENSOR ARRAY</h4>
                    <span style={{ color: connected ? '#388e3c' : 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '1px' }}>{connected ? '● LIVE FEED' : '○ CONNECTING...'}</span>
                  </div>

                  {alerts.filter(a => a.severity === 'critical').map(a => (
                    <div key={a.id} style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid #e53935', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', color: '#e53935', fontSize: '0.85rem' }}>
                      <AlertTriangle size={16} /> <strong>{a.title}:</strong> {a.message}
                    </div>
                  ))}

                  <div className="sensors-grid">
                    <SensorRing value={data.soilMoisture} max={100} label="Soil Moisture" unit="%" subtext={conditions.soil_moisture?.label} status={conditions.soil_moisture?.status} />
                    <SensorRing value={data.temperature} max={50} label="Ambient Temp" unit="°C" subtext={conditions.temperature?.label} status={conditions.temperature?.status} />
                    <SensorRing value={data.humidity} max={100} label="Humidity" unit="RH %" subtext={conditions.humidity?.label} status={conditions.humidity?.status} />
                  </div>

                  <div className="control-layer">
                    <div className="glass-panel control-card">
                      <div className="control-header">
                        <div><h3>Irrigation Module</h3><p>Water Pump Control</p></div>
                        <div className="icon-wrap"><Waves size={20} /></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>MODE</span>
                        <div className="mode-toggle" style={{ margin: 0, flex: 1 }}>
                          <div className={`mode-btn ${data.irrigationMode === 'MANUAL' ? 'active' : ''}`} onClick={() => handleIrrigationMode('MANUAL')}>MANUAL</div>
                          <div className={`mode-btn ${data.irrigationMode === 'AUTO' ? 'active' : ''}`} onClick={() => handleIrrigationMode('AUTO')}>AUTO</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="action-btn primary" style={{ flex: 1 }} onClick={handlePumpOn}><Droplet size={18} /> {isIrrigating ? 'IRRIGATING...' : 'PUMP ON'}</button>
                        <button className="action-btn secondary" style={{ flex: 1 }} onClick={handlePumpOff}>PUMP OFF</button>
                      </div>
                    </div>

                    <div className="glass-panel control-card">
                      <div className="control-header">
                        <div><h3>Surface Control</h3><p>Shade & SG90 Servo</p></div>
                        <div className="icon-wrap"><LayoutDashboard size={20} /></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>MODE</span>
                        <div className="mode-toggle" style={{ margin: 0, flex: 1 }}>
                          <div className={`mode-btn ${data.surfaceMode === 'MANUAL' ? 'active' : ''}`} onClick={() => setData(d => ({ ...d, surfaceMode: 'MANUAL' }))}>MANUAL</div>
                          <div className={`mode-btn ${data.surfaceMode === 'AUTO' ? 'active' : ''}`} onClick={() => setData(d => ({ ...d, surfaceMode: 'AUTO' }))}>AUTO</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="action-btn secondary" style={{ flex: 1, ...(isSurfaceOpen ? { background: 'var(--accent-color)', color: '#fff' } : {}) }} onClick={() => handleServo(90)}>OPEN</button>
                        <button className="action-btn secondary" style={{ flex: 1, ...(!isSurfaceOpen ? { background: 'var(--accent-color)', color: '#fff' } : {}) }} onClick={() => handleServo(0)}>CLOSE</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1rem' }}>Hardware Node Status</h3>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {[
                      { k: 'ESP8266', v: connected ? 'ONLINE' : 'OFFLINE', color: connected ? 'var(--accent-color)' : 'var(--danger)' },
                      { k: 'DHT11 Temp', v: data.temperature !== null ? `${data.temperature}°C` : '—', color: data.temperature !== null ? 'var(--accent-color)' : 'var(--text-muted)' },
                      { k: 'Soil Moisture', v: data.soilMoisture !== null ? `${data.soilMoisture}%` : '—', color: data.soilMoisture !== null ? 'var(--accent-color)' : 'var(--text-muted)' },
                      { k: 'Humidity', v: data.humidity !== null ? `${data.humidity}%` : '—', color: data.humidity !== null ? 'var(--accent-color)' : 'var(--text-muted)' },
                      { k: 'Water Pump', v: isIrrigating ? 'ACTIVE' : 'IDLE', color: isIrrigating ? 'var(--accent-color)' : 'var(--text-muted)' },
                      { k: 'SG90 Servo', v: isSurfaceOpen ? 'OPEN (90°)' : 'CLOSED (0°)', color: 'var(--text-main)' },
                    ].map(row => (
                      <div key={row.k} className="hw-status-row">
                        <span className="hw-status-key">{row.k}</span>
                        <span className="hw-status-val" style={{ color: row.color }}>{row.v}</span>
                      </div>
                    ))}
                  </div>
                  {alerts.length > 0 && (
                    <>
                      <h4 style={{ color: 'var(--accent-color)', fontSize: '0.85rem', letterSpacing: '1px' }}>ACTIVE ALERTS</h4>
                      {alerts.map(a => (
                        <div key={a.id} style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', background: a.severity === 'critical' ? 'rgba(229,57,53,0.12)' : a.severity === 'warning' ? 'rgba(245,124,0,0.12)' : 'rgba(25,118,210,0.12)', color: a.severity === 'critical' ? '#e53935' : a.severity === 'warning' ? '#f57c00' : '#1976d2', borderLeft: `3px solid ${a.severity === 'critical' ? '#e53935' : a.severity === 'warning' ? '#f57c00' : '#1976d2'}` }}>
                          <strong>{a.title}</strong><br />{a.message}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* HYDRATION — real plant classification */}
            {activeTab === 'Hydration' && (
              <div className="glass-panel content-block">
                <h2><Sprout style={{ display: 'inline', verticalAlign: 'middle' }} /> Plant Type Classifier</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Based on your current sensor readings — which plant category fits your environment best.</p>
                <div className="block-list">
                  {plantMatch.length === 0 && <div className="data-card" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)' }}>Waiting for sensor data from ESP8266...</div>}
                  {plantMatch.map(p => (
                    <div key={p.type} className="data-card" style={{ border: p.is_best_match ? '1.5px solid var(--accent-color)' : undefined }}>
                      {p.is_best_match && <div style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '1px' }}>★ BEST MATCH</div>}
                      <h3>{p.label}</h3>
                      <p>{p.description}</p>
                      <div style={{ margin: '0.75rem 0', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', height: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${p.score}%`, height: '100%', background: p.score > 70 ? '#388e3c' : p.score > 40 ? '#f57c00' : '#e53935', borderRadius: '20px', transition: 'width 0.5s' }} />
                      </div>
                      <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{p.score}% match</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Temp: {p.ranges.temperature.min}–{p.ranges.temperature.max}°C | Soil: {p.ranges.soil_moisture.min}–{p.ranges.soil_moisture.max}% | Humidity: {p.ranges.humidity.min}–{p.ranges.humidity.max}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GROWTH LOG — real trends */}
            {activeTab === 'Growth Log' && (
              <div className="glass-panel content-block">
                <h2><Thermometer style={{ display: 'inline', verticalAlign: 'middle' }} /> 24hr Sensor Trends</h2>
                <div className="block-list">
                  <div className="data-card" style={{ gridColumn: '1 / -1', minHeight: '130px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1.5rem', background: 'rgba(255,255,255,0.6)', borderColor: 'var(--glass-border)' }}>
                    <div style={{ textAlign: 'center' }}><div className="stat-number" style={{ color: 'var(--accent-color)' }}>{trends?.averages?.temperature ?? '--'}°C</div><div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '4px' }}>Avg Temperature</div></div>
                    <div style={{ textAlign: 'center' }}><div className="stat-number" style={{ color: 'var(--blue)' }}>{trends?.averages?.humidity ?? '--'}%</div><div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '4px' }}>Avg Humidity</div></div>
                    <div style={{ textAlign: 'center' }}><div className="stat-number" style={{ color: '#2d8c47' }}>{trends?.averages?.soil_moisture ?? '--'}%</div><div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '4px' }}>Avg Soil Moisture</div></div>
                    <div style={{ textAlign: 'center' }}><div className="stat-number" style={{ color: '#e65100' }}>{trends?.pump_events ?? '--'}</div><div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '4px' }}>Pump Events (24hr)</div></div>
                  </div>
                  <div className="data-card"><h3>Temperature Range</h3><p>Min: {trends?.peaks?.min_temp ?? '--'}°C</p><p>Max: {trends?.peaks?.max_temp ?? '--'}°C</p></div>
                  <div className="data-card"><h3>Humidity Range</h3><p>Min: {trends?.peaks?.min_humidity ?? '--'}%</p><p>Max: {trends?.peaks?.max_humidity ?? '--'}%</p></div>
                  <div className="data-card"><h3>Total Readings</h3><p>{trends?.chart_data?.length ?? '--'} data points collected</p><p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>ESP sends every 10 seconds</p></div>
                </div>
              </div>
            )}

            {/* HISTORY — real logs */}
            {activeTab === 'History' && (
              <div className="glass-panel activity-log" style={{ padding: '2rem' }}>
                <h3 className="log-header" style={{ fontSize: '1.5rem' }}><History size={24} /> Field Operations Archive</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Real log of all irrigation events and commands from your ESP8266.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {logs.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No events yet. Logs appear as the system runs.</div>}
                  {logs.map(log => (
                    <div key={log.id} className={`log-item ${log.type === 'alert' ? 'warning' : ''}`} style={{ maxWidth: '800px' }}>
                      <div className="log-title" style={{ fontSize: '1rem' }}><span style={{ color: log.color }}>{log.icon}</span> {log.title}</div>
                      <div className="log-desc" style={{ fontSize: '0.9rem' }}>{log.desc}</div>
                      <div className="log-time" style={{ fontSize: '0.8rem' }}>{log.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  )
}

export default App
