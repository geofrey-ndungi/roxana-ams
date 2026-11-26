import {
  LayoutDashboard,
  User,
  BookOpen,
  ClipboardCheck,
  ChartNoAxesCombined,
  CalendarDays,
  MessageSquare,
  Library,
  CircleHelp,
  UserGroup,
  Users,
  DoorOpen,
  CalendarRange,
  Clock,
  Mail,
  FileText,
} from "lucide-react";

// An item with a "to" is a real page. An item with soon: true is greyed out.
// To change an icon later, change the name here (and in the import above).

export const studentNav = {
  main: [
    { label: "Dashboard", icon: LayoutDashboard, soon: true, section: "Workspace" },
    { label: "My Profile", icon: User, to: "/profile", section: "School management" },
    { label: "Subjects", icon: BookOpen, to: "/subjects", section: "School management" },
    { label: "Attendance", icon: ClipboardCheck, to: "/my-attendance", section: "Daily operations" },
    { label: "Timetable", icon: CalendarDays, to: "/timetable", section: "Daily operations" },
    {
      label: "Examinations",
      icon: ClipboardCheck,
      section: "Daily operations",
      children: [
        { label: "Results", icon: ClipboardCheck, to: "/examinations/results" },
        { label: "Report Cards", icon: FileText, to: "/examinations/report-cards" },
      ],
    },
    { label: "Messages", icon: MessageSquare, soon: true, section: "Daily operations" },
  ],
  sectionTitle: "My School",
  school: [
    { label: "Library", icon: Library, soon: true },
    { label: "Help", icon: CircleHelp, soon: true },
  ],
};

export const teacherNav = {
  main: [
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", section: "Workspace" },
    { label: "Subjects", icon: BookOpen, to: "/subjects", section: "School management" },
    { label: "Attendance", icon: ClipboardCheck, to: "/attendance", section: "Daily operations" },
    { label: "Timetable", icon: CalendarDays, to: "/timetable", section: "Daily operations" },
    {
      label: "Examinations",
      icon: ClipboardCheck,
      section: "Daily operations",
      children: [
        { label: "Results", icon: ClipboardCheck, to: "/examinations/results" },
        { label: "Report Cards", icon: FileText, to: "/examinations/report-cards" },
        { label: "Analytics", icon: ChartNoAxesCombined, to: "/examinations/analytics" },
      ],
    },
    { label: "Messages", icon: MessageSquare, soon: true, section: "Daily operations" },
  ],
  sectionTitle: "",
  school: [],
};

export const adminNav = {
  main: [
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", section: "Workspace" },
    { label: "Students", icon: UserGroup, soon: true, section: "School management" },
    { label: "Teachers", icon: Users, soon: true, section: "School management" },
    { label: "Classes", icon: DoorOpen, soon: true, section: "School management" },
    { label: "Subjects", icon: BookOpen, to: "/subjects", section: "School management" },
    { label: "Academic years", icon: CalendarRange, soon: true, section: "School management" },
    { label: "Attendance", icon: ClipboardCheck, soon: true, section: "Daily operations" },
    { label: "Timetable", icon: Clock, to: "/timetable", section: "Daily operations" },
    {
      label: "Examinations",
      icon: ClipboardCheck,
      section: "Daily operations",
      children: [
        { label: "Results", icon: ClipboardCheck, to: "/examinations/results" },
        { label: "Report Cards", icon: FileText, to: "/examinations/report-cards" },
        { label: "Analytics", icon: ChartNoAxesCombined, to: "/examinations/analytics" },
      ],
    },
    { label: "Messages", icon: Mail, soon: true, section: "Daily operations" },
  ],
  sectionTitle: "",
  school: [],
};