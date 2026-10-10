import { useState, useEffect, useRef } from "react";
import api from "../api/axios";
// import Header from "../components/Header";
import "./Attendance.css";

function Attendance() {
  const [schoolClass, setSchoolClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
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

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");

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

      setSaveMessage(`Attendance saved for ${schoolClass?.name || "class"}`);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2800);
    } catch (err) {
      setSaveMessage("Failed to save attendance. Please try again.");
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2800);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Turns "Maya Lin" into "ML", for the round avatar circle.
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  const changeDateBy = (days) => {
  const current = new Date(date);
  current.setDate(current.getDate() + days);
  setDate(current.toISOString().split("T")[0]);
};

  // Count how many students currently have each status, for the metric tiles.
  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
  students.forEach((enrollment) => {
    const status = records[enrollment.id]?.status;
    if (status && counts[status] !== undefined) {
      counts[status] += 1;
    }
  });

  const markedCount = Object.values(records).filter((r) => r.status).length;

  const statusOptions = [
    { value: "PRESENT", label: "Present", className: "present" },
    { value: "ABSENT", label: "Absent", className: "absent" },
    { value: "LATE", label: "Late", className: "late" },
    { value: "EXCUSED", label: "Excused", className: "excused" },
  ];

  return (
    <>

      <div className={`save-toast ${toastVisible ? "visible" : ""}`}>
        {saveMessage}
      </div>

      <div className="attendance-page">
        {error && <p style={{ color: "red" }}>{error}</p>}

        <div className="attendance-topbar">
          <div className="attendance-title">
            <h2>{schoolClass ? schoolClass.name : "Attendance"}</h2>
            <div className="attendance-subtitle">
              {students.length} enrolled
            </div>
          </div>

          <div className="date-pill" onClick={() => dateInputRef.current?.showPicker()}>
  <button
    type="button"
    className="date-arrow"
    onClick={(e) => {
      e.stopPropagation();
      changeDateBy(-1);
    }}
    aria-label="Previous day"
  >
    ‹
  </button>

  <span className="date-text">
    {new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })}
  </span>

  <input
    ref={dateInputRef}
    type="date"
    value={date}
    onChange={(e) => setDate(e.target.value)}
    className="date-input-hidden"
  />

  <button
    type="button"
    className="date-arrow"
    onClick={(e) => {
      e.stopPropagation();
      changeDateBy(1);
    }}
    aria-label="Next day"
  >
    ›
  </button>
</div>
        </div>

        <div className="metrics-row">
          <div className="metric-tile">
            <div>
              <div className="count">{counts.PRESENT}</div>
              <div className="label">
                <span className="metric-dot dot-present"></span> Present
              </div>
            </div>
          </div>
          <div className="metric-tile">
            <div>
              <div className="count">{counts.ABSENT}</div>
              <div className="label">
                <span className="metric-dot dot-absent"></span> Absent
              </div>
            </div>
          </div>
          <div className="metric-tile">
            <div>
              <div className="count">{counts.LATE}</div>
              <div className="label">
                <span className="metric-dot dot-late"></span> Late
              </div>
            </div>
          </div>
          <div className="metric-tile">
            <div>
              <div className="count">{counts.EXCUSED}</div>
              <div className="label">
                <span className="metric-dot dot-excused"></span> Excused
              </div>
            </div>
          </div>
        </div>

        <div className="student-list">
          {students.map((enrollment) => {
            const record = records[enrollment.id] || {
              status: "PRESENT",
              reason: "",
            };

            return (
              <div className="student-card" key={enrollment.id}>
                <div className="student-row">
                  <div className="student-info">
                    <div className="avatar">
                      {getInitials(enrollment.student_name)}
                    </div>
                    <div className="student-name">
                      {enrollment.student_name}
                    </div>
                  </div>

                  <div className="status-control">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`status-btn ${
                          record.status === option.value
                            ? `active ${option.className}`
                            : ""
                        }`}
                        onClick={() =>
                          updateRecord(enrollment.id, "status", option.value)
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {record.status === "EXCUSED" && (
                  <div className="excuse-row">
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

        <div className="save-bar">
          <div className="save-bar-status">{markedCount} of {students.length} marked</div>
          <button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      </div>
    </>
  );
}

export default Attendance;