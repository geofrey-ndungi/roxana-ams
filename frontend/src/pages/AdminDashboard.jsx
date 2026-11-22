import { useState, useEffect } from "react";
import { Download, TriangleAlert, Search, ExternalLink, Plus, RotateCw } from "lucide-react";
import api from "../api/axios";
import { formatDayLong, downloadCsv, plural, listNames } from "../utils/format";
import "./AdminDashboard.css";

// Django's own admin site, where classes and teachers are managed for now.
const ADMIN_URL = `http://${window.location.hostname}:8000/admin/`;

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
        <div className="ad-skel-block" style={{ height: 100 }}></div>
      </div>
      <div className="ad-card ad-skeleton">
        <div className="ad-skel-block" style={{ height: 320 }}></div>
      </div>
      <div className="ad-card ad-skeleton">
        <div className="ad-skel-block" style={{ height: 400 }}></div>
      </div>
    </>
  );
}

// Line chart of the school's present rate over the last recorded days.
// Plain SVG, kept clean with an area fill and no clutter.
function RateTrendChart({ trend, today }) {
  const points = trend.filter((day) => day.rate !== null);

  if (points.length < 3) {
    return (
      <div className="ad-chart-empty">
        <div className="ad-chart-empty-title">Not enough days recorded yet</div>
        <p>The trend will appear here as soon as there are at least 3 recorded school days.</p>
      </div>
    );
  }

  const W = 700;
  const H = 220;
  const pad = { left: 44, right: 24, top: 24, bottom: 46 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const rates = points.map((p) => p.rate);
  let low = Math.max(0, Math.floor((Math.min(...rates) - 2) / 5) * 5);
  let high = Math.min(100, Math.ceil((Math.max(...rates) + 2) / 5) * 5);
  if (high - low < 10) low = Math.max(0, high - 10);

  const step = high - low <= 20 ? 5 : high - low <= 50 ? 10 : 20;
  low = Math.floor(low / step) * step;
  high = Math.min(100, Math.ceil(high / step) * step);

  const ticks = [];
  for (let t = low; t <= high; t += step) ticks.push(t);

  const xFor = (i) => pad.left + plotW * (0.05 + 0.9 * (i / (points.length - 1)));
  const yFor = (rate) => pad.top + plotH * (1 - (rate - low) / (high - low));

  const linePoints = points.map((p, i) => `${xFor(i)},${yFor(p.rate)}`).join(" ");
  const areaPoints = `${linePoints} L${pad.left + plotW},${pad.top + plotH} L${pad.left},${pad.top + plotH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ad-chart" role="img" aria-label="Present rate trend">
      <defs>
        <linearGradient id="adGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line className="ad-chart-grid" x1={pad.left} x2={W - pad.right} y1={yFor(t)} y2={yFor(t)} />
          <text className="ad-chart-tick" x={pad.left - 8} y={yFor(t) + 4} textAnchor="end">
            {t}%
          </text>
        </g>
      ))}

      <path className="ad-chart-area" d={areaPoints} />
      <polyline className="ad-chart-line" points={linePoints} />

      {points.map((p, i) => {
        const x = xFor(i);
        const isToday = p.date === today;
        return (
          <g key={p.date}>
            <circle className={`ad-chart-pt ${isToday ? "ad-chart-pt-today" : ""}`} cx={x} cy={yFor(p.rate)} r="4" />
            <text className="ad-chart-xlabel" x={x} y={H - 22} textAnchor="middle">
              {isToday ? "Today" : p.date.slice(5)}
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
          <div className="ad-empty-icon"><Plus size={26} strokeWidth={1.5} /></div>
          <h2 className="ad-empty-title">No classes yet</h2>
          <p className="ad-empty-text">
            Create your first class and assign a teacher so attendance can be recorded.
          </p>
          <div className="ad-empty-actions">
            <a className="ad-btn ad-btn-dark" href={`${ADMIN_URL}academics/schoolclass/add/`} target="_blank" rel="noreferrer">
              <Plus size={16} strokeWidth={1.75} /> Create first class
            </a>
            <button type="button" className="ad-btn ad-btn-light" onClick={loadDashboard}>
              <RotateCw size={16} strokeWidth={1.75} /> Check again
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
    { label: "Students", value: totals.students },
    { label: "Teachers", value: totals.teachers },
    { label: "Classes", value: totals.classes },
    { label: "Subjects", value: totals.subjects },
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
          <p className="ad-subtitle">{data.academic_year} · {formatDayLong(data.today)}</p>
        </div>
        <button type="button" className="ad-btn ad-btn-light" onClick={exportReport}>
          <Download size={16} strokeWidth={1.75} /> Export report
        </button>
      </div>

      {/* Totals strip */}
      <div className="ad-totals">
        {totalTiles.map((tile) => (
          <div className="ad-total" key={tile.label}>
            <span className="ad-total-label">{tile.label}</span>
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
                <h2 className="ad-card-title">Today's attendance</h2>
                <span className={`ad-tag ${registerTag.cls}`}>{registerTag.text}</span>
              </div>
            </div>

            <div className="ad-attendance-grid">
              <div className="ad-attn-metric">
                <span className="ad-metric-label">Present</span>
                <span className="ad-metric-value">{attendance.counts.PRESENT}</span>
                <span className="ad-metric-sub">{pct(attendance.counts.PRESENT)}% of students</span>
              </div>
              <div className="ad-attn-metric">
                <span className="ad-metric-label">Absent</span>
                <span className="ad-metric-value">{attendance.counts.ABSENT}</span>
                <span className="ad-metric-sub">{pct(attendance.counts.ABSENT)}% of students</span>
              </div>
              <div className="ad-attn-metric">
                <span className="ad-metric-label">Late</span>
                <span className="ad-metric-value">{attendance.counts.LATE}</span>
                <span className="ad-metric-sub">{pct(attendance.counts.LATE)}% of students</span>
              </div>
              <div className="ad-attn-metric">
                <span className="ad-metric-label">Excused</span>
                <span className="ad-metric-value">{attendance.counts.EXCUSED}</span>
                <span className="ad-metric-sub">{pct(attendance.counts.EXCUSED)}% of students</span>
              </div>
            </div>

            <div className="ad-classes-recorded">
              <div className="ad-classes-recorded-row">
                <span className="ad-strong">Classes recorded</span>
                <span className="ad-strong">
                  {attendance.classes_recorded} / {attendance.classes_total} ({classesPct}%)
                </span>
              </div>
              <div className="ad-progress">
                <div className="ad-progress-fill" style={{ width: `${classesPct}%` }}></div>
              </div>

              {missing.length > 0 && (
                <div className="ad-warning">
                  <TriangleAlert size={16} strokeWidth={1.75} />
                  <span>
                    {plural(missing.length, "class", "classes")} {missing.length === 1 ? "has" : "have"} not recorded
                    attendance yet ({listNames(missing.map((c) => c.name))})
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
                <p className="ad-muted">Present rate over the last recorded days</p>
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
              <div className="ad-clear-icon"><span className="ad-check">✓</span></div>
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
                      <div className="ad-attn-name">{c.name}</div>
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
                        <div className="ad-unassigned-sub">{plural(c.student_count, "student")} · Unassigned</div>
                      </div>
                      <a className="ad-assign" href={`${ADMIN_URL}academics/schoolclass/${c.id}/change/`} target="_blank" rel="noreferrer">
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
            <select className="ad-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
                      <span className="ad-rate-value">{c.rate}%</span>
                    )}
                  </td>
                  <td className="ad-right">
                    <a className="ad-action" href={`${ADMIN_URL}academics/schoolclass/${c.id}/change/`} target="_blank" rel="noreferrer">
                      Manage <ExternalLink size={12} strokeWidth={1.75} />
                    </a>
                  </td>
                </tr>
              ))}

              {visibleClasses.length === 0 && (
                <tr>
                  <td colSpan="6" className="ad-no-match">No classes match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}

export default AdminDashboard;
