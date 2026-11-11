import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DAYS, COLORS, timeLabel } from "./timetable";

const MARGIN = 10; // page margin in mm
const HEAD_H = 7; // height of the day-names row in mm
const BAND_H = 6; // height of break, lunch, assembly and games rows in mm
const PT_TO_MM = 0.3528; // 1 point of text size is about this many mm

const INK = [27, 39, 64];
const MUTED = [102, 112, 133];
const WHITE = [255, 255, 255];

// "#3f51b5" becomes [63, 81, 181]
const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

// Reads an image file and returns it as a data URL, which jsPDF can embed.
// Returns null when anything goes wrong, so a bad logo never stops the PDF.
const loadLogo = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// The lines of text inside one lesson box
const lessonParts = (lesson, view, options) => {
  const main = options.colour ? WHITE : [0, 0, 0];
  const soft = options.colour ? WHITE : [70, 70, 70];

  const parts = [
    { text: lesson.subject_name, style: "bold", size: 8.5, color: main, maxLines: 2 },
  ];

  // A class timetable shows the teacher. A teacher timetable shows the class.
  let second = "";
  if (view === "teacher") second = lesson.class_name;
  else if (options.showTeacher) second = lesson.teacher_name;

  if (second) {
    parts.push({ text: second, style: "normal", size: 7.5, color: soft, maxLines: 1 });
  }
  if (options.showRoom && lesson.room) {
    parts.push({ text: lesson.room, style: "normal", size: 7, color: soft, maxLines: 1 });
  }
  return parts;
};

// Turns the periods and lessons into the rows of the table
const buildBody = (periods, lessons, view, options, rowHeight) => {
  const lessonAt = (day, periodId) =>
    lessons.find((l) => l.day === day && l.period === periodId);

  // The lesson in a day's box at a row position (undefined for a band or empty box)
  const lessonAtRow = (day, rowIndex) => {
    const period = periods[rowIndex];
    return period && period.is_lesson ? lessonAt(day, period.id) : undefined;
  };

  const sameLesson = (a, b) =>
    a.subject === b.subject &&
    a.teacher === b.teacher &&
    a.school_class === b.school_class &&
    a.room === b.room;

  // Boxes that a joined lesson from the row above already covers, for each day
  const covered = DAYS.map(() => new Set());

  return periods.map((period, rowIndex) => {
    const times = `${timeLabel(period.start_time)} - ${timeLabel(period.end_time)}`;

    // Break, lunch, assembly, games: one band across all the days
    if (!period.is_lesson) {
      return [
        {
          content: times,
          styles: { halign: "left", fontSize: 7, textColor: MUTED, minCellHeight: BAND_H },
        },
        {
          content: period.name.toUpperCase(),
          colSpan: DAYS.length,
          styles: {
            halign: "center",
            fontStyle: "bold",
            fontSize: 7.5,
            fillColor: options.colour ? [242, 244, 247] : [235, 235, 235],
            textColor: MUTED,
            minCellHeight: BAND_H,
          },
        },
      ];
    }

    // The first box of a lesson row: the period name and its times
    const row = [
      {
        content: "",
        styles: { fillColor: [249, 250, 251], minCellHeight: rowHeight },
        parts: [
          { text: period.name, style: "bold", size: 8, color: INK, maxLines: 1 },
          { text: times, style: "normal", size: 7, color: MUTED, maxLines: 1 },
        ],
      },
    ];

    DAYS.forEach((day, dayIndex) => {
      // A joined lesson from the row above already covers this box
      if (covered[dayIndex].has(rowIndex)) return;

      const lesson = lessonAt(day.value, period.id);
      if (!lesson) {
        row.push({ content: "" });
        return;
      }

      // Join explicit double lessons, or matching adjacent lesson records.
      let span = 1;
      if (options.merge) {
        const nextPeriod = periods[rowIndex + 1];
        const next = lessonAtRow(day.value, rowIndex + 1);
        const periodsAreAdjacent =
          nextPeriod?.is_lesson &&
          nextPeriod.start_time === period.end_time;

        if (
          lesson.is_double &&
          periodsAreAdjacent &&
          (!next || sameLesson(lesson, next))
        ) {
          covered[dayIndex].add(rowIndex + 1);
          span = 2;
        } else {
          let following = next;
          while (following && sameLesson(lesson, following)) {
            covered[dayIndex].add(rowIndex + span);
            span += 1;
            following = lessonAtRow(day.value, rowIndex + span);
          }
        }
      }

      row.push({
        content: "",
        rowSpan: span,
        styles: {
          fillColor: options.colour ? rgb(COLORS[lesson.subject % COLORS.length]) : WHITE,
        },
        parts: lessonParts(lesson, view, options),
      });
    });

    return row;
  });
};

