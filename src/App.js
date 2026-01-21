// src/App.js
import React, { useState } from "react";
import Autosuggest from "react-autosuggest";
import "./App.css";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

const baseUrl =
  process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";

function App() {
  // AUTOSUGGEST STATES
  const [inputValue, setInputValue] = useState("");   // always string
  const [selectedStudent, setSelectedStudent] = useState(null); // actual ID
  const [suggestions, setSuggestions] = useState([]);

  // DATA STATES
  const [recommendations, setRecommendations] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [performanceDetail, setPerformanceDetail] = useState([]);
  const [engagement, setEngagement] = useState([]);
  const [selectedRec, setSelectedRec] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // AUTOSUGGEST FUNCTIONS

  const onSuggestionsFetchRequested = async ({ value }) => {
    const q = value.trim();

    if (q.length === 0) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/students/search?query=${q}`);
      const data = await res.json();
      setSuggestions(data.students || []);
    } catch {
      setSuggestions([]);
    }
  };

  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const getSuggestionValue = (s) => s.label;

  const renderSuggestion = (s) => (
    <div className="suggestion-item">{s.label}</div>
  );

  const onSuggestionSelected = (_, { suggestion }) => {
    setInputValue(suggestion.label);
    setSelectedStudent(suggestion.id_student);
  };

  const inputProps = {
    placeholder: "Search student…",
    value: inputValue,
    onChange: (_, { newValue }) => {
      setInputValue(newValue);
      setSelectedStudent(null); // reset until a valid selection
    },
    className: "search-input",
  };

  // FETCH ANALYTICS

  const handleFetch = async () => {
    if (!selectedStudent) {
      setError("Please select a student from the list.");
      return;
    }

    setError("");
    setLoading(true);

    setRecommendations([]);
    setPerformance(null);
    setPerformanceDetail([]);
    setEngagement([]);

    try {
      // Recommendations
      const recRes = await fetch(
        `${baseUrl}/recommend?student_id=${selectedStudent}&top_n=5`
      );
      const recData = await recRes.json();
      setRecommendations(recData.recommendations || []);

      // Performance summary
      const perfRes = await fetch(
        `${baseUrl}/performance?student_id=${selectedStudent}`
      );
      if (perfRes.ok) setPerformance(await perfRes.json());

      // Performance detail
      const detRes = await fetch(
        `${baseUrl}/performance/detail?student_id=${selectedStudent}`
      );
      if (detRes.ok) {
        const detData = await detRes.json();
        setPerformanceDetail(detData.records || []);
      }

      // Engagement
      const engRes = await fetch(
        `${baseUrl}/engagement?student_id=${selectedStudent}`
      );
      if (engRes.ok) {
        const engData = await engRes.json();
        setEngagement(engData.engagement || []);
      }
    } catch (err) {
      setError("Backend not responding. Check FastAPI server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>AI Student Learning Analytics Dashboard</h1>

      {/* SEARCH BAR */}
      <div className="controls">
        <Autosuggest
          suggestions={suggestions}
          onSuggestionsFetchRequested={onSuggestionsFetchRequested}
          onSuggestionsClearRequested={onSuggestionsClearRequested}
          getSuggestionValue={getSuggestionValue}
          renderSuggestion={renderSuggestion}
          onSuggestionSelected={onSuggestionSelected}
          inputProps={inputProps}
        />

        <button onClick={handleFetch} disabled={loading}>
          {loading ? "Loading..." : "Analyze"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* PERFORMANCE SUMMARY */}
      {performance && (
        <div className="card">
          <h2>Performance Summary</h2>
          <p><b>Attempts:</b> {performance.attempts}</p>
          <p><b>Average Score:</b> {performance.avg_score.toFixed(2)}</p>
          <p><b>Pass Rate:</b> {(performance.pass_rate * 100).toFixed(1)}%</p>
        </div>
      )}

      {/* PERFORMANCE CHART */}
      {performanceDetail.length > 0 && (
        <div className="card">
          <h2>Assessment Trend</h2>
          <LineChart width={600} height={300} data={performanceDetail}>
            <Line type="monotone" dataKey="score" stroke="#0d6efd" />
            <XAxis dataKey="id_assessment" />
            <YAxis />
            <Tooltip />
          </LineChart>
        </div>
      )}

      {/* ENGAGEMENT CHART */}
      {engagement.length > 0 && (
        <div className="card">
          <h2>Engagement Over Time</h2>
          <BarChart width={600} height={300} data={engagement}>
            <CartesianGrid strokeDasharray="3 3" />
            <Bar dataKey="sum_click" fill="#198754" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
          </BarChart>
        </div>
      )}

      {/* RECOMMENDATIONS TABLE */}
      {recommendations.length > 0 && (
        <div className="card">
          <h2>Recommended Resources</h2>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Score</th>
                <th>More</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((rec) => (
                <tr key={rec.id_site}>
                  <td>{rec.title || "-"}</td>
                  <td>{rec.activity_type || "-"}</td>
                  <td>{rec.score.toFixed(3)}</td>
                  <td>
                    <button onClick={() => setSelectedRec(rec)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {selectedRec && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{selectedRec.title}</h2>
            <p><b>Type:</b> {selectedRec.activity_type}</p>
            <p><b>Week:</b> {selectedRec.week_from} → {selectedRec.week_to}</p>
            <p><b>Score:</b> {selectedRec.score.toFixed(3)}</p>
            <p><b>ID:</b> {selectedRec.id_site}</p>

            <button className="close-btn" onClick={() => setSelectedRec(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

