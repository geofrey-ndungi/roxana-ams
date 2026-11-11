import { useState, useEffect } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import api from "../api/axios";
import TimetableCalendar from "../components/TimetableCalendar";
import { plural } from "../utils/format";
import "./MyTimetable.css";
import { Printer } from "lucide-react";
import PrintTimetableDialog from "../components/PrintTimetableDialog";

function PageShell({ children }) {
  return (
    <div className="ttv-bg">
      <div className="ttv-page">{children}</div>
    </div>
  );
}

function MyTimetable() {
  const { user } = useOutletContext();
  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!isTeacher && !isStudent) return;

    const loadTimetable = async () => {
      try {
        const response = await api.get("/timetable/me/");
        setData(response.data);
      } catch (err) {
        setError("Failed to load your timetable.");
        console.error(err);
      }
    };

    loadTimetable();
  }, [isTeacher, isStudent]);

  // Administrators use the editor, not this page
  if (!isTeacher && !isStudent) return <Navigate to="/" replace />;

  if (error) {
    return (
      <PageShell>
        <p className="ttv-error">{error}</p>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell>
        <div className="ttv-card ttv-skeleton">
          <div className="ttv-skel" style={{ height: 460 }}></div>
        </div>
      </PageShell>
    );
  }

  const { term, school_class: className, periods, lessons } = data;

  // The line under the title
  let subtitle = "Your weekly lessons";
  if (isStudent) subtitle = className || "No class yet";
  if (term) subtitle += ` · ${term.label}`;

  // Why there might be nothing to show
  let emptyTitle = "";
  let emptyText = "";

  if (!term) {
    emptyTitle = "No term has been set up yet";
    emptyText = "The timetable will appear here once the school has set up its terms.";
  } else if (isStudent && !className) {
    emptyTitle = "You aren't in a class yet";
    emptyText = "Your timetable will appear here once you have been enrolled in a class.";
  } else if (periods.length === 0) {
    emptyTitle = "The school day hasn't been set up yet";
    emptyText = "The timetable will appear here once the periods have been added.";
  } else if (lessons.length === 0) {
    emptyTitle = `No lessons for ${term.label} yet`;
    emptyText = isTeacher
      ? "You haven't been given any lessons in this term."
      : "Your class timetable hasn't been set up for this term yet.";
  }

  // A teacher sees which class each lesson is in, a student sees the teacher
  const metaFor = (lesson) => {
    const first = isTeacher ? lesson.class_name : lesson.teacher_name;
    return first + (lesson.room ? ` · ${lesson.room}` : "");
  };

  const classCount = new Set(lessons.map((l) => l.school_class)).size;

  return (
    <PageShell>
      <div className="ttv-top">
        <div>
          <h1 className="ttv-title">Timetable</h1>
          <p className="ttv-subtitle">{subtitle}</p>
        </div>

        {!emptyTitle && (
          <button
            type="button"
            className="ttv-print-btn"
            onClick={() => setPrinting(true)}
          >
            <Printer size={16} strokeWidth={1.75} />
            Print / PDF
          </button>
        )}
      </div>

      {emptyTitle ? (
        <div className="ttv-card ttv-empty">
          <div className="ttv-empty-title">{emptyTitle}</div>
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="ttv-card">
          <div className="ttv-summary">
            <span className="ttv-strong">{plural(lessons.length, "lesson")} a week</span>
            {isTeacher && (
              <span className="ttv-muted">
                across {plural(classCount, "class", "classes")}
              </span>
            )}
          </div>

          <TimetableCalendar periods={periods} lessons={lessons} metaFor={metaFor} />
        </div>
      )}
      {printing && (
        <PrintTimetableDialog
          mode={isTeacher ? "teacher" : "student"}
          periods={periods}
          lessons={lessons}
          termLabel={term ? term.label : ""}
          ownerName={isTeacher ? user.full_name : className}
          onClose={() => setPrinting(false)}
        />
      )}
    </PageShell>
  );
}

export default MyTimetable;