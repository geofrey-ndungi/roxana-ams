import { useEffect, useMemo, useState } from "react";
import { Download, Printer, X } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import api from "../api/axios";
import "./Examinations.css";

function ReportCards() {
  const { user } = useOutletContext();
  const [examinations, setExaminations] = useState([]);
  const [examinationId, setExaminationId] = useState("");
  const [result, setResult] = useState(null);
  const [resultExamId, setResultExamId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/examinations/")
      .then((response) => {
        setExaminations(response.data);
        setExaminationId(String(response.data[0]?.id || ""));
      })
      .catch((requestError) => {
        setError(
          requestError.response?.data?.detail || "Couldn't load examinations."
        );
      });
  }, []);

  useEffect(() => {
    if (!examinationId) return;
    let active = true;
    api
      .get("/examination-results/", {
        params: { examination: examinationId },
      })
      .then((response) => {
        if (!active) return;
        setResult(response.data);
        setResultExamId(String(examinationId));
        const firstStudent = response.data.marks[0]?.student_id;
        setStudentId(String(user?.role === "STUDENT" ? user.id : firstStudent || ""));
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.detail ||
              "Couldn't load this report card."
          );
        }
      });
    return () => {
      active = false;
    };
  }, [examinationId, user?.id, user?.role]);

  const selectedExam = useMemo(
    () => examinations.find((exam) => String(exam.id) === String(examinationId)),
    [examinations, examinationId]
  );
  const visibleResult =
    resultExamId === String(examinationId) ? result : null;
  const students = useMemo(() => {
    const unique = new Map();
    visibleResult?.marks.forEach((mark) => {
      unique.set(String(mark.student_id), mark.student_name);
    });
    return [...unique.entries()].map(([id, name]) => ({ id, name }));
  }, [visibleResult]);
  const studentMarks = visibleResult?.marks.filter(
    (mark) => String(mark.student_id) === String(studentId)
  ) || [];

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const createPdf = async () => {
    if (!studentMarks.length) {
      setError("There are no marks to print for this student.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      const studentName = students.find((student) => student.id === String(studentId))?.name;
      const average =
        studentMarks.reduce((sum, mark) => sum + Number(mark.percentage), 0) /
        studentMarks.length;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Roxana School", 105, 22, { align: "center" });
      doc.setFontSize(14);
      doc.text("Examination Report Card", 105, 31, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Student: ${studentName}`, 16, 45);
      doc.text(`Class: ${selectedExam.class_name}`, 16, 52);
      doc.text(`Examination: ${selectedExam.title}`, 16, 59);
      doc.text(`Term: ${selectedExam.term_label}`, 16, 66);

      autoTable(doc, {
        startY: 76,
        head: [["Subject", "Mark", "Percentage", "Grade", "Points"]],
        body: studentMarks.map((mark) => [
          mark.subject_name,
          `${mark.score} / ${mark.max_score}`,
          `${mark.percentage}%`,
          mark.grade || "—",
          mark.points ?? "—",
        ]),
        theme: "grid",
        headStyles: { fillColor: [30, 45, 77] },
        styles: { fontSize: 10, cellPadding: 3 },
      });

      const finalY = doc.lastAutoTable.finalY || 80;
      doc.setFont("helvetica", "bold");
      doc.text(`Average: ${average.toFixed(2)}%`, 16, finalY + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        "This report card contains no class or subject rankings.",
        16,
        finalY + 22
      );

      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(doc.output("blob")));
    } catch (requestError) {
      setError("Couldn't create the report card PDF.");
      console.error(requestError);
    } finally {
      setBusy(false);
    }
  };

  const closePdf = () => setPdfUrl("");

  return (
    <div className="ex-page">
      <header className="ex-header">
        <div>
          <h1>Report cards</h1>
          <p>Preview and print a student report card without rankings.</p>
        </div>
      </header>

      {error && <div className="ex-alert ex-alert-error" role="alert">{error}</div>}

      <section className="ex-card">
        <div className="ex-form ex-report-controls">
          <label>
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
          {user?.role !== "STUDENT" && (
            <label>
              Student
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {selectedExam && !selectedExam.released_at && (
          <p className="ex-locked-note">Results must be released before report cards are available.</p>
        )}

        {selectedExam?.released_at && studentMarks.length > 0 && (
          <>
            <div className="ex-card-heading ex-report-heading">
              <div>
                <h2>{students.find((student) => student.id === String(studentId))?.name}</h2>
                <p>{selectedExam?.class_name} · {selectedExam?.term_label}</p>
              </div>
              <button
                className="ex-button ex-button-primary"
                onClick={createPdf}
                disabled={busy}
              >
                {busy ? "Creating PDF…" : "Preview report card"}
              </button>
            </div>
            <div className="ex-table-wrap">
              <table className="ex-table">
                <thead>
                  <tr><th>Subject</th><th>Mark</th><th>Percentage</th><th>Grade</th><th>Points</th></tr>
                </thead>
                <tbody>
                  {studentMarks.map((mark) => (
                    <tr key={mark.subject}>
                      <td>{mark.subject_name}</td>
                      <td>{mark.score} / {mark.max_score}</td>
                      <td>{mark.percentage}%</td>
                      <td>{mark.grade || "—"}</td>
                      <td>{mark.points ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {selectedExam?.released_at && visibleResult && !studentMarks.length && (
          <p className="ex-empty-inline">No report card marks are available for this student.</p>
        )}
        {!examinations.length && (
          <p className="ex-empty-inline">No published examinations are available yet.</p>
        )}
      </section>

      {pdfUrl && (
        <div className="ex-pdf-overlay">
          <section className="ex-pdf-dialog" role="dialog" aria-modal="true" aria-label="Report card preview">
            <header>
              <h2>Report card PDF</h2>
              <button className="ex-icon-button" onClick={closePdf} aria-label="Close preview">
                <X size={19} />
              </button>
            </header>
            <iframe src={pdfUrl} title="Report card PDF preview" />
            <footer>
              <a className="ex-button ex-button-light" href={pdfUrl} download="roxana-report-card.pdf">
                <Download size={16} /> Download
              </a>
              <button
                className="ex-button ex-button-primary"
                onClick={() => {
                  const frame = document.querySelector(".ex-pdf-dialog iframe");
                  frame?.contentWindow?.focus();
                  frame?.contentWindow?.print();
                }}
              >
                <Printer size={16} /> Print
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export default ReportCards;
