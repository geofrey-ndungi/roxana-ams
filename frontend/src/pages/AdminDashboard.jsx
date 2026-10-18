import { useState, useEffect } from "react";
import {
  Download,
  TriangleAlert,
  Search,
  CircleCheck,
  ExternalLink,
  Plus,
  DoorOpen,
  RotateCw,
} from "lucide-react";
import api from "../api/axios";
import {
  formatDayLong,
  formatWeekdayShort,
  formatMonthDay,
  plural,
  listNames,
  downloadCsv,
} from "../utils/format";
import "./AdminDashboard.css";

// Django's own admin site, where classes and teachers are managed for now.
const ADMIN_URL = `http://${window.location.hostname}:8000/admin/`;

// How each class status looks in the table
const classStatus = {
  RECORDED: { label: "Recorded", cls: "ad-chip-ok" },
  PARTLY_RECORDED: { label: "Partly recorded", cls: "ad-chip-warn" },
  NOT_MARKED: { label: "Not marked", cls: "ad-chip-warn" },
  NO_STUDENTS: { label: "No students", cls: "ad-chip-none" },
};

function DashboardShell({ children }) {
  return (
    <div className="ad-bg">
      <div className="ad-page">{children}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="ad-skeleton">
        <div className="ad-skel-bar" style={{ width: 220, height: 28 }}></div>
        <div className="ad-skel-bar" style={{ width: 280, marginTop: 12 }}></div>
      </div>
      <div className="ad-card ad-skeleton">
        <div className="ad-skel-block" style={{ height: 80 }}></div>
      </div>
      <div className="ad-card ad-skeleton">
        <div className="ad-skel-block" style={{ height: 220 }}></div>
      </div>
      <div className="ad-card ad-skeleton">
        <div className="ad-skel-block" style={{ height: 260 }}></div>
      </div>
    </>
  );
}

