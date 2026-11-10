import { useState, useEffect } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { X, Trash2 } from "lucide-react";
import TimetableCalendar from "../components/TimetableCalendar";
import { DAYS, timeLabel } from "../utils/timetable";
import api from "../api/axios";
import "./Timetable.css";



// Django's own admin site, where terms, classes and subjects are created for now.
const ADMIN_URL = `http://${window.location.hostname}:8000/admin/`;

// "TERM_1" becomes "Term 1"
const prettyTermName = (name) => {
  const text = name.replace("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};


// The dialog that opens when you click a box
function LessonEditor({
  slot,
  className,
  termId,
  classId,
  subjects,
  teachers,
  busy,
  nextPeriod,
  nextPeriodOccupied,
  busyForDouble,
  onClose,
  onSaved,
  onCleared,
}) {
  const { day, period, lesson } = slot;

  const [subjectId, setSubjectId] = useState(lesson ? String(lesson.subject) : "");
  const [teacherId, setTeacherId] = useState(lesson ? String(lesson.teacher) : "");
  const [room, setRoom] = useState(lesson ? lesson.room : "");
  const [isDouble, setIsDouble] = useState(Boolean(lesson?.is_double));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dayLabel = DAYS.find((d) => d.value === day).label;

  // Escape closes the dialog
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!subjectId || !teacherId) {
      setError("Choose a subject and a teacher.");
      return;
    }
    if (isDouble && nextPeriodOccupied) {
      setError("The next period is already assigned to this class.");
      return;
    }
    if (isDouble && busyForDouble[teacherId]) {
      const teacherName = teachers.find(
        (teacher) => String(teacher.id) === teacherId
      )?.name;
      setError(`${teacherName} is already teaching another class in the next period.`);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await api.post("/lessons/save-cell/", {
        term: termId,
        school_class: classId,
        day,
        period: period.id,
        subject: Number(subjectId),
        teacher: Number(teacherId),
        room,
        is_double: isDouble,
      });
      onSaved(response.data);
    } catch (err) {
      // Show the server's own message when it sent one
      setError(
        err.response?.data?.detail || "Couldn't save this lesson. Please try again."
      );
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setError("");

    try {
      await api.delete(`/lessons/${lesson.id}/`);
      onCleared(lesson.id);
    } catch {
      setError("Couldn't clear this lesson. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="tt-overlay" onClick={onClose}>
      <div
        className="tt-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${dayLabel}, ${period.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tt-dialog-head">
          <div>
            <h2 className="tt-dialog-title">
              {dayLabel} · {period.name}
            </h2>
            <p className="tt-muted">
              {className} · {timeLabel(period.start_time)} to{" "}
              {timeLabel(period.end_time)}
            </p>
          </div>
          <button
            type="button"
            className="tt-icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="tt-field">
          <label htmlFor="tt-subject">Subject</label>
          <select
            id="tt-subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            autoFocus
          >
            <option value="">Choose a subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        {nextPeriod && (
          <div className="tt-field tt-double-field">
            <label className="tt-checkbox">
              <input
                type="checkbox"
                checked={isDouble}
                onChange={(event) => setIsDouble(event.target.checked)}
                disabled={saving || (nextPeriodOccupied && !isDouble)}
              />
              <span>Double lesson through {nextPeriod.name}</span>
            </label>
            <p className="tt-hint">
              {nextPeriodOccupied
                ? "The next period is already assigned to this class."
                : `Extends to ${timeLabel(nextPeriod.end_time)}. No break is between these periods.`}
            </p>
          </div>
        )}

        <div className="tt-field">
          <label htmlFor="tt-teacher">Teacher</label>
          <select
            id="tt-teacher"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            <option value="">Choose a teacher</option>
            {teachers.map((teacher) => {
              const busyIn = busy[teacher.id];
              const busyInNext = isDouble && busyForDouble[teacher.id];

              return (
                <option
                  key={teacher.id}
                  value={teacher.id}
                  disabled={Boolean(busyIn || busyInNext)}
                >
                  {teacher.name}
                  {busyIn
                    ? ` (teaching ${busyIn})`
                    : busyInNext
                      ? ` (teaching ${busyInNext} next period)`
                      : ""}
                </option>
              );
            })}
          </select>
          <p className="tt-hint">
            Teachers who are already teaching another class in this period are
            greyed out.
          </p>
        </div>

        <div className="tt-field">
          <label htmlFor="tt-room">Room (optional)</label>
          <input
            id="tt-room"
            type="text"
            maxLength={50}
            placeholder="e.g. Room 3"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
        </div>

        {error && <p className="tt-error">{error}</p>}

        <div className="tt-dialog-actions">
          {lesson ? (
            <button
              type="button"
              className="tt-btn tt-btn-danger"
              onClick={handleClear}
              disabled={saving}
            >
              <Trash2 size={15} strokeWidth={1.75} />
              Clear lesson
            </button>
          ) : (
            <span></span>
          )}

          <div className="tt-dialog-right">
            <button
              type="button"
              className="tt-btn tt-btn-light"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="tt-btn tt-btn-dark"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save lesson"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Timetable() {

  

  

  const { user } = useOutletContext();
  const isAdmin = user?.role === "ADMIN";

  const [setup, setSetup] = useState(null); // terms, classes, periods, ...
  const [setupError, setSetupError] = useState("");
  const [termId, setTermId] = useState(null);
  const [classId, setClassId] = useState(null);
  const [lessons, setLessons] = useState([]); // every lesson in the chosen term
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState("");
  const [editing, setEditing] = useState(null); // the box being edited

  // 1. Load everything the page needs once: terms, classes, periods...
  useEffect(() => {
    if (!isAdmin) return;

    const loadSetup = async () => {
      try {
        const [terms, years, classes, periods, subjects, teachers] =
          await Promise.all([
            api.get("/terms/"),
            api.get("/academic-years/"),
            api.get("/school-classes/"),
            api.get("/periods/"),
            api.get("/subjects/"),
            api.get("/teachers/"),
          ]);

        setSetup({
          terms: terms.data,
          years: years.data,
          classes: classes.data,
          periods: periods.data,
          subjects: subjects.data,
          teachers: teachers.data,
        });

        // Start on the term that today falls inside, if there is one
        const today = new Date().toLocaleDateString("en-CA");
        const current =
          terms.data.find((t) => t.start_date <= today && today <= t.end_date) ||
          terms.data.find((t) => t.is_active) ||
          terms.data[0];

        setTermId(current ? current.id : null);
        setClassId(classes.data.length ? classes.data[0].id : null);
      } catch (err) {
        setSetupError("Failed to load the timetable.");
        console.error(err);
      }
    };

    loadSetup();
  }, [isAdmin]);

  // 2. Every time the term changes, load all of that term's lessons
  useEffect(() => {
    if (!isAdmin || !termId) return;

    // If you switch terms quickly, an older answer could arrive after a
    // newer one. "cancelled" makes the older answer get ignored.
    let cancelled = false;

    const loadLessons = async () => {
      setLessonsLoading(true);
      setLessonsError("");
      setLessons([]);

      try {
        const response = await api.get(`/lessons/?term=${termId}`);
        if (!cancelled) setLessons(response.data);
      } catch (err) {
        if (!cancelled) setLessonsError("Couldn't load the lessons for this term.");
        console.error(err);
      } finally {
        if (!cancelled) setLessonsLoading(false);
      }
    };

    loadLessons();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, termId]);

  // Only administrators edit the timetable
  if (!isAdmin) return <Navigate to="/" replace />;

  if (setupError) {
    return (
      <div className="tt-bg">
        <div className="tt-page">
          <p className="tt-error">{setupError}</p>
        </div>
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="tt-bg">
        <div className="tt-page">
          <div className="tt-card tt-skeleton">
            <div className="tt-skel" style={{ height: 420 }}></div>
          </div>
        </div>
      </div>
    );
  }

  const { terms, years, classes, periods, subjects, teachers } = setup;

  // Quick lookups
  const yearById = {};
  years.forEach((y) => {
    yearById[y.id] = y.year;
  });

  const classById = {};
  classes.forEach((c) => {
    classById[c.id] = c;
  });

  const lessonPeriods = periods.filter((p) => p.is_lesson);

  // The lessons of the class on screen, and the box at a given day and period
  const classLessons = lessons.filter((l) => l.school_class === classId);
  
  // Which teachers are teaching ANOTHER class in this slot: {teacherId: "Grade 6"}
  const busyAt = (day, periodId) => {
    const busy = {};
    lessons.forEach((l) => {
      if (l.day === day && l.period === periodId && l.school_class !== classId) {
        busy[l.teacher] = classById[l.school_class]?.name || "another class";
      }
    });
    return busy;
  };

  const totalSlots = DAYS.length * lessonPeriods.length;



  // Things the admin still has to create before a timetable is possible
  const missing = [];
  if (terms.length === 0) missing.push("a term");
  if (classes.length === 0) missing.push("a class");
  if (lessonPeriods.length === 0) missing.push("periods");
  if (subjects.length === 0) missing.push("subjects");
  if (teachers.length === 0) missing.push("teachers");

  const canShowGrid = terms.length > 0 && classes.length > 0 && lessonPeriods.length > 0;
  const editingNextPeriod = editing
    ? lessonPeriods.find((period) => period.start_time === editing.period.end_time)
    : null;
  const editingNextPeriodLesson =
    editingNextPeriod &&
    classLessons.find(
      (lesson) =>
        lesson.day === editing.day && lesson.period === editingNextPeriod.id
    );

  const handleSaved = (saved) => {
    // A new lesson is added. An edited one keeps its id, so it is replaced.
    setLessons((previous) => [...previous.filter((l) => l.id !== saved.id), saved]);
    setEditing(null);
  };

  const handleCleared = (id) => {
    setLessons((previous) => previous.filter((l) => l.id !== id));
    setEditing(null);
  };

  return (
    <div className="tt-bg">
      <div className="tt-page">
        <div className="tt-top">
          <div>
            <h1 className="tt-title">Timetable</h1>
          </div>

          {canShowGrid && (
            <div className="tt-controls">
              <div className="tt-control">
                <label htmlFor="tt-term">Term</label>
                <select
                  id="tt-term"
                  value={termId ?? ""}
                  onChange={(e) => setTermId(Number(e.target.value))}
                >
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {prettyTermName(term.name)}
                      {yearById[term.academic_year]
                        ? ` ${yearById[term.academic_year]}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tt-control">
                <label htmlFor="tt-class">Class</label>
                <select
                  id="tt-class"
                  value={classId ?? ""}
                  onChange={(e) => setClassId(Number(e.target.value))}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {missing.length > 0 && (
          <div className="tt-banner">
            <strong>Before you can build a timetable you also need:</strong>{" "}
            {missing.join(", ")}.{" "}
            <a href={ADMIN_URL} target="_blank" rel="noreferrer">
              Open Django admin
            </a>
            .
          </div>
        )}

        {lessonsError && <p className="tt-error">{lessonsError}</p>}

        {canShowGrid && (
          <div className={`tt-card ${lessonsLoading ? "tt-loading" : ""}`}>
            <div className="tt-summary">
              <span className="tt-strong">{classById[classId]?.name}</span>
              <span className="tt-muted">
                {classLessons.length} of {totalSlots} lessons filled
              </span>
            </div>

            <TimetableCalendar
              periods={periods}
              lessons={classLessons}
              metaFor={(lesson) =>
                lesson.teacher_name + (lesson.room ? ` · ${lesson.room}` : "")
              }
              onSlotClick={(day, period, lesson) =>
                setEditing({ day, period, lesson })
              }
            />
          </div>
        )}
      </div>

      {editing && (
        <LessonEditor
          key={`${editing.day}-${editing.period.id}`}
          slot={editing}
          className={classById[classId]?.name}
          termId={termId}
          classId={classId}
          subjects={subjects}
          teachers={teachers}
          busy={busyAt(editing.day, editing.period.id)}
          nextPeriod={editingNextPeriod}
          nextPeriodOccupied={Boolean(editingNextPeriodLesson)}
          busyForDouble={
            editingNextPeriod
              ? busyAt(editing.day, editingNextPeriod.id)
              : {}
          }
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onCleared={handleCleared}
        />
      )}
    </div>
  );
}

export default Timetable;