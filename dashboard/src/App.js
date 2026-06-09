import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:3000";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [ingestResult, setIngestResult] = useState(null);
  const [loading, setLoading] = useState({ ingest: false, query: false });
  const [stats, setStats] = useState({ nodes: 0, relationships: 0, queries: 0 });
  const [graphNodes, setGraphNodes] = useState([]);

  // Fetch graph stats from Neo4j via our API
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/stats`);
      setStats(res.data);
      setGraphNodes(res.data.recentNodes || []);
    } catch (err) {
      // stats endpoint not yet available
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleIngest = async () => {
    if (!transcript.trim()) return;
    setLoading((l) => ({ ...l, ingest: true }));
    setIngestResult(null);
    try {
      const res = await axios.post(`${API}/ingest`, { text: transcript });
      setIngestResult(res.data.result);
      await fetchStats();
    } catch (err) {
      setIngestResult({ error: "Failed to connect to OrgMind API" });
    } finally {
      setLoading((l) => ({ ...l, ingest: false }));
    }
  };

  const handleQuery = async () => {
    if (!question.trim()) return;
    setLoading((l) => ({ ...l, query: true }));
    setAnswer("");
    try {
      const res = await axios.post(`${API}/query`, { question });
      setAnswer(res.data.result.answer);
      setStats((s) => ({ ...s, queries: s.queries + 1 }));
    } catch (err) {
      setAnswer("Failed to reach OrgMind API. Make sure the server is running.");
    } finally {
      setLoading((l) => ({ ...l, query: false }));
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-dot" />
          OrgMind
        </div>
        <div className="status-bar">
          <div className="status-item">
            <div className="status-dot" />
            Neo4j
          </div>
          <div className="status-item">
            <div className="status-dot" />
            Redis
          </div>
          <div className="status-item">
            <div className="status-dot" />
            Llama 3.2
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="main">

        {/* Left — Ingest Panel */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-icon">⬆</span>
            <span className="panel-label">Ingest Transcript</span>
          </div>
          <div className="panel-body">
            <textarea
              rows={10}
              placeholder={"Paste a meeting transcript, decision log, or any organisational text here...\n\nExample:\nMeeting 12th October. Sarah and James decided to pause the Berlin expansion due to budget concerns."}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            <button onClick={handleIngest} disabled={loading.ingest || !transcript.trim()}>
              {loading.ingest ? "Processing..." : "Extract & Build Graph →"}
            </button>

            {ingestResult && !ingestResult.error && (
              <div>
                <div className="response-label">Extraction Result</div>
                <div className="stats-row">
                  <div className="stat">
                    <div className="stat-number">{ingestResult.entities_found}</div>
                    <div className="stat-label">Entities</div>
                  </div>
                  <div className="stat">
                    <div className="stat-number">{ingestResult.decisions_found}</div>
                    <div className="stat-label">Decisions</div>
                  </div>
                </div>
                <div className="response-box">
                  {ingestResult.entities?.map((e, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                        {e.type}
                      </span>{" "}
                      <span style={{ fontSize: 13 }}>{e.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ingestResult?.error && (
              <div className="response-box" style={{ color: "#ef4444" }}>
                {ingestResult.error}
              </div>
            )}
          </div>
        </div>

        {/* Centre — Graph Panel */}
        <div className="graph-panel">
          <div className="panel-header">
            <span className="panel-icon">◈</span>
            <span className="panel-label">Knowledge Graph</span>
          </div>

          {/* Stats bar */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)" }}>
            {[
              { label: "Nodes", value: stats.nodes },
              { label: "Relationships", value: stats.relationships },
              { label: "Queries", value: stats.queries },
            ].map((s) => (
              <div key={s.label} style={{
                flex: 1,
                padding: "12px 0",
                textAlign: "center",
                borderRight: "1px solid var(--border)"
              }}>
                <div className="stat-number" style={{ fontSize: 18 }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Graph nodes list */}
          <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
            {graphNodes.length === 0 ? (
              <div className="graph-empty" style={{ position: "relative", transform: "none", textAlign: "left" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
                <p>The knowledge graph is empty.</p>
                <p style={{ marginTop: 6 }}>Ingest a transcript to start building it.</p>
              </div>
            ) : (
              <div>
                <div className="response-label" style={{ marginBottom: 12 }}>Graph Nodes</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {graphNodes.map((node, i) => (
                    <div key={i} style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontSize: 12,
                    }}>
                      <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 10, marginRight: 6 }}>
                        {node.type}
                      </span>
                      {node.name || node.text?.slice(0, 40)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — Query Panel */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-icon">⌖</span>
            <span className="panel-label">Query Memory</span>
          </div>
          <div className="panel-body">
            <textarea
              rows={4}
              placeholder={"Ask anything about your organisation...\n\nExamples:\n— Who was involved in the Berlin decision?\n— What strategies did we reverse?\n— Which decisions were made in October?"}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuery();
                }
              }}
            />
            <button onClick={handleQuery} disabled={loading.query || !question.trim()}>
              {loading.query ? "Thinking..." : "Ask OrgMind →"}
            </button>

            <div>
              <div className="response-label">Answer</div>
              <div className={`response-box ${!answer ? "empty" : ""}`}>
                {loading.query
                  ? <span className="loading-text">Querying graph and generating answer...</span>
                  : answer || "Your answer will appear here."}
              </div>
            </div>

            {/* Example questions */}
            <div>
              <div className="response-label" style={{ marginBottom: 8 }}>Try asking</div>
              {[
                "Who was involved in decisions?",
                "What decisions were made?",
                "Which people are in the graph?",
              ].map((q) => (
                <div
                  key={q}
                  onClick={() => setQuestion(q)}
                  style={{
                    padding: "8px 12px",
                    marginBottom: 6,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-mono)",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) => e.target.style.borderColor = "var(--accent)"}
                  onMouseLeave={(e) => e.target.style.borderColor = "var(--border)"}
                >
                  {q}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}