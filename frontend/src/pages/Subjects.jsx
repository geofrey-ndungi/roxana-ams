import { useState, useEffect } from "react";
import api from "../api/axios";
import Header from "../components/Header";

function Subjects({ onLogout }) {
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState("");

  const fetchSubjects = async () => {
    try {
      const response = await api.get("/subjects/");
      setSubjects(response.data);
    } catch (err) {
      setError("Failed to load subjects. Are you logged in?");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  return (
  <>
    <Header isLoggedIn={true} onLogout={onLogout} />
    <div>
      <h2>Subjects</h2>
      <button onClick={fetchSubjects}>Refresh Subjects</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {subjects.map((subject) => (
          <li key={subject.id}>
            {subject.name} ({subject.code})
          </li>
        ))}
      </ul>
    </div>
  </>
);
}

export default Subjects;