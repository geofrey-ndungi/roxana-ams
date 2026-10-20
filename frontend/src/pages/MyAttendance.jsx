import { useState, useEffect } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "../api/axios";
import { formatWeekdayShort, formatMonthDay, plural } from "../utils/format";
import "./MyAttendance.css";

const statusInfo = {
  PRESENT: { label: "Present", chip: "sa-chip-present", cell: "sa-day-present" },
  ABSENT: { label: "Absent", chip: "sa-chip-absent", cell: "sa-day-absent" },
  LATE: { label: "Late", chip: "sa-chip-late", cell: "sa-day-late" },
  EXCUSED: { label: "Excused", chip: "sa-chip-excused", cell: "sa-day-excused" },
};

const statTiles = [
  { key: "PRESENT", label: "Present", dot: "sa-dot-present" },
  { key: "ABSENT", label: "Absent", dot: "sa-dot-absent" },
  { key: "LATE", label: "Late", dot: "sa-dot-late" },
  { key: "EXCUSED", label: "Excused", dot: "sa-dot-excused" },
];

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const LOW_RATE_THRESHOLD = 75; // below this the rate turns rust

const pad = (n) => String(n).padStart(2, "0");

function PageShell({ children }) {
  return (
    <div className="sa-bg">
      <div className="sa-page">{children}</div>
    </div>
  );
}

