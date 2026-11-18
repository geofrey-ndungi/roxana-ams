import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Check, LockKeyhole, X } from "lucide-react";
import api from "../api/axios";
import addIcon from "../assets/examinations/add.svg";
import chevronIcon from "../assets/examinations/chevron.svg";
import searchIcon from "../assets/examinations/search.svg";
import "./Examinations.css";

const errorMessage = (error, fallback) =>
  error.response?.data?.detail || fallback;

function Examinations() {
  const { user } = useOutletContext();
  const [examinations, setExaminations] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [results, setResults] = useState(null);
  const [resultsExamId, setResultsExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [roster, setRoster] = useState([]);
  const [rosterSubjectId, setRosterSubjectId] = useState("");
  const [scores, setScores] = useState({});
  const [title, setTitle] = useState("");
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [includeRankings, setIncludeRankings] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [markSubjectId, setMarkSubjectId] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const noticeTimer = useRef(null);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const showNotice = (message) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 5000);
  };

  useEffect(() => {
    if (!createDialogOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) setCreateDialogOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createDialogOpen, busy]);

  const loadExaminations = useCallback(async () => {
    try {
      const response = await api.get("/examinations/");
      setExaminations(response.data);
      setSelectedId((current) =>
        response.data.some((exam) => String(exam.id) === String(current))
          ? current
          : String(response.data[0]?.id || "")
      );
    } catch (requestError) {
      setError(errorMessage(requestError, "Couldn't load examinations."));
    }
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/examinations/")
      .then((response) => {
        if (!active) return;
        setExaminations(response.data);
        setSelectedId((current) =>
          response.data.some((exam) => String(exam.id) === String(current))
            ? current
            : String(response.data[0]?.id || "")
        );
      })
      .catch((requestError) => {
        if (active) {
          setError(errorMessage(requestError, "Couldn't load examinations."));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.all([api.get("/terms/"), api.get("/school-classes/")])
      .then(([termResponse, classResponse]) => {
        setTerms(termResponse.data);
        setClasses(
          classResponse.data.filter((schoolClass) =>
            /\bgrade\s*[4-9]\b/i.test(schoolClass.name)
          )
        );
      })
      .catch((requestError) => {
        setError(errorMessage(requestError, "Couldn't load classes and terms."));
      });
  }, [user?.role]);

  const selectedExam = useMemo(
    () => examinations.find((exam) => String(exam.id) === String(selectedId)),
    [examinations, selectedId]
  );

  useEffect(() => {
    if (
      !selectedId ||
      (user?.role === "TEACHER" && !selectedExam?.released_at)
    ) {
      return;
    }

    let active = true;
    api
      .get("/examination-results/", {
        params: { examination: selectedId },
      })
      .then((response) => {
        if (active) {
          setResults(response.data);
          setResultsExamId(String(selectedId));
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(errorMessage(requestError, "Couldn't load examination results."));
        }
      });
    return () => {
      active = false;
    };
  }, [selectedId, selectedExam?.released_at, user?.role]);

  useEffect(() => {
    if (user?.role !== "TEACHER" || !subjectId) return;

    let active = true;
    api
      .get(`/examination-subjects/${subjectId}/marks/`)
      .then((response) => {
        if (!active) return;
        setRoster(response.data.students);
        setRosterSubjectId(String(subjectId));
        setScores(
          Object.fromEntries(
            response.data.students.map((student) => [
              student.enrollment,
              student.score,
            ])
          )
        );
      })
      .catch((requestError) => {
        if (active) {
          setError(errorMessage(requestError, "Couldn't load the class marksheet."));
        }
      });
    return () => {
      active = false;
    };
  }, [subjectId, user?.role]);

  const saveMarks = async () => {
    const marks = roster
      .filter((student) => String(scores[student.enrollment] ?? "").trim() !== "")
      .map((student) => ({
        enrollment: student.enrollment,
        score: scores[student.enrollment],
      }));
    await api.put(`/examination-subjects/${subjectId}/marks/`, { marks });
  };

  const handleSaveDraft = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveMarks();
      showNotice("Draft marks saved.");
    } catch (requestError) {
      setError(errorMessage(requestError, "Couldn't save the marks."));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitMarks = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveMarks();
      await api.post(`/examination-subjects/${subjectId}/submit/`);
      showNotice("Marks submitted. They are now locked for this subject.");
      await loadExaminations();
      const response = await api.get(`/examination-subjects/${subjectId}/marks/`);
      setRoster(response.data.students);
      setScores(
        Object.fromEntries(
          response.data.students.map((student) => [
            student.enrollment,
            student.score,
          ])
        )
      );
    } catch (requestError) {
      setError(errorMessage(requestError, "Couldn't submit these marks."));
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await api.post("/examinations/", {
        title,
        term: Number(termId),
        school_class: Number(classId),
      });
      setTitle("");
      setCreateDialogOpen(false);
      setSelectedId(String(response.data.id));
      showNotice("Examination created. Assigned teachers can now enter marks.");
      await loadExaminations();
      setSelectedId(String(response.data.id));
    } catch (requestError) {
      setError(errorMessage(requestError, "Couldn't create the examination."));
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async () => {
    if (!selectedExam) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.post(`/examinations/${selectedExam.id}/release/`, {
        include_rankings: includeRankings,
      });
      showNotice("Results released to students.");
      await loadExaminations();
    } catch (requestError) {
      setError(errorMessage(requestError, "Couldn't release the results."));
    } finally {
      setBusy(false);
    }
  };

  const isTeacher = user?.role === "TEACHER";
  const isAdmin = user?.role === "ADMIN";
  const isStudent = user?.role === "STUDENT";
  const visibleResults =
    resultsExamId === String(selectedId) ? results : null;
  const visibleRoster =
    rosterSubjectId === String(subjectId) ? roster : [];
  const visibleScores =
    rosterSubjectId === String(subjectId) ? scores : {};
  const availableMarkSubjects = selectedExam?.subjects || [];
  const activeMarkSubjectId =
    markSubjectId === null
      ? isStudent
        ? ""
        : String(availableMarkSubjects[0]?.subject || "")
      : String(markSubjectId);
  const tableColumnCount =
    (isStudent ? 0 : 1) + (activeMarkSubjectId ? 0 : 1) + 3;
  const tableMarks = (visibleResults?.marks || []).filter((mark) => {
    const matchesSubject =
      !activeMarkSubjectId ||
      String(mark.subject) === String(activeMarkSubjectId);
    const matchesSearch = mark.student_name
      .toLowerCase()
      .includes(studentSearch.trim().toLowerCase());
    return matchesSubject && matchesSearch;
  });
  const visibleRankings = (visibleResults?.rankings || []).filter(
    (row) =>
      row.type === "CLASS" ||
      !activeMarkSubjectId ||
      String(row.subject) === String(activeMarkSubjectId)
  );
  const currentAssignment = selectedExam?.subjects.find(
    (subject) => String(subject.id) === String(subjectId)
  );

  return (
    <div className="ex-page">
      <header className="ex-header">
        <h1>Examination results</h1>
        {isAdmin && (
          <button
            type="button"
            className="ex-button ex-new-button"
            onClick={() => {
              setError("");
              setCreateDialogOpen(true);
            }}
          >
            <img src={addIcon} alt="" />
            New examination
          </button>
        )}
      </header>

      {error && !createDialogOpen && (
        <div className="ex-alert ex-alert-error" role="alert">{error}</div>
      )}
      {notice && <div className="ex-alert ex-alert-success" role="status">{notice}</div>}

      {selectedExam && (
        <section className="ex-exam-selection">
          <label className="ex-select-label">
            <span>Examination</span>
            <div className="ex-select-control">
            <select
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setSubjectId("");
                setMarkSubjectId(null);
                setStudentSearch("");
                setIncludeRankings(false);
                setError("");
              }}
            >
              {examinations.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} · {exam.class_name} · {exam.term_label}
                </option>
              ))}
            </select>
              <img src={chevronIcon} alt="" />
            </div>
          </label>
          <div className="ex-exam-meta">
            <span>{selectedExam.class_name}</span>
            <span className="ex-meta-divider" aria-hidden="true" />
            <span>{selectedExam.term_label}</span>
          </div>
        </section>
      )}

      {isAdmin && selectedExam && (
        <section className="ex-card ex-submission-card">
          <div className="ex-submission-heading">
            <h2>Subject submissions</h2>
            <span className="ex-submission-count">
              {selectedExam.submitted_count} of {selectedExam.subject_count} submitted
            </span>
          </div>
          <div className="ex-submission-grid">
            {selectedExam.subjects.map((subject) => (
              <article className="ex-submission-item" key={subject.id}>
                <strong>{subject.subject_name}</strong>
                <span>{subject.teacher_name}</span>
                <span
                  className={`ex-submission-status ${
                    subject.submitted ? "is-submitted" : ""
                  }`}
                >
                  {subject.submitted ? "Submitted" : "Pending"}
                </span>
              </article>
            ))}
          </div>
          <div className="ex-release-footer">
            {selectedExam.released_at ? (
              <>
                <span className="ex-released-label">
                  <Check size={15} /> Results released
                  {selectedExam.include_rankings ? " · Rankings included" : ""}
                </span>
                <span className="ex-release-complete">Published to students</span>
                <button className="ex-button ex-release-button" disabled>
                  Release results
                </button>
              </>
            ) : (
              <>
                <label className="ex-check">
                  <input
                    type="checkbox"
                    checked={includeRankings}
                    onChange={(event) => setIncludeRankings(event.target.checked)}
                  />
                  Include rankings
                </label>
                <span className="ex-release-complete">
                  {selectedExam.submitted_count === selectedExam.subject_count
                    ? "All subject marks submitted"
                    : `Waiting for ${
                        selectedExam.subject_count - selectedExam.submitted_count
                      } subject submissions`}
                </span>
                <button
                  className="ex-button ex-release-button"
                  onClick={handleRelease}
                  disabled={
                    busy ||
                    selectedExam.submitted_count !== selectedExam.subject_count
                  }
                >
                  Release results
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {isTeacher && selectedExam && selectedExam.subjects.length > 0 && (
        <section className="ex-card ex-teacher-marks">
          <div className="ex-card-heading">
            <div>
              <h2>Enter subject marks</h2>
              <p>Submit a mark for every student when the subject is complete.</p>
            </div>
            <LockKeyhole size={19} />
          </div>
          <label className="ex-mark-subject-label">
            Subject
            <div className="ex-select-control">
              <select
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
              >
                <option value="">Choose your subject</option>
                {selectedExam.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.subject_name}{subject.submitted ? " · Submitted" : ""}
                  </option>
                ))}
              </select>
              <img src={chevronIcon} alt="" />
            </div>
          </label>
          {currentAssignment &&
            (currentAssignment.submitted ? (
              <p className="ex-locked-note">
                <LockKeyhole size={16} /> Marks submitted; this subject is locked.
              </p>
            ) : (
              <>
                <div className="ex-table-wrap ex-mark-table">
                  <table className="ex-table">
                    <thead>
                      <tr><th>Student</th><th>Score / 100</th></tr>
                    </thead>
                    <tbody>
                      {visibleRoster.map((student) => (
                        <tr key={student.enrollment}>
                          <td>{student.student_name}</td>
                          <td>
                            <input
                              className="ex-score-input"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={visibleScores[student.enrollment] ?? ""}
                              onChange={(event) =>
                                setScores((current) => ({
                                  ...current,
                                  [student.enrollment]: event.target.value,
                                }))
                              }
                              aria-label={`Mark for ${student.student_name}`}
                            />
                          </td>
                        </tr>
                      ))}
                      {visibleRoster.length === 0 && (
                        <tr><td colSpan="2">No students are enrolled in this class.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="ex-button-row">
                  <button
                    className="ex-button ex-button-light"
                    onClick={handleSaveDraft}
                    disabled={busy || !visibleRoster.length}
                  >
                    Save draft
                  </button>
                  <button
                    className="ex-button ex-button-primary"
                    onClick={handleSubmitMarks}
                    disabled={busy || !visibleRoster.length}
                  >
                    Submit marks
                  </button>
                </div>
              </>
            ))}
        </section>
      )}

      {isTeacher && selectedExam && selectedExam.subjects.length === 0 && (
        <p className="ex-note">
          You are the class teacher for this class, but no subject marks are assigned to you.
        </p>
      )}

      {visibleResults && (
        <section className="ex-card ex-results-card">
          <div className="ex-results-toolbar">
            <div className="ex-results-title">
              <h2>{isStudent ? "My results" : "Marks and grades"}</h2>
              <label className="ex-subject-filter">
                <span className="sr-only">Filter by subject</span>
                <div className="ex-select-control">
                  <select
                    value={activeMarkSubjectId}
                    onChange={(event) => setMarkSubjectId(event.target.value)}
                  >
                    {isStudent && <option value="">All subjects</option>}
                    {!isStudent && availableMarkSubjects.length > 1 && (
                      <option value="">All subjects</option>
                    )}
                    {availableMarkSubjects.map((subject) => (
                      <option key={subject.id} value={subject.subject}>
                        {subject.subject_name}
                      </option>
                    ))}
                  </select>
                  <img src={chevronIcon} alt="" />
                </div>
              </label>
            </div>
            {!isStudent && (
              <label className="ex-search">
                <img src={searchIcon} alt="" />
                <span className="sr-only">Search students</span>
                <input
                  type="search"
                  placeholder="Search students"
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                />
              </label>
            )}
          </div>

          <div className="ex-table-wrap">
            <table className="ex-table">
              <thead>
                <tr>
                  {!isStudent && <th>Student</th>}
                  {!activeMarkSubjectId && <th>Subject</th>}
                  <th>Score / 100</th>
                  <th>Grade</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {tableMarks.map((mark) => (
                  <tr key={`${mark.enrollment}-${mark.subject}`}>
                    {!isStudent && <td>{mark.student_name}</td>}
                    {!activeMarkSubjectId && <td>{mark.subject_name}</td>}
                    <td>{mark.score}</td>
                    <td>
                      <span
                        className={`ex-grade ${
                          mark.grade?.startsWith("EE") ? "ex-grade-high" : ""
                        }`}
                      >
                        {mark.grade}
                      </span>
                    </td>
                    <td>{mark.points}</td>
                  </tr>
                ))}
                {tableMarks.length === 0 && (
                  <tr>
                    <td                     colSpan={tableColumnCount}>
                      {studentSearch
                        ? "No students match your search."
                        : "No marks are available yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {visibleRankings.length > 0 && (
            <div className="ex-rankings">
              <h3>{isAdmin ? "Rankings" : "Rankings available to you"}</h3>
              <div className="ex-table-wrap">
                <table className="ex-table">
                  <thead>
                    <tr><th>Ranking</th><th>Student</th><th>Rank</th><th>Average</th></tr>
                  </thead>
                  <tbody>
                    {visibleRankings.map((row, index) => (
                      <tr key={`${row.type}-${row.subject || "class"}-${row.student_id}-${index}`}>
                        <td>{row.type === "CLASS" ? "Overall class" : row.subject_name}</td>
                        <td>{row.student_name}</td>
                        <td>{row.rank}</td>
                        <td>{row.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {!selectedExam && !isAdmin && (
        <section className="ex-empty">
          <h2>No examinations yet</h2>
          <p>
            {isTeacher
              ? "No examinations have been assigned to your classes."
              : "Published examination results will appear here."}
          </p>
        </section>
      )}

      {createDialogOpen && isAdmin && (
        <div
          className="ex-dialog-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setCreateDialogOpen(false);
            }
          }}
        >
          <section
            className="ex-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ex-dialog-title"
          >
            <header className="ex-dialog-header">
              <div>
                <h2 id="ex-dialog-title">New examination</h2>
                <p>Choose the exam name, term, and class.</p>
              </div>
              <button
                type="button"
                className="ex-dialog-close"
                onClick={() => setCreateDialogOpen(false)}
                disabled={busy}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </header>
            <form className="ex-dialog-form" onSubmit={handleCreate}>
              <label>
                Examination name
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Term 2 Assessment"
                />
              </label>
              <div className="ex-dialog-fields">
                <label>
                  Term
                  <div className="ex-select-control">
                    <select
                      required
                      value={termId}
                      onChange={(event) => setTermId(event.target.value)}
                    >
                      <option value="">Select term</option>
                      {terms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.name.replace("_", " ")} · {term.start_date.slice(0, 4)}
                        </option>
                      ))}
                    </select>
                    <img src={chevronIcon} alt="" />
                  </div>
                </label>
                <label>
                  Class
                  <div className="ex-select-control">
                    <select
                      required
                      value={classId}
                      onChange={(event) => setClassId(event.target.value)}
                    >
                      <option value="">Select class</option>
                      {classes.map((schoolClass) => (
                        <option key={schoolClass.id} value={schoolClass.id}>
                          {schoolClass.name}
                        </option>
                      ))}
                    </select>
                    <img src={chevronIcon} alt="" />
                  </div>
                </label>
              </div>
              <p className="ex-dialog-hint">
                Subjects and teachers will be added from the class timetable.
              </p>
              {error && <p className="ex-dialog-error" role="alert">{error}</p>}
              <footer className="ex-dialog-actions">
                <button
                  type="button"
                  className="ex-button ex-cancel-button"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ex-button ex-create-button"
                  disabled={busy}
                >
                  {busy ? "Creating…" : "Create examination"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Examinations;
