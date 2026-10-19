import {
  LayoutDashboard,
  User,
  BookOpen,
  ClipboardCheck,
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
} from "lucide-react";

// An item with a "to" is a real page. An item with soon: true is greyed out.
// To change an icon later, change the name here (and in the import above).

export const studentNav = {
  main: [
    { label: "Dashboard", icon: LayoutDashboard, soon: true },
    { label: "My Profile", icon: User, to: "/profile" },
    { label: "Subjects", icon: BookOpen, to: "/subjects" },
    { label: "Attendance", icon: ClipboardCheck, to: "/my-attendance" },
    { label: "Timetable", icon: CalendarDays, soon: true },
    { label: "Messages", icon: MessageSquare, soon: true },
  ],
  sectionTitle: "My School",
  school: [
    { label: "Library", icon: Library, soon: true },
    { label: "Help", icon: CircleHelp, soon: true },
  ],
};

export const teacherNav = {
  main: [
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { label: "Attendance", icon: ClipboardCheck, to: "/attendance" },
    { label: "Subjects", icon: BookOpen, to: "/subjects" },
    { label: "Timetable", icon: CalendarDays, soon: true },
    { label: "Messages", icon: MessageSquare, soon: true },
  ],
  sectionTitle: "",
  school: [],
};

export const adminNav = {
  main: [
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { label: "Attendance", icon: ClipboardCheck, soon: true },
    { label: "Students", icon: UserGroup, soon: true },
    { label: "Teachers", icon: Users, soon: true },
    { label: "Classes", icon: DoorOpen, soon: true },
    { label: "Subjects", icon: BookOpen, to: "/subjects" },
    { label: "Academic years", icon: CalendarRange, soon: true },
    { label: "Timetable", icon: Clock, soon: true },
    { label: "Messages", icon: Mail, soon: true },
  ],
  sectionTitle: "",
  school: [],
};