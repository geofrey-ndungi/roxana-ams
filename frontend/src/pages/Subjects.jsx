import { useState, useEffect } from "react";
import api from "../api/axios";
import Header from "../components/Header";
import SubjectCard from "../components/SubjectCard";
import "./Subjects.css";
import mathImage from "../assets/subjects/math.jpeg";


import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faBook } from "@fortawesome/free-solid-svg-icons";





function Subjects({ onLogout }) {
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

  // Maps a subject's name to its specific image. Add more entries here
  // as you get more images. Anything not listed falls back to a generic one.
  const subjectImages = {
    Mathematics: mathImage,
  };

  const defaultImage = mathImage; // temporary fallback until we have more images

  const getBannerImage = (subjectName) => {
    return subjectImages[subjectName] || defaultImage;
  };
  // Only show subjects whose name or code matches what's typed.
  const filteredSubjects = subjects.filter((subject) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      subject.name.toLowerCase().includes(query) ||
      (subject.code || "").toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Header isLoggedIn={true} onLogout={onLogout} />

      <div className="subjects-page">
        {error && <p style={{ color: "red" }}>{error}</p>}

        <div className="subjects-topbar">
          <div className="subjects-title">
            <h2>Subjects</h2>
            <div className="subjects-subtitle">
              {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="subjects-search">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="subjects-search-icon"
            />
            <input
              type="text"
              placeholder="Search subjects or codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="subjects-empty">
            <div className="subjects-empty-icon">
              <FontAwesomeIcon icon={faBook} />
            </div>
            <h3>No subjects found</h3>
            <p>
              {subjects.length === 0
                ? "No subjects have been added yet."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <div className="subjects-grid">
  {filteredSubjects.map((subject) => (
    <SubjectCard
      key={subject.id}
      subject={subject}
      imageSrc={getBannerImage(subject.name)}
    />
  ))}
</div>
        )}
      </div>
    </>
  );
}

export default Subjects;