// Draws the text inside lesson boxes ourselves, so the subject can be bold,
// the teacher and room smaller, and the whole block centred in the box.
const makeCellDrawer = (doc) => (data) => {
  const parts = data.section === "body" ? data.cell.raw?.parts : null;
  if (!parts) return;

  const maxWidth = data.cell.width - 4;
  const lines = [];

  parts.forEach((part) => {
    doc.setFont("helvetica", part.style);
    doc.setFontSize(part.size);
    doc
      .splitTextToSize(part.text, maxWidth)
      .slice(0, part.maxLines)
      .forEach((line) => lines.push({ ...part, line }));
  });

  const heightOf = (size) => size * PT_TO_MM * 1.3;
  const blockHeight = lines.reduce((sum, l) => sum + heightOf(l.size), 0);
  let y = data.cell.y + (data.cell.height - blockHeight) / 2;

  lines.forEach((l) => {
    doc.setFont("helvetica", l.style);
    doc.setFontSize(l.size);
    doc.setTextColor(...l.color);
    doc.text(l.line, data.cell.x + 2, y + heightOf(l.size) * 0.78);
    y += heightOf(l.size);
  });
};

// Draws one page: the heading, then the timetable table
const drawPage = (doc, page, periods, options, logo) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  let textX = MARGIN;

  if (logo) {
    try {
      const format = logo.startsWith("data:image/png") ? "PNG" : "JPEG";
      const size = doc.getImageProperties(logo);
      const logoHeight = 14;
      const logoWidth = (size.width / size.height) * logoHeight;
      doc.addImage(logo, format, MARGIN, MARGIN, logoWidth, logoHeight);
      textX = MARGIN + logoWidth + 4;
    } catch {
      // An image jsPDF can't read: carry on without a logo
    }
  }

  if (options.schoolName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...INK);
    doc.text(options.schoolName, textX, MARGIN + 5);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(page.title, textX, MARGIN + 10.5);

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(page.subtitle, textX, MARGIN + 15);

  const startY = MARGIN + 20;

  // Work out how tall each lesson row can be so the table fits on one page
  const bandCount = periods.filter((p) => !p.is_lesson).length;
  const lessonCount = periods.length - bandCount;
  const available =
    pageHeight - startY - (MARGIN + 6) - HEAD_H - bandCount * BAND_H;
  const rowHeight = lessonCount
    ? Math.max(9, Math.min(16, available / lessonCount))
    : 12;

  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN, bottom: MARGIN + 6 },
    head: [["Time", ...DAYS.map((d) => d.label)]],
    body: buildBody(periods, page.lessons, page.view, options, rowHeight),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.2,
      lineColor: [208, 213, 221],
      lineWidth: 0.2,
      valign: "middle",
      halign: "center",
      textColor: INK,
    },
    headStyles: {
      fillColor: options.colour ? [30, 45, 77] : [240, 240, 240],
      textColor: options.colour ? WHITE : INK,
      fontStyle: "bold",
      minCellHeight: HEAD_H,
    },
    columnStyles: { 0: { cellWidth: 28 } },
    didDrawCell: makeCellDrawer(doc),
  });
};

// Builds the whole PDF and returns it as a Blob.
//  pages: [{ title, subtitle, view: "class" | "teacher", lessons }]
//  options: the choices made in the print window
export async function buildTimetablePdf({ periods, pages, options, logoUrl }) {
  const doc = new jsPDF({
    orientation: options.orientation,
    unit: "mm",
    format: options.paper,
  });

  const logo = options.showLogo && logoUrl ? await loadLogo(logoUrl) : null;

  pages.forEach((page, index) => {
    if (index > 0) doc.addPage();
    drawPage(doc, page, periods, options, logo);
  });

  // The footer goes on last, because only now do we know the page count
  const pageCount = doc.getNumberOfPages();
  const printedOn = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);

    if (options.note) {
      doc.text(doc.splitTextToSize(options.note, width * 0.6)[0], MARGIN, height - 7);
    }

    const right = [
      options.showDate ? `Printed ${printedOn}` : "",
      pageCount > 1 ? `Page ${i} of ${pageCount}` : "",
    ]
      .filter(Boolean)
      .join("   |   ");

    if (right) doc.text(right, width - MARGIN, height - 7, { align: "right" });
  }

  return doc.output("blob");
}