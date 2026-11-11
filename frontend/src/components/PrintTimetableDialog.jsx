import { useState, useEffect, useRef } from "react";
import { X, Download, ExternalLink, ArrowLeft, Printer } from "lucide-react";
import logo from "../assets/logo.png"; // the same logo file the sidebar uses
import "./PrintTimetableDialog.css";

const STORAGE_KEY = "timetable-print-options";

const DEFAULT_OPTIONS = {
  schoolName: "Roxana School",
  title: "", // blank = "Class Timetable" or "Teacher Timetable"
  note: "",
  showLogo: true,
  showTeacher: true,
  showRoom: true,
  merge: true,
  colour: true,
  paper: "a4",
  orientation: "landscape",
  showDate: true,
};

// The choices from last time are remembered on this computer
const loadOptions = () => {
  try {
    return { ...DEFAULT_OPTIONS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return DEFAULT_OPTIONS;
  }
};

const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// mode: "admin" can choose what to print. "teacher" and "student" print their own.
function PrintTimetableDialog({
  mode,
  periods,
  lessons,
  termLabel,
  classes = [],
  teachers = [],
  currentClassId = null,
  ownerName = "",
  onClose,
}) {
  const [options, setOptions] = useState(loadOptions);
  const [scope, setScope] = useState("class"); // admin only
  const [classId, setClassId] = useState(
    currentClassId ?? (classes[0] ? classes[0].id : "")
  );
  const [teacherId, setTeacherId] = useState(teachers[0] ? teachers[0].id : "");
  const [step, setStep] = useState("options"); // "options" or "preview"
  const [pdf, setPdf] = useState(null); // { url, filename }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const frameRef = useRef(null);

  const setOption = (key, value) =>
    setOptions((previous) => ({ ...previous, [key]: value }));

  // Escape closes the window
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Free the browser's copy of the PDF when it is replaced or the window closes
  useEffect(() => {
    return () => {
      if (pdf) URL.revokeObjectURL(pdf.url);
    };
  }, [pdf]);

  // Works out the pages to print from the choices made
  const buildPages = () => {
    const withTerm = (name) => (termLabel ? `${name} - ${termLabel}` : name);

    const classPage = (name, classLessons) => ({
      view: "class",
      title: options.title || "Class Timetable",
      subtitle: withTerm(name),
      lessons: classLessons,
    });

    const teacherPage = (name, teacherLessons) => ({
      view: "teacher",
      title: options.title || "Teacher Timetable",
      subtitle: withTerm(name),
      lessons: teacherLessons,
    });

    if (mode === "student") return [classPage(ownerName, lessons)];
    if (mode === "teacher") return [teacherPage(ownerName, lessons)];

    // An administrator
    if (scope === "class") {
      const chosen = classes.find((c) => c.id === Number(classId));
      return chosen
        ? [classPage(chosen.name, lessons.filter((l) => l.school_class === chosen.id))]
        : [];
    }

    if (scope === "teacher") {
      const chosen = teachers.find((t) => t.id === Number(teacherId));
      return chosen
        ? [teacherPage(chosen.name, lessons.filter((l) => l.teacher === chosen.id))]
        : [];
    }

    // "All": one page each, skipping any with no lessons at all
    if (scope === "allClasses") {
      return classes
        .map((c) => classPage(c.name, lessons.filter((l) => l.school_class === c.id)))
        .filter((page) => page.lessons.length > 0);
    }

    return teachers
      .map((t) => teacherPage(t.name, lessons.filter((l) => l.teacher === t.id)))
      .filter((page) => page.lessons.length > 0);
  };

  const handleCreate = async () => {
    const pages = buildPages();

    if (pages.length === 0) {
      setError("There are no lessons to print yet.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
      } catch {
        // Remembering the choices is a bonus, so a failure here is fine
      }

      // The PDF code is loaded only now, so it doesn't slow the rest of the app
      const { buildTimetablePdf } = await import("../utils/timetablePdf");
      const blob = await buildTimetablePdf({
        periods,
        pages,
        options,
        logoUrl: logo,
      });

      const base =
        pages.length === 1
          ? pages[0].subtitle
          : `all ${scope === "allTeachers" ? "teachers" : "classes"} ${termLabel}`;

      setPdf({
        url: URL.createObjectURL(blob),
        filename: `timetable-${slug(base)}.pdf`,
      });
      setStep("preview");
    } catch (err) {
      setError("Couldn't create the PDF. Please try again.");
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    const frame = frameRef.current?.contentWindow;
    if (frame) {
      frame.focus();
      frame.print();
    }
  };

  return (
    <div className="pd-overlay">
      <div
        className={`pd-dialog ${step === "preview" ? "pd-dialog-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Print timetable"
      >
        <div className="pd-head">
          <h2 className="pd-title">
            {step === "options" ? "Print timetable" : "Timetable PDF"}
          </h2>
          <button type="button" className="pd-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {step === "options" ? (
          <>
            {mode === "admin" && (
              <div className="pd-section">
                <div className="pd-section-title">What to print</div>

                <div className="pd-field">
                  <select value={scope} onChange={(e) => setScope(e.target.value)}>
                    <option value="class">One class</option>
                    <option value="allClasses">All classes (one page each)</option>
                    <option value="teacher">One teacher</option>
                    <option value="allTeachers">All teachers (one page each)</option>
                  </select>
                </div>

                {scope === "class" && (
                  <div className="pd-field">
                    <select value={classId} onChange={(e) => setClassId(e.target.value)}>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scope === "teacher" && (
                  <div className="pd-field">
                    <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="pd-section">
              <div className="pd-section-title">Heading</div>

              <div className="pd-grid">
                <div className="pd-field">
                  <label htmlFor="pd-school">School name</label>
                  <input
                    id="pd-school"
                    type="text"
                    maxLength={60}
                    value={options.schoolName}
                    onChange={(e) => setOption("schoolName", e.target.value)}
                  />
                </div>

                <div className="pd-field">
                  <label htmlFor="pd-title">Title</label>
                  <input
                    id="pd-title"
                    type="text"
                    maxLength={60}
                    placeholder="Automatic"
                    value={options.title}
                    onChange={(e) => setOption("title", e.target.value)}
                  />
                </div>
              </div>

              <label className="pd-check">
                <input
                  type="checkbox"
                  checked={options.showLogo}
                  onChange={(e) => setOption("showLogo", e.target.checked)}
                />
                Show the school logo
              </label>
            </div>

            <div className="pd-section">
              <div className="pd-section-title">Contents</div>

              <label className="pd-check">
                <input
                  type="checkbox"
                  checked={options.showTeacher}
                  onChange={(e) => setOption("showTeacher", e.target.checked)}
                />
                Show teacher names (class timetables)
              </label>
              <label className="pd-check">
                <input
                  type="checkbox"
                  checked={options.showRoom}
                  onChange={(e) => setOption("showRoom", e.target.checked)}
                />
                Show rooms
              </label>
              <label className="pd-check">
                <input
                  type="checkbox"
                  checked={options.merge}
                  onChange={(e) => setOption("merge", e.target.checked)}
                />
                Join double lessons into one box
              </label>
            </div>

            <div className="pd-section">
              <div className="pd-section-title">Page</div>

              <div className="pd-grid pd-grid-3">
                <div className="pd-field">
                  <label htmlFor="pd-paper">Paper</label>
                  <select
                    id="pd-paper"
                    value={options.paper}
                    onChange={(e) => setOption("paper", e.target.value)}
                  >
                    <option value="a4">A4</option>
                    <option value="a3">A3</option>
                    <option value="letter">Letter</option>
                  </select>
                </div>

                <div className="pd-field">
                  <label htmlFor="pd-orientation">Direction</label>
                  <select
                    id="pd-orientation"
                    value={options.orientation}
                    onChange={(e) => setOption("orientation", e.target.value)}
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>

                <div className="pd-field">
                  <label htmlFor="pd-colour">Colours</label>
                  <select
                    id="pd-colour"
                    value={options.colour ? "colour" : "bw"}
                    onChange={(e) => setOption("colour", e.target.value === "colour")}
                  >
                    <option value="colour">Colour</option>
                    <option value="bw">Black and white</option>
                  </select>
                </div>
              </div>

              <div className="pd-field">
                <label htmlFor="pd-note">Footer note (optional)</label>
                <input
                  id="pd-note"
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Timetable subject to change"
                  value={options.note}
                  onChange={(e) => setOption("note", e.target.value)}
                />
              </div>

              <label className="pd-check">
                <input
                  type="checkbox"
                  checked={options.showDate}
                  onChange={(e) => setOption("showDate", e.target.checked)}
                />
                Show the date it was printed
              </label>
            </div>

            {error && <p className="pd-error">{error}</p>}

            <div className="pd-actions">
              <button type="button" className="pd-btn pd-btn-light" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="pd-btn pd-btn-dark"
                onClick={handleCreate}
                disabled={busy}
              >
                {busy ? "Creating..." : "Create PDF"}
              </button>
            </div>
          </>
        ) : (
          <>
            <iframe
              ref={frameRef}
              className="pd-frame"
              src={pdf.url}
              title="Timetable preview"
            ></iframe>

            <p className="pd-hint">
              If you can't see the preview (some phones can't show PDFs here),
              use Download or Open in new tab.
            </p>

            <div className="pd-actions pd-actions-split">
              <button
                type="button"
                className="pd-btn pd-btn-light"
                onClick={() => setStep("options")}
              >
                <ArrowLeft size={15} strokeWidth={1.75} />
                Change options
              </button>

              <div className="pd-actions-right">
                <a className="pd-btn pd-btn-light" href={pdf.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} strokeWidth={1.75} />
                  Open in new tab
                </a>
                <a className="pd-btn pd-btn-light" href={pdf.url} download={pdf.filename}>
                  <Download size={15} strokeWidth={1.75} />
                  Download
                </a>
                <button type="button" className="pd-btn pd-btn-dark" onClick={handlePrint}>
                  <Printer size={15} strokeWidth={1.75} />
                  Print
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PrintTimetableDialog;