function MyAttendance() {
  const { user } = useOutletContext();

  // Today as "2026-10-19", using this computer's own date
  const today = new Date().toLocaleDateString("en-CA");
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7)) - 1; // months count from 0

  const [records, setRecords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [viewMonth, setViewMonth] = useState({ year: todayYear, month: todayMonth });

  useEffect(() => {
    // Only students have an attendance record of their own
    if (user?.role !== "STUDENT") return;

    const loadRecords = async () => {
      try {
        // The server only sends a student their own records
        const response = await api.get("/attendance/");
        setRecords(response.data);
      } catch (err) {
        setError("Failed to load your attendance.");
        console.error(err);
      } finally {
        setLoaded(true);
      }
    };

    loadRecords();
  }, [user]);

  // Teachers and admins have their own pages. This one is for students.
  if (user?.role !== "STUDENT") return <Navigate to="/" replace />;

  if (error) {
    return (
      <PageShell>
        <p className="sa-error">{error}</p>
      </PageShell>
    );
  }

  if (!loaded) {
    return (
      <PageShell>
        <div className="sa-card sa-skeleton">
          <div className="sa-skel" style={{ height: 90 }}></div>
        </div>
        <div className="sa-card sa-skeleton">
          <div className="sa-skel" style={{ height: 340 }}></div>
        </div>
      </PageShell>
    );
  }

  // Look up a day's record quickly: byDate["2026-10-16"]
  const byDate = {};
  records.forEach((record) => {
    byDate[record.date] = record;
  });

  // Totals across every recorded day
  const totals = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
  records.forEach((record) => {
    if (totals[record.status] !== undefined) totals[record.status] += 1;
  });
  const recorded = records.length;

  // A late student still came to school, so Late counts as attended.
  const attended = totals.PRESENT + totals.LATE;
  const rate = recorded ? Math.round((attended / recorded) * 1000) / 10 : null;
  const rateIsLow = rate !== null && rate < LOW_RATE_THRESHOLD;

  // The month on screen
  const { year, month } = viewMonth;
  const monthKey = `${year}-${pad(month + 1)}`;
  const isCurrentMonth = year === todayYear && month === todayMonth;

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const changeMonth = (delta) => {
    // Date.UTC rolls over by itself: month 12 becomes January of next year
    const next = new Date(Date.UTC(year, month + delta, 1));
    setViewMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };

  // Build the calendar: empty cells first, then one cell per day.
  // The week starts on Monday, so Sunday (0) becomes 6.
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  // Days this month that were not "Present", for the list below
  const monthRecords = records.filter((r) => r.date.startsWith(monthKey));
  const daysToNote = monthRecords.filter((r) => r.status !== "PRESENT");

  return (
    <PageShell>
      <div className="sa-top">
        <h1 className="sa-title">My attendance</h1>
        <p className="sa-subtitle">
          {user.school_class || "No class yet"}
          {user.academic_year ? ` · ${user.academic_year}` : ""}
        </p>
      </div>

      {recorded === 0 ? (
        <div className="sa-card sa-empty">
          <div className="sa-empty-title">No attendance recorded yet</div>
          <p>
            Your attendance will appear here once your class teacher starts
            recording it.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="sa-card sa-stats">
            <div className="sa-stat sa-stat-rate">
              <div className="sa-stat-label">Attendance rate</div>
              <div className={`sa-stat-value ${rateIsLow ? "sa-rate-low" : ""}`}>
                {rate}%
              </div>
              <div className="sa-stat-caption">{plural(recorded, "day")} recorded</div>
            </div>

            {statTiles.map((tile) => (
              <div className="sa-stat" key={tile.key}>
                <div className="sa-stat-label">
                  <span className={`sa-dot ${tile.dot}`}></span>
                  {tile.label}
                </div>
                <div className="sa-stat-value">{totals[tile.key]}</div>
                <div className="sa-stat-caption">
                  {totals[tile.key] === 1 ? "day" : "days"}
                </div>
              </div>
            ))}
          </div>

          {/* Month calendar */}
          <div className="sa-card sa-pad">
            <div className="sa-cal-head">
              <h2 className="sa-card-title">{monthLabel}</h2>

              <div className="sa-month-nav">
                <button
                  type="button"
                  className="sa-month-btn"
                  onClick={() => changeMonth(-1)}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  className="sa-month-btn"
                  onClick={() => changeMonth(1)}
                  disabled={isCurrentMonth}
                  aria-label="Next month"
                >
                  <ChevronRight size={16} strokeWidth={1.75} />
                </button>
              </div>
            </div>

            <div className="sa-cal">
              {weekdays.map((name) => (
                <div className="sa-weekday" key={name}>
                  {name}
                </div>
              ))}

              {cells.map((day, index) => {
                if (day === null) {
                  return <div className="sa-day sa-day-empty" key={`blank-${index}`}></div>;
                }

                const key = `${monthKey}-${pad(day)}`;
                const record = byDate[key];
                const info = record ? statusInfo[record.status] : null;
                const isWeekend = index % 7 >= 5;
                const isFuture = key > today;

                const classes = ["sa-day"];
                if (info) classes.push(info.cell);
                if (!info && isWeekend) classes.push("sa-day-weekend");
                if (isFuture) classes.push("sa-day-future");
                if (key === today) classes.push("sa-day-today");

                // The hover text: "Present", or "Excused: Medical appointment"
                const hoverText = info
                  ? `${info.label}${record.reason ? `: ${record.reason}` : ""}`
                  : "No record";

                return (
                  <div className={classes.join(" ")} key={key} title={hoverText}>
                    <span className="sa-day-number">{day}</span>
                    {info && <span className="sa-day-label">{info.label}</span>}
                  </div>
                );
              })}
            </div>

            <div className="sa-legend">
              {statTiles.map((tile) => (
                <span key={tile.key}>
                  <span className={`sa-dot ${tile.dot}`}></span> {tile.label}
                </span>
              ))}
              
            </div>
          </div>

          {/* Days to note this month */}
          <div className="sa-card sa-pad">
            <h2 className="sa-card-title">Days to note in {monthLabel}</h2>

            {monthRecords.length === 0 ? (
              <p className="sa-none">No attendance was recorded for this month.</p>
            ) : daysToNote.length === 0 ? (
              <p className="sa-none">
                Present on every recorded day this month. Well done.
              </p>
            ) : (
              <div className="sa-notes">
                {daysToNote.map((record) => (
                  <div className="sa-note" key={record.id}>
                    <span className="sa-note-date">
                      {formatWeekdayShort(record.date)}, {formatMonthDay(record.date)}
                    </span>
                    <span className={`sa-chip ${statusInfo[record.status].chip}`}>
                      {statusInfo[record.status].label}
                    </span>
                    <span className="sa-note-reason">{record.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}

export default MyAttendance;