// Line chart of the school's present rate over the last recorded days.
// It is plain SVG. Every position is worked out from the rates.
function RateTrendChart({ trend, today }) {
  const points = trend.filter((day) => day.rate !== null);

  if (points.length < 3) {
    return (
      <div className="ad-chart-empty">
        <div className="ad-chart-empty-title">Not enough days recorded yet</div>
        <p>
          The trend needs at least 3 school days with recorded attendance. It
          will appear here as soon as there are.
        </p>
      </div>
    );
  }

  const W = 640;
  const H = 240;
  const pad = { left: 46, right: 24, top: 28, bottom: 52 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Choose a window a little wider than the data, in neat steps.
  const rates = points.map((p) => p.rate);
  let low = Math.max(0, Math.floor((Math.min(...rates) - 2) / 5) * 5);
  let high = Math.min(100, Math.ceil((Math.max(...rates) + 2) / 5) * 5);
  if (high - low < 10) low = Math.max(0, high - 10);

  const step = high - low <= 20 ? 5 : high - low <= 50 ? 10 : 20;
  low = Math.floor(low / step) * step;
  high = Math.min(100, Math.ceil(high / step) * step);

  const ticks = [];
  for (let t = low; t <= high; t += step) ticks.push(t);

  const xFor = (i) =>
    pad.left + plotW * (0.05 + 0.9 * (i / (points.length - 1)));
  const yFor = (rate) =>
    pad.top + plotH * (1 - (rate - low) / (high - low));

  const linePoints = points.map((p, i) => `${xFor(i)},${yFor(p.rate)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="ad-chart"
      role="img"
      aria-label="Present rate for the last recorded days"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            className="ad-chart-grid"
            x1={pad.left}
            x2={W - pad.right}
            y1={yFor(t)}
            y2={yFor(t)}
          />
          <text
            className="ad-chart-tick"
            x={pad.left - 8}
            y={yFor(t) + 4}
            textAnchor="end"
          >
            {t}%
          </text>
        </g>
      ))}

      <polyline className="ad-chart-line" points={linePoints} />

      {points.map((p, i) => {
        const x = xFor(i);
        const isToday = p.date === today;

        return (
          <g key={p.date}>
            <circle className="ad-chart-pt" cx={x} cy={yFor(p.rate)} r="4" />
            <text
              className="ad-chart-value"
              x={x}
              y={yFor(p.rate) - 10}
              textAnchor="middle"
            >
              {p.rate}%
            </text>
            <text
              className={`ad-chart-xlabel ${isToday ? "ad-chart-today" : ""}`}
              x={x}
              y={H - 28}
              textAnchor="middle"
            >
              {isToday ? "Today" : formatWeekdayShort(p.date)}
            </text>
            <text className="ad-chart-xsub" x={x} y={H - 12} textAnchor="middle">
              {formatMonthDay(p.date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadDashboard = async () => {
    setError("");
    setData(null);
    try {
      const response = await api.get("/admin/dashboard/");
      setData(response.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError("This dashboard is for administrators only.");
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
        <p className="ad-error">{error}</p>
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

  // A school with no classes at all
  if (data.classes.length === 0) {
    return (
      <DashboardShell>
        <div className="ad-card ad-empty-card">
          <div className="ad-empty-icon">
            <DoorOpen size={26} strokeWidth={1.5} />
          </div>
          <h2 className="ad-empty-title">No classes created yet</h2>
          <p className="ad-empty-text">
            Get started by creating your first class and assigning a class
            teacher, so attendance can be recorded.
          </p>
          <div className="ad-empty-actions">
            <a
              className="ad-btn ad-btn-dark"
              href={`${ADMIN_URL}academics/schoolclass/add/`}
              target="_blank"
              rel="noreferrer"
            >
              <Plus size={16} strokeWidth={1.75} />
              Create first class
            </a>
            <button type="button" className="ad-btn ad-btn-light" onClick={loadDashboard}>
              <RotateCw size={16} strokeWidth={1.75} />
              Check again
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const { totals, attendance, trend, classes, attention } = data;
  const missing = attention.missing_attendance;
  const noTeacher = attention.no_teacher;
  const attentionCount = missing.length + noTeacher.length;

  // Percent of ALL students, to one decimal place
  const pct = (n) => (totals.students ? ((n / totals.students) * 100).toFixed(1) : "0.0");

  // The small tag on the attendance card
  let registerTag;
  if (attendance.recorded === 0) {
    registerTag = { text: "Not recorded", cls: "ad-tag-warn" };
  } else if (attendance.recorded < totals.students) {
    registerTag = { text: "Partially recorded", cls: "ad-tag-warn" };
  } else {
    registerTag = { text: "Fully recorded", cls: "ad-tag-ok" };
  }

  const classesPct = attendance.classes_total
    ? ((attendance.classes_recorded / attendance.classes_total) * 100).toFixed(1)
    : "0.0";

  const totalTiles = [
    { label: "Students", tag: "Enrolled", value: totals.students },
    { label: "Teachers", tag: "Active", value: totals.teachers },
    { label: "Classes", tag: "Total", value: totals.classes },
    { label: "Subjects", tag: "Total", value: totals.subjects },
  ];

  const numbers = [
    { label: "Present", value: attendance.counts.PRESENT, dot: "ad-dot-present" },
    { label: "Absent", value: attendance.counts.ABSENT, dot: "ad-dot-absent" },
    { label: "Late", value: attendance.counts.LATE, dot: "ad-dot-late" },
    { label: "Excused", value: attendance.counts.EXCUSED, dot: "ad-dot-excused" },
    { label: "Not marked", value: attendance.not_marked, dot: "ad-dot-warn" },
  ];

  // Search and status filter for the classes table
  const query = search.trim().toLowerCase();
  const visibleClasses = classes.filter((c) => {
    const matchesQuery =
      !query ||
      c.name.toLowerCase().includes(query) ||
      (c.teacher || "unassigned").toLowerCase().includes(query);
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  // Downloads the classes table as a CSV file
  const exportReport = () => {
    const rows = [
      ["Class", "Class teacher", "Students", "Recorded today", "Status", "Present rate"],
    ];
    classes.forEach((c) => {
      rows.push([
        c.name,
        c.teacher || "Unassigned",
        c.student_count,
        c.recorded,
        classStatus[c.status].label,
        c.rate !== null ? `${c.rate}%` : "",
      ]);
    });
    downloadCsv(`school-overview-${data.today}.csv`, rows);
  };

  return (
    <DashboardShell>
      {/* Title and export */}
      <div className="ad-top">
        <div>
          <h1 className="ad-title">School overview</h1>
          <p className="ad-subtitle">
            Academic year {data.academic_year} / {formatDayLong(data.today)}
          </p>
        </div>
        <button type="button" className="ad-btn ad-btn-light" onClick={exportReport}>
          <Download size={16} strokeWidth={1.75} />
          Export report
        </button>
      </div>

      {/* Totals */}
      <div className="ad-card ad-totals">
        {totalTiles.map((tile) => (
          <div className="ad-total" key={tile.label}>
            <div className="ad-total-top">
              <span className="ad-total-label">{tile.label}</span>
              <span className="ad-total-tag">{tile.tag}</span>
            </div>
            <div className="ad-total-value">{tile.value}</div>
          </div>
        ))}
      </div>

      <div className="ad-mid">
        <div className="ad-stack">
          {/* Today's attendance, whole school */}
          <div className="ad-card ad-pad">
            <div className="ad-card-head">
              <div>
                <h2 className="ad-card-title">Today's attendance, whole school</h2>
                
              </div>
              <span className={`ad-tag ${registerTag.cls}`}>{registerTag.text}</span>
            </div>

            <div className="ad-numbers">
              {numbers.map((item) => (
                <div key={item.label}>
                  <div className="ad-number-label">
                    <span className={`ad-dot ${item.dot}`}></span>
                    <span>
                      {item.label} ({pct(item.value)}%)
                    </span>
                  </div>
                  <div className="ad-number-value">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="ad-classes-recorded">
              <div className="ad-classes-recorded-row">
                <span className="ad-strong">Classes recorded</span>
                <span className="ad-strong">
                  {attendance.classes_recorded} / {attendance.classes_total} classes (
                  {classesPct}%)
                </span>
              </div>

              <div className="ad-progress">
                <div
                  className="ad-progress-fill"
                  style={{ width: `${classesPct}%` }}
                ></div>
              </div>

              {missing.length > 0 && (
                <div className="ad-warning">
                  <TriangleAlert size={16} strokeWidth={1.75} />
                  <span>
                    {plural(missing.length, "class", "classes")}{" "}
                    {missing.length === 1 ? "has" : "have"} not recorded attendance
                    yet ({listNames(missing.map((c) => c.name))})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Attendance trend */}
          <div className="ad-card ad-pad">
            <div className="ad-card-head">
              <div>
                <h2 className="ad-card-title">Attendance trend</h2>
                <p className="ad-muted">Present rate over the last 7 recorded days</p>
              </div>
            </div>
            <RateTrendChart trend={trend} today={data.today} />
          </div>
        </div>

        {/* Needs attention */}
        <div className="ad-card ad-pad">
          <div className="ad-attn-head">
            <h2 className="ad-card-title">Needs attention</h2>
            <span className={`ad-badge ${attentionCount ? "ad-badge-bad" : "ad-badge-ok"}`}>
              {plural(attentionCount, "item")}
            </span>
          </div>

          {attentionCount === 0 ? (
            <div className="ad-clear">
              <div className="ad-clear-icon">
                <CircleCheck size={20} strokeWidth={1.75} />
              </div>
              <div className="ad-clear-title">All caught up</div>
              <p>Every class has recorded attendance and an assigned class teacher.</p>
            </div>
          ) : (
            <div className="ad-attn-body">
              {missing.length > 0 && (
                <div>
                  <span className="ad-group-title">Classes without attendance today</span>
                  {missing.map((c) => (
                    <div className="ad-attn-row" key={c.id}>
                      <div>
                        <div className="ad-attn-name">{c.name}</div>
                        <div className="ad-muted-small">
                          {c.teacher ? `Teacher: ${c.teacher}` : "No class teacher"}
                        </div>
                      </div>
                      <span className="ad-chip ad-chip-warn">Not marked</span>
                    </div>
                  ))}
                </div>
              )}

              {noTeacher.length > 0 && (
                <div className={missing.length > 0 ? "ad-group-divider" : ""}>
                  <span className="ad-group-title">Classes without a class teacher</span>
                  {noTeacher.map((c) => (
                    <div className="ad-unassigned" key={c.id}>
                      <div>
                        <div className="ad-attn-name">{c.name}</div>
                        <div className="ad-unassigned-sub">
                          {plural(c.student_count, "student")} • Unassigned
                        </div>
                      </div>
                      <a
                        className="ad-assign"
                        href={`${ADMIN_URL}academics/schoolclass/${c.id}/change/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Assign
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Classes table */}
      <div className="ad-card ad-table-card">
        <div className="ad-table-head">
          <div className="ad-table-title">
            <h2 className="ad-card-title">Classes</h2>
            <span className="ad-count">{classes.length}</span>
          </div>

          <div className="ad-filters">
            <div className="ad-search">
              <Search size={14} strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Search class or teacher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="ad-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="RECORDED">Recorded</option>
              <option value="PARTLY_RECORDED">Partly recorded</option>
              <option value="NOT_MARKED">Not marked</option>
              <option value="NO_STUDENTS">No students</option>
            </select>
          </div>
        </div>

        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Class teacher</th>
                <th>Students</th>
                <th>Today's status</th>
                <th>Present rate</th>
                <th className="ad-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleClasses.map((c) => (
                <tr key={c.id}>
                  <td className="ad-strong">{c.name}</td>
                  <td>
                    {c.teacher ? (
                      c.teacher
                    ) : (
                      <span className="ad-chip ad-chip-warn">Unassigned</span>
                    )}
                  </td>
                  <td>{c.student_count}</td>
                  <td>
                    <span className={`ad-chip ${classStatus[c.status].cls}`}>
                      {classStatus[c.status].label}
                    </span>
                  </td>
                  <td>
                    {c.rate === null ? (
                      <span className="ad-faint">—</span>
                    ) : (
                      <div className="ad-rate">
                        <span>{c.rate}%</span>
                        <div className="ad-mini-bar">
                          <div
                            className={`ad-mini-fill ${c.rate < 90 ? "ad-mini-fill-warn" : ""}`}
                            style={{ width: `${c.rate}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="ad-right">
                    <a
                      className="ad-action"
                      href={`${ADMIN_URL}academics/schoolclass/${c.id}/change/`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Manage <ExternalLink size={12} strokeWidth={1.75} />
                    </a>
                  </td>
                </tr>
              ))}

              {visibleClasses.length === 0 && (
                <tr>
                  <td colSpan="6" className="ad-no-match">
                    No classes match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ad-table-foot">
          {visibleClasses.length === classes.length
            ? `Showing all ${plural(classes.length, "class", "classes")}`
            : `Showing ${visibleClasses.length} of ${classes.length} classes`}
        </div>
      </div>
    </DashboardShell>
  );
}

export default AdminDashboard;