import {
  faTableCells,
  faUser,
  faBookOpen,
  faClipboardCheck,
  faCalendarDays,
  faComment,
  faBook,
  faCircleQuestion,
} from "@fortawesome/free-solid-svg-icons";

// An item with a "to" is a real page. An item with soon: true is greyed out.

export const studentNav = {
  main: [
    { label: "Dashboard", icon: faTableCells, soon: true },
    { label: "My Profile", icon: faUser, to: "/profile" },
    { label: "Subjects", icon: faBookOpen, to: "/subjects" },
    { label: "Attendance", icon: faClipboardCheck, soon: true },
    { label: "Timetable", icon: faCalendarDays, soon: true },
    { label: "Messages", icon: faComment, soon: true },
  ],
  sectionTitle: "My School",
  school: [
    { label: "Library", icon: faBook, soon: true },
    { label: "Help", icon: faCircleQuestion, soon: true },
  ],
};

export const teacherNav = {
  main: [
    { label: "Dashboard", icon: faTableCells, to: "/dashboard" },
    { label: "Attendance", icon: faClipboardCheck, to: "/attendance" },
    { label: "Subjects", icon: faBookOpen, to: "/subjects" },
    { label: "Timetable", icon: faCalendarDays, soon: true },
    { label: "Messages", icon: faComment, soon: true },
  ],
  sectionTitle: "",
  school: [],
};