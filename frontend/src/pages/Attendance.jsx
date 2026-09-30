import { useState, useEffect } from "react";
import api from "../api/axios";
import Header from "../components/Header";

function Attendance({ onLogout }) {
  const [schoolClass, setSchoolClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const loadClassAndStudents = async () => {
      try {
        //find the class this teacher is in charge of

        const classResponse = await api.get("/school-classes/?mine=true");

        if (classResponse.data.length === 0) {
          setError("You are not assigned as a class teacher for any class.");
          return;
        }

        const myClass = classResponse.data[0];
        setSchoolClass(myClass);

        //get the students enrolled in that class

        const enrollmentsResponse = await api.get(
          `/enrollments/?school_class=${myClass.id}`
        );
        setStudents(enrollmentsResponse.data);


        //Initializing every student as PRESENT

        const initialRecords = {};
        enrollmentsResponse.data.forEach((enrollment) => {
        initialRecords[enrollment.id] = { status: "PRESENT", reason: "" };
      });
      setRecords(initialRecords);
      } catch (err) {
        setError("Failed to load class data.");
        console.error(err);
      }
    };

    loadClassAndStudents();
  },
   []);

   const updateRecord = (enrollmentId, field, value) => {
    setRecords((prev) => ({
    ...prev,
    [enrollmentId]: {
      ...prev[enrollmentId],
      [field]: value,
    },
  }));
};

  return (
    <>
      <Header isLoggedIn={true} onLogout={onLogout} />
      <div>
        <h2>Attendance</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        {schoolClass && <h3>Class: {schoolClass.name}</h3>}
        <ul>
          {students.map((enrollment) => (
            <li key={enrollment.id}>{enrollment.student_name}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default Attendance;