import { useOutletContext } from "react-router-dom";
import Timetable from "./Timetable";
import MyTimetable from "./MyTimetable";

// "/timetable" shows the editor to an admin, and a read-only week to everyone else.
function TimetableHome() {
  const { user } = useOutletContext();

  if (user?.role === "ADMIN") return <Timetable />;
  return <MyTimetable />;
}

export default TimetableHome;