import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Download,
  ClipboardCheck,
  ExternalLink,
  ArrowRight,
  TriangleAlert,
  CircleCheck,
  DoorOpen,
  RotateCw,
} from "lucide-react";
import api from "../api/axios";
import "./TeacherDashboard.css";

// One place that describes each status: its label, chip colour,
// and what the "Follow-up" column says for it.
const statusInfo = {
  PRESENT: { label: "Present", chip: "td-chip-present", follow: "No attendance action" },
  ABSENT: { label: "Absent", chip: "td-chip-absent", follow: "Review absence" },
  LATE: { label: "Late", chip: "td-chip-late", follow: "Arrived late" },
  EXCUSED: { label: "Excused", chip: "td-chip-excused", follow: "Excused absence" },
};

const notMarkedInfo = {
  label: "Not marked",
  chip: "td-chip-none",
  follow: "Attendance not yet recorded",
};

// "2026-10-15" becomes "Thursday, October 15".
// timeZone "UTC" stops the day from shifting by one in some browsers.
const formatDayLong = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

// "2026-10-15" becomes "Thu, Oct 15".
const formatDayShort = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// "2026-10-15" becomes "Thu 15". Short enough to fit 7 labels in a row.
const formatDayTiny = (iso) => {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const day = date.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
  return `${weekday} ${day}`;
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
};

// plural(1, "student") gives "1 student", plural(3, "student") gives "3 students".
const plural = (n, word, pluralWord) =>
  `${n} ${n === 1 ? word : pluralWord || word + "s"}`;

// "Ann, Ben, Cara +2 more"
const listNames = (students) => {
  const names = students.map((s) => s.name);
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
};

function DashboardShell({ children }) {
  return (
    <div className="td-bg">
      <div className="td-page">{children}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="td-skeleton">
        <div className="td-skel-bar" style={{ width: 220, height: 28 }}></div>
        <div className="td-skel-bar" style={{ width: 260, marginTop: 12 }}></div>
      </div>
      <div className="td-card td-skeleton">
        <div className="td-skel-block" style={{ height: 100 }}></div>
      </div>
      <div className="td-card td-skeleton">
        <div className="td-skel-block" style={{ height: 220 }}></div>
      </div>
      <div className="td-card td-skeleton">
        <div className="td-skel-block" style={{ height: 220 }}></div>
      </div>
    </>
  );
}

// What the hover box shows for each day. To add Late, add one more line here.
const tooltipRows = [
  { key: "PRESENT", label: "Present", dot: "td-dot-present" },
  { key: "ABSENT", label: "Absent", dot: "td-dot-absent" },
  { key: "LATE", label: "Late", dot: "td-dot-late" },
  { key: "EXCUSED", label: "Excused", dot: "td-dot-excused" },
];

// The line chart: Present and Absent over time.
// "day" view compares the previous day with today.
// "week" view shows the last 7 days that have attendance recorded.
function ComparisonChart({ data, view }) {
  // Which day the mouse is on (0 = the first day). null = none.
  // Hooks go first, before any "return", so React runs them in the same order every time.
  const [hovered, setHovered] = useState(null);

  const { previous, counts, marked, student_count, marked_count, history } = data;
  const todayPartial = marked && marked_count < student_count;

  // Build the list of points to draw. Each point is one day.
  let points = [];

  if (view === "week") {
    points = history.map((day) => ({
      key: day.date,
      label: formatDayTiny(day.date),
      sub: day.date === data.today && todayPartial ? "Partial" : "",
      present: day.counts.PRESENT,
      absent: day.counts.ABSENT,
      counts: day.counts,
    }));

    if (points.length === 0) {
      return (
        <p className="td-chart-empty">
          No attendance has been recorded yet. Once you save attendance, the
          last 7 days will appear here.
        </p>
      );
    }
  } else {
    if (!previous) {
      return (
        <p className="td-chart-empty">
          There is no earlier day to compare with yet. Once attendance has been
          recorded on another day, it will appear here.
        </p>
      );
    }

    points = [
      {
        key: previous.date,
        label: formatDayShort(previous.date),
        sub: "",
        present: previous.counts.PRESENT,
        absent: previous.counts.ABSENT,
        counts: previous.counts,
      },
    ];

    // Today is drawn only once some attendance has been recorded
    if (marked) {
      points.push({
        key: data.today,
        label: formatDayShort(data.today),
        sub: todayPartial ? "Partial" : "",
        present: counts.PRESENT,
        absent: counts.ABSENT,
        counts: counts,
      });
    }
  }

  // Chart size and the empty space around the plotted area
  const W = 560;
  const H = 256;
  const pad = { left: 44, right: 64, top: 22, bottom: 62 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Choose a neat top value and step for the left-hand numbers
  const maxValue = Math.max(1, ...points.flatMap((p) => [p.present, p.absent]));
  const step = maxValue <= 4 ? 1 : Math.ceil(maxValue / 4);
  const top = Math.ceil(maxValue / step) * step;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);

  // Spread the points evenly from 12% to 88% across the width
  const xFor = (i) =>
    points.length === 1
      ? pad.left + plotW / 2
      : pad.left + plotW * (0.12 + 0.76 * (i / (points.length - 1)));
  const yFor = (value) => pad.top + plotH * (1 - value / top);

  // "M x y L x y" is how SVG describes a line through points
  const linePath = (key) =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p[key])}`)
      .join(" ");

  const todayIncluded = points.some((p) => p.key === data.today);

  // The day the mouse is on, and where to put the box.
  // The box is placed with percentages, so it follows the chart when it shrinks.
  const active = hovered !== null ? points[hovered] : null;
  let tooltipStyle = {};

  if (active) {
    const leftPct = (xFor(hovered) / W) * 100;
    const highY = Math.min(yFor(active.present), yFor(active.absent));
    const lowY = Math.max(yFor(active.present), yFor(active.absent));

    // Dots near the top of the chart: put the box underneath them instead
    const below = highY / H < 0.4;

    // Near the left or right edge, slide the box sideways so it isn't cut off
    const shift = leftPct < 20 ? "-15%" : leftPct > 80 ? "-85%" : "-50%";

    tooltipStyle = {
      left: `${leftPct}%`,
      top: `${((below ? lowY : highY) / H) * 100}%`,
      transform: below
        ? `translate(${shift}, 16px)`
        : `translate(${shift}, calc(-100% - 16px))`,
    };
  }

  return (
    <div>
      <div className="td-chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="td-chart"
          role="img"
          aria-label="Present and absent counts over time"
        >
          <text className="td-chart-axis-title" x={pad.left} y={12}>
            Recorded count
          </text>

          {ticks.map((v) => (
            <g key={v}>
              <line
                className="td-chart-grid"
                x1={pad.left}
                x2={W - pad.right}
                y1={yFor(v)}
                y2={yFor(v)}
              />
              <text
                className="td-chart-tick"
                x={pad.left - 10}
                y={yFor(v) + 4}
                textAnchor="end"
              >
                {v}
              </text>
            </g>
          ))}

          {points.length > 1 && (
            <>
              <path className="td-line-absent" d={linePath("absent")} />
              <path className="td-line-present" d={linePath("present")} />
            </>
          )}

          {points.map((p, i) => {
            const x = xFor(i);
            const same = p.present === p.absent;
            const presentOnTop = p.present >= p.absent;
            const isActive = hovered === i;

            // Mouse handlers, shared by both invisible hover targets below
            const hoverProps = {
              onMouseEnter: () => setHovered(i),
              onMouseLeave: () => setHovered(null),
            };

            return (
              <g key={p.key}>
                {isActive && (
                  <line
                    className="td-guide"
                    x1={x}
                    x2={x}
                    y1={pad.top}
                    y2={pad.top + plotH}
                  />
                )}

                <circle
                  className={`td-pt-absent ${isActive ? "td-pt-active" : ""}`}
                  cx={x}
                  cy={yFor(p.absent)}
                  r="4"
                />
                <circle
                  className={`td-pt-present ${isActive ? "td-pt-active" : ""}`}
                  cx={x}
                  cy={yFor(p.present)}
                  r="4"
                />

                {same ? (
                  <text
                    className="td-chart-value"
                    x={x}
                    y={yFor(p.present) - 10}
                    textAnchor="middle"
                  >
                    {p.present} each
                  </text>
                ) : (
                  <>
                    {/* The higher value goes above its point, the lower below,
                        so the two numbers never sit on top of each other. */}
                    <text
                      className="td-chart-value"
                      x={x}
                      y={yFor(p.present) + (presentOnTop ? -10 : 16)}
                      textAnchor="middle"
                    >
                      {p.present}
                    </text>
                    <text
                      className="td-chart-value"
                      x={x}
                      y={yFor(p.absent) + (presentOnTop ? 16 : -10)}
                      textAnchor="middle"
                    >
                      {p.absent}
                    </text>
                  </>
                )}

                <text
                  className="td-chart-xlabel"
                  x={x}
                  y={H - 26}
                  textAnchor="middle"
                >
                  {p.label}
                </text>
                {p.sub && (
                  <text
                    className="td-chart-sub"
                    x={x}
                    y={H - 12}
                    textAnchor="middle"
                  >
                    {p.sub}
                  </text>
                )}

                {/* Invisible, bigger circles on top: an easy target for the mouse.
                    The present one can also be reached with the Tab key. */}
                <circle
                  className="td-hit"
                  cx={x}
                  cy={yFor(p.absent)}
                  r="14"
                  {...hoverProps}
                />
                <circle
                  className="td-hit"
                  cx={x}
                  cy={yFor(p.present)}
                  r="14"
                  tabIndex={0}
                  aria-label={`${formatDayLong(p.key)}: ${p.counts.PRESENT} present, ${p.counts.ABSENT} absent, ${p.counts.EXCUSED} excused`}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  {...hoverProps}
                />
              </g>
            );
          })}
        </svg>

        {/* The hover box */}
        {active && (
          <div className="td-tooltip" style={tooltipStyle} role="tooltip">
            <div className="td-tooltip-title">
              {formatDayLong(active.key)}
              {active.sub && <span className="td-tooltip-tag">{active.sub}</span>}
            </div>
            {tooltipRows.map((row) => (
              <div className="td-tooltip-row" key={row.key}>
                <span className="td-tooltip-label">
                  <span className={`td-dot ${row.dot}`}></span>
                  {row.label}
                </span>
                <span className="td-tooltip-value">{active.counts[row.key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="td-legend">
        <span>
          <span className="td-legend-swatch td-swatch-present"></span> Present
        </span>
        <span>
          <span className="td-legend-swatch td-swatch-absent"></span> Absent
        </span>
      </div>

      <p className="td-chart-note">
        {view === "week"
          ? `Showing the last ${plural(points.length, "recorded day")}.${
              todayIncluded ? "" : " Today hasn't been recorded yet."
            }${todayPartial ? " Today's register is not yet complete." : ""}`
          : !marked
          ? "Today's register hasn't been started."
          : todayPartial
          ? "Today's register is not yet complete."
          : "Today's register is complete."}
      </p>
    </div>
  );
}


function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("week"); // "day" or "week"

  const loadDashboard = async () => {
    setError("");
    setData(null);
    try {
      const response = await api.get("/teacher/dashboard/");
      setData(response.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError("This dashboard is for teachers only.");
      } else {
        setError("Failed to load the dashboard.");
      }
      console.error(err);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (error) {
    return (
      <DashboardShell>
        <p className="td-error">{error}</p>
      </DashboardShell>
    );
  }



  if (!data) {
    return (
      <DashboardShell>
        <DashboardSkeleton />
      </DashboardShell>
    );
  }

  // A teacher who has no class yet
  if (!data.school_class) {
    return (
      <DashboardShell>
        <div className="td-card td-noclass">
          <div className="td-empty-icon">
            <DoorOpen size={24} strokeWidth={1.5} />
          </div>
          <h2 className="td-card-title">No class assigned yet</h2>
          <p className="td-empty-text">
            You haven't been assigned a class yet. Please contact the school
            administrator.
          </p>
          <button type="button" className="td-btn td-btn-light" onClick={loadDashboard}>
            <RotateCw size={16} strokeWidth={1.75} />
            <span>Check again</span>
          </button>
        </div>
      </DashboardShell>
    );
  }

  const students = data.students;
  const total = data.student_count;
  const recorded = data.marked_count;
  const notMarkedCount = total - recorded;
  const fullyMarked = total > 0 && recorded === total;
  const unmarkedStudents = students.filter((s) => !s.status);
  const absentStudents = students.filter((s) => s.status === "ABSENT");
  const percentRecorded = total ? (recorded / total) * 100 : 0;

  // The small tag in the top right of the attendance card
  let registerTag;
  if (recorded === 0) {
    registerTag = { text: "Not recorded", cls: "td-tag-warn" };
  } else if (!fullyMarked) {
    registerTag = { text: "Partially recorded", cls: "td-tag-warn" };
  } else {
    registerTag = { text: "Fully recorded", cls: "td-tag-ok" };
  }

  // With a few students the bar is one segment each. With a big class
  // that would be a row of tiny slivers, so we use one smooth bar.
  const useSegments = total > 0 && total <= 12;

  // Downloads today's register as a CSV file that Excel can open.
  const exportReport = () => {
    const rows = [["Student", "Status"]];
    students.forEach((s) => {
      rows.push([s.name, s.status ? statusInfo[s.status].label : "Not marked"]);
    });

    // Every cell goes in quotes, with any quote inside it doubled,
    // so names containing commas or quotes can't break the columns.
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // The "\uFEFF" at the start makes Excel read names in UTF-8 correctly.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.school_class}-attendance-${data.today}.csv`
      .replace(/\s+/g, "-")
      .toLowerCase();
    link.click();

    URL.revokeObjectURL(url);
  };

  const stats = [
    {
      key: "PRESENT",
      label: "Present",
      value: data.counts.PRESENT,
      sub: `of ${plural(total, "student")}`,
      dot: "td-dot-present",
    },
    {
      key: "ABSENT",
      label: "Absent",
      value: data.counts.ABSENT,
      sub: data.counts.ABSENT > 0 ? "needs review" : "none recorded",
      dot: "td-dot-absent",
      alert: data.counts.ABSENT > 0,
    },
    {
      key: "NOT_MARKED",
      label: "Not marked",
      value: notMarkedCount,
      sub: notMarkedCount > 0 ? "awaiting a status" : "register complete",
      dot: "td-dot-warn",
    },
    {
      key: "LATE",
      label: "Late",
      value: data.counts.LATE,
      sub: "recorded today",
      dot: "td-dot-late",
    },
    {
      key: "EXCUSED",
      label: "Excused",
      value: data.counts.EXCUSED,
      sub: "recorded today",
      dot: "td-dot-excused",
    },
  ];

  return (
    <DashboardShell>
      {/* Title and buttons */}
      <div className="td-top">
        <div>
          <h1 className="td-title">Class overview</h1>
          <div className="td-crumbs">
            <span>
              {data.school_class} · {data.academic_year}
            </span>
            <span className="td-sep">/</span>
            <span>{data.first_name}</span>
            <span className="td-sep">/</span>
            <span>{plural(total, "student")}</span>
          </div>
        </div>

        <div className="td-actions">
          <button type="button" className="td-btn td-btn-light" onClick={exportReport}>
            <Download size={16} strokeWidth={1.75} />
            <span>Export report</span>
          </button>
          <Link to="/attendance" className="td-btn td-btn-dark">
            <ClipboardCheck size={16} strokeWidth={1.75} />
            <span>{fullyMarked ? "Edit attendance" : "Mark attendance"}</span>
          </Link>
        </div>
      </div>

      {/* Today's attendance: the five numbers */}
      <div className="td-card">
        <div className="td-card-head">
          <div className="td-head-left">
            <h2 className="td-card-title">Today's attendance</h2>
            <span className="td-muted">
              {recorded} of {plural(total, "student")} recorded
            </span>
          </div>
          <span className={`td-tag ${registerTag.cls}`}>{registerTag.text}</span>
        </div>

        <div className="td-stats">
          {stats.map((stat) => (
            <div className="td-stat" key={stat.key}>
              <div className="td-stat-label">
                <span className={`td-dot ${stat.dot}`}></span>
                {stat.label}
              </div>
              <div className={`td-stat-value ${stat.alert ? "td-stat-alert" : ""}`}>
                {stat.value}
              </div>
              <div className="td-stat-sub">{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Register completion and day comparison */}
      <div className="td-row2">
        <div className="td-card">
          <h2 className="td-card-title">Register completion</h2>
          <div className="td-muted td-under-title">
            Today · {formatDayLong(data.today)}
          </div>

          <div className="td-fraction">
            <span className="td-fraction-num">
              {recorded} / {total}
            </span>
            <span className="td-muted">students recorded</span>
          </div>

          <div className="td-progress" aria-hidden="true">
            {useSegments ? (
              students.map((s, i) => (
                <span
                  key={s.enrollment_id}
                  className={`td-seg ${i < recorded ? "td-seg-on" : ""}`}
                ></span>
              ))
            ) : (
              <span className="td-bar">
                <span className="td-bar-fill" style={{ width: `${percentRecorded}%` }}></span>
              </span>
            )}
          </div>

          <div className={`td-notice ${fullyMarked ? "td-notice-ok" : ""}`}>
            {fullyMarked ? (
  <CircleCheck size={16} strokeWidth={1.75} />
) : (
  <TriangleAlert size={16} strokeWidth={1.75} />
)}
            <span>
              {fullyMarked
                ? "Register complete. Today's totals include every student."
                : recorded === 0
                ? "Attendance hasn't been recorded yet. Mark attendance to start today's register."
                : `${plural(notMarkedCount, "student")} still ${
                    notMarkedCount === 1 ? "needs" : "need"
                  } a status. Complete the register before using today's totals.`}
            </span>
          </div>
        </div>

        <div className="td-card">
          <div className="td-chart-head">
            <div>
              <h2 className="td-card-title">
                {view === "week" ? "Weekly comparison" : "Day comparison"}
              </h2>
              <div className="td-muted td-under-title">
                {view === "week"
                  ? "Recorded counts · last 7 recorded days"
                  : "Recorded counts · today and the previous day"}
              </div>
            </div>

            <div className="td-toggle" role="tablist" aria-label="Comparison range">
              <button
                type="button"
                role="tab"
                aria-selected={view === "day"}
                className={`td-toggle-btn ${view === "day" ? "active" : ""}`}
                onClick={() => setView("day")}
              >
                Day
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "week"}
                className={`td-toggle-btn ${view === "week" ? "active" : ""}`}
                onClick={() => setView("week")}
              >
                Week
              </button>
            </div>
          </div>

          <ComparisonChart key={view} data={data} view={view} />
        </div>
      </div>

      {/* Student register and needs attention */}
      <div className="td-row3">
        <div className="td-card td-card-flush">
          <div className="td-register-head">
            <div className="td-head-left">
              <h2 className="td-card-title">Student register</h2>
              <span className="td-count">{students.length}</span>
            </div>
            <span className="td-muted">All students · Today</span>
          </div>

          {students.length === 0 ? (
            <div className="td-empty-panel">
              <div className="td-empty-title">No students enrolled yet</div>
              <p className="td-empty-text">
                Students enrolled in {data.school_class} for {data.academic_year}{" "}
                will appear here.
              </p>
            </div>
          ) : (
            <div className="td-table-wrap">
              <table className="td-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Today's status</th>
                    <th className="td-col-follow">Follow-up</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const info = student.status
                      ? statusInfo[student.status]
                      : notMarkedInfo;

                    return (
                      <tr key={student.enrollment_id}>
                        <td>
                          <div className="td-student">
                            {student.photo ? (
                              <img
                                src={student.photo}
                                alt={student.name}
                                className="td-avatar"
                              />
                            ) : (
                              <div className="td-avatar">{getInitials(student.name)}</div>
                            )}
                            <span>{student.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`td-chip ${info.chip}`}>{info.label}</span>
                        </td>
                        <td className="td-col-follow td-follow">{info.follow}</td>
                        <td>
                          <Link to="/attendance" className="td-action">
                            {student.status ? "View record" : "Mark status"}
                            <ExternalLink size={12} strokeWidth={1.75} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="td-table-foot">
            Showing all {plural(students.length, "student")} in {data.school_class}
          </div>
        </div>

        <div className="td-card">
          <h2 className="td-card-title">Needs attention</h2>
          <div className="td-muted td-under-title">Attendance follow-up for today</div>

          {unmarkedStudents.length === 0 && absentStudents.length === 0 ? (
            <p className="td-clear">
              <FontAwesomeIcon icon={faCircleCheck} /> Nothing needs attention
              right now.
            </p>
          ) : (
            <div className="td-attention">
              {unmarkedStudents.length > 0 && (
                <div className="td-attention-item">
                  <div className="td-attention-title">
                    Record {plural(unmarkedStudents.length, "remaining status", "remaining statuses")}
                  </div>
                  <div className="td-muted">
                    {listNames(unmarkedStudents)} · Not marked
                  </div>
                  <Link to="/attendance" className="td-attention-link">
                    Open attendance <ExternalLink size={12} strokeWidth={1.75} />
                  </Link>
                </div>
              )}

              {absentStudents.length > 0 && (
                <div className="td-attention-item">
                  <div className="td-attention-title">
                    Review {plural(absentStudents.length, "absence")}
                  </div>
                  <div className="td-muted">{listNames(absentStudents)} · Absent</div>
                  <p className="td-attention-note">
                    Absence reason and contact history are not available in this
                    report.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="td-footer">
        <span>
          {data.school_class} · {data.academic_year}
        </span>
        <span>Today's figures include recorded statuses only.</span>
      </div>
    </DashboardShell>
  );
}

export default TeacherDashboard;