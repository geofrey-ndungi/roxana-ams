import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faCalendarDays,
  faUsers,
  faCheck,
  faFloppyDisk,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import "./Attendance.css";

const statusOptions = [
  { value: "PRESENT", label: "Present", cls: "present" },
  { value: "ABSENT", label: "Absent", cls: "absent" },
  { value: "LATE", label: "Late", cls: "late" },
  { value: "EXCUSED", label: "Excused", cls: "excused" },
];

const statTiles = [
  { key: "PRESENT", label: "Present", dot: "at-dot-present" },
  { key: "ABSENT", label: "Absent", dot: "at-dot-absent" },
  { key: "LATE", label: "Late", dot: "at-dot-late" },
  { key: "EXCUSED", label: "Excused", dot: "at-dot-excused" },
];

// Turns "Maya Lin" into "ML", for the round avatar.
const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
};

function Attendance() {
  const [schoolClass, setSchoolClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  // "en-CA" writes dates as 2026-10-16, and uses this computer's own date.
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const dateInputRef = useRef(null);

  useEffect(() => {
    const loadClassAndStudents = async () => {
      try {
        const classResponse = await api.get("/school-classes/?mine=true");

        if (classResponse.data.length === 0) {
          setError("You are not assigned as a class teacher for any class.");
          return;
        }

        const myClass = classResponse.data[0];
        setSchoolClass(myClass);

        const enrollmentsResponse = await api.get(
          `/enrollments/?school_class=${myClass.id}`
        );
        setStudents(enrollmentsResponse.data);

        // Everyone starts as Present. The teacher changes the exceptions.
        const initialRecords = {};
        enrollmentsResponse.data.forEach((enrollment) => {
          initialRecords[enrollment.id] = { status: "PRESENT", reason: "" };
        });
        setRecords(initialRecords);
      } catch (err) {
        setError("Failed to load class data.");
        console.error(err);
      }
    };

    loadClassAndStudents();
  }, []);

  const updateRecord = (enrollmentId, field, value) => {
    setRecords((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [field]: value,
      },
    }));
  };

  const showToast = (message, failed) => {
    setSaveMessage(message);
    setSaveFailed(failed);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2800);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      for (const enrollment of students) {
        const record = records[enrollment.id];

        await api.post("/attendance/", {
          enrollment: enrollment.id,
          date: date,
          status: record.status,
          reason: record.status === "EXCUSED" ? record.reason : "",
        });
      }

      showToast(`Attendance saved for ${schoolClass?.name || "class"}`, false);
    } catch (err) {
      showToast("Failed to save attendance. Please try again.", true);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Moves the date by a number of days. The UTC methods keep the result
  // the same whatever time zone this computer is set to.
  const changeDateBy = (days) => {
    const current = new Date(date);
    current.setUTCDate(current.getUTCDate() + days);
    setDate(current.toISOString().split("T")[0]);
  };

  // "2026-10-16" becomes "Fri, Oct 16, 2026"
  const prettyDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  // How many students have each status right now
  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
  students.forEach((enrollment) => {
    const status = records[enrollment.id]?.status;
    if (status && counts[status] !== undefined) {
      counts[status] += 1;
    }
  });

  const markedCount = students.filter((s) => records[s.id]?.status).length;
  const allMarked = students.length > 0 && markedCount === students.length;

  // The small line under each number: "All students", "No students", "2 students"
  const statCaption = (count) => {
    if (count === 0) return "No students";
    if (count === students.length) return "All students";
    return `${count} ${count === 1 ? "student" : "students"}`;
  };

  return (
    <div className="at-bg">
      <div className={`at-toast ${saveFailed ? "at-toast-error" : ""} ${toastVisible ? "visible" : ""}`}>
        {saveMessage}
      </div>

      <div className="at-page">
        {error && <p className="at-error">{error}</p>}

        {/* Title and date */}
        <div className="at-top">
          <h1 className="at-title">Attendance</h1>

          <div
            className="at-date"
            onClick={() => dateInputRef.current?.showPicker()}
          >
            <button
              type="button"
              className="at-date-arrow"
              onClick={(e) => {
                e.stopPropagation();
                changeDateBy(-1);
              }}
              aria-label="Previous day"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <span className="at-date-text">
              <FontAwesomeIcon icon={faCalendarDays} />
              {prettyDate}
            </span>

            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="at-date-input"
            />

            <button
              type="button"
              className="at-date-arrow"
              onClick={(e) => {
                e.stopPropagation();
                changeDateBy(1);
              }}
              aria-label="Next day"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </div>

        {/* Class name and number of students */}
        <div className="at-class-line">
          <span className="at-class-name">
            {schoolClass ? schoolClass.name : "Your class"}
          </span>
          <span className="at-class-sep"></span>
          <span className="at-class-count">
            <FontAwesomeIcon icon={faUsers} />
            {students.length} enrolled
          </span>
        </div>

        {/* The four numbers */}
        <div className="at-card at-stats">
          {statTiles.map((tile) => (
            <div className="at-stat" key={tile.key}>
              <div className="at-stat-num">{counts[tile.key]}</div>
              <div>
                <div className="at-stat-label">
                  <span className={`at-dot ${tile.dot}`}></span>
                  {tile.label}
                </div>
                <div className="at-stat-caption">{statCaption(counts[tile.key])}</div>
              </div>
            </div>
          ))}
        </div>

        {/* The class register */}
        <div className="at-card at-register">
          <div className="at-register-head">
            <div className="at-register-title">
              Class register
              <span className="at-count">{students.length}</span>
            </div>
            <span className="at-hint">Select a status for each student</span>
          </div>

          <div className="at-cols">
            <span>No.</span>
            <span>Student</span>
            <span>Attendance status</span>
          </div>

          {students.length === 0 ? (
            <p className="at-empty">
              {error ? "No class to show." : "No students are enrolled in this class yet."}
            </p>
          ) : (
            <div className="at-rows">
              {students.map((enrollment, index) => {
                const record = records[enrollment.id] || {
                  status: "PRESENT",
                  reason: "",
                };

                return (
                  <div className="at-row" key={enrollment.id}>
                    <span className="at-num">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="at-student">
                      <div className="at-avatar">
                        {getInitials(enrollment.student_name)}
                      </div>
                      <span className="at-student-name">
                        {enrollment.student_name}
                      </span>
                    </div>

                    <div
                      className="at-control"
                      role="radiogroup"
                      aria-label={`Attendance for ${enrollment.student_name}`}
                    >
                      {statusOptions.map((option) => {
                        const selected = record.status === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            className={`at-opt ${
                              selected ? `at-opt-on at-opt-${option.cls}` : ""
                            }`}
                            onClick={() =>
                              updateRecord(enrollment.id, "status", option.value)
                            }
                          >
                            {selected && option.value === "PRESENT" && (
                              <FontAwesomeIcon icon={faCheck} />
                            )}
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* The school wants a reason for excused absences */}
                    {record.status === "EXCUSED" && (
                      <div className="at-reason">
                        <input
                          type="text"
                          placeholder="Reason for excuse..."
                          value={record.reason}
                          onChange={(e) =>
                            updateRecord(enrollment.id, "reason", e.target.value)
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer: how many are marked, and the Save button */}
          <div className="at-foot">
            <div className="at-foot-left">
              <div className={`at-foot-icon ${allMarked ? "" : "at-foot-icon-wait"}`}>
                <FontAwesomeIcon icon={faCheck} />
              </div>
              <div>
                <div className="at-foot-title">
                  {markedCount} of {students.length} marked
                </div>
                <div className="at-foot-sub">
                  {allMarked
                    ? `Ready to save for ${prettyDate}`
                    : "Select a status for every student"}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="at-save"
              onClick={handleSave}
              disabled={saving || students.length === 0}
            >
              <FontAwesomeIcon icon={faFloppyDisk} />
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>

        <p className="at-note">
          <FontAwesomeIcon icon={faCircleInfo} />
          Attendance is recorded for the selected date. Review your selections
          before saving.
        </p>
      </div>
    </div>
  );
}

export default Attendance;