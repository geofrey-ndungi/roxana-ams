import { useState, useEffect } from "react";
import api from "../api/axios";
import Header from "../components/Header";

function Attendance({ onLogout }) {
  const [schoolClass, setSchoolClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadClassAndStudents = async () => {
      try {
        // Step 1: find the class this teacher is in charge of
        const classResponse = await api.get("/school-classes/?mine=true");

        if (classResponse.data.length === 0) {
          setError("You are not assigned as a class teacher for any class.");
          return;
        }

        const myClass = classResponse.data[0];
        setSchoolClass(myClass);

        // Step 2: get the students enrolled in that class
        const enrollmentsResponse = await api.get(
          `/enrollments/?school_class=${myClass.id}`
        );
        setStudents(enrollmentsResponse.data);
      } catch (err) {
        setError("Failed to load class data.");
        console.error(err);
      }
    };

    loadClassAndStudents();
  }, []);

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