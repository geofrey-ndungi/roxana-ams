import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../api/axios";
import "./Examinations.css";

function ExamAnalytics() {
  const { user } = useOutletContext();
  const [examinations, setExaminations] = useState([]);
  const [examinationId, setExaminationId] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsExamId, setAnalyticsExamId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/examinations/")
      .then((response) => {
        const available =
          user?.role === "TEACHER"
            ? response.data.filter((exam) => exam.released_at)
            : response.data;
        setExaminations(available);
        setExaminationId(String(available[0]?.id || ""));
      })
      .catch((requestError) => {
        setError(
          requestError.response?.data?.detail || "Couldn't load examinations."
        );
      });
  }, [user?.role]);

  useEffect(() => {
    if (!examinationId) return;
    let active = true;
    api
      .get("/examination-analytics/", {
        params: { examination: examinationId },
      })
      .then((response) => {
        if (active) {
          setAnalytics(response.data);
          setAnalyticsExamId(String(examinationId));
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.detail || "Couldn't load exam analytics."
          );
        }
      });
    return () => {
      active = false;
    };
  }, [examinationId]);

  const selectedExam = useMemo(
    () => examinations.find((exam) => String(exam.id) === String(examinationId)),
    [examinations, examinationId]
  );
  const visibleAnalytics =
    analyticsExamId === String(examinationId) ? analytics : null;

  return (
    <div className="ex-page">
      <header className="ex-header">
        <div>
          <h1>Exam analytics</h1>
          <p>Review class and subject performance after marks are submitted.</p>
        </div>
        {selectedExam && (
          <label className="ex-select-label">
            Examination
            <select
              value={examinationId}
              onChange={(event) => {
                setExaminationId(event.target.value);
                setError("");
              }}
            >
              {examinations.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} · {exam.class_name} · {exam.term_label}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {error && <div className="ex-alert ex-alert-error" role="alert">{error}</div>}
      {visibleAnalytics ? (
        <>
          <section className="ex-metrics">
            <article className="ex-card ex-metric">
              <span>Class</span><strong>{visibleAnalytics.class_name}</strong>
            </article>
            <article className="ex-card ex-metric">
              <span>Students enrolled</span><strong>{visibleAnalytics.student_count}</strong>
            </article>
            <article className="ex-card ex-metric">
              <span>Marks recorded</span><strong>{visibleAnalytics.marks_recorded}</strong>
            </article>
            <article className="ex-card ex-metric">
              <span>Average mark</span>
              <strong>
                {visibleAnalytics.average_percentage === null
                  ? "—"
                  : `${visibleAnalytics.average_percentage}%`}
              </strong>
            </article>
          </section>

          <section className="ex-card">
            <div className="ex-card-heading">
              <div>
                <h2>Subject performance</h2>
                <p>{visibleAnalytics.examination}</p>
              </div>
            </div>
            {visibleAnalytics.subjects.length > 0 ? (
              <div className="ex-analytics-list">
                {visibleAnalytics.subjects.map((subject) => (
                  <article className="ex-analytics-row" key={subject.name}>
                    <div className="ex-analytics-label">
                      <strong>{subject.name}</strong>
                      <span>
                        Average {subject.average_percentage}% · High {subject.highest_percentage}%
                        · Low {subject.lowest_percentage}%
                      </span>
                      <div className="ex-grade-distribution">
                        {subject.grade_distribution.map((item) => (
                          <span key={item.grade}>
                            {item.grade}: {item.students}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="ex-bar-track" aria-label={`${subject.name} average`}>
                      <div
                        className="ex-bar-fill"
                        style={{
                          width: `${Math.min(100, subject.average_percentage)}%`,
                        }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="ex-empty-inline">No marks have been recorded for this examination.</p>
            )}
          </section>
          <p className="ex-note">
            Analytics show performance summaries only; student and class rankings are displayed
            separately according to staff permissions.
          </p>
        </>
      ) : (
        !error && (
          <section className="ex-empty">
            <h2>No examination analytics yet</h2>
            <p>
              {user?.role === "TEACHER"
                ? "Analytics are available after results have been released."
                : "Create an examination to see class and subject performance."}
            </p>
          </section>
        )
      )}
    </div>
  );
}

export default ExamAnalytics;
