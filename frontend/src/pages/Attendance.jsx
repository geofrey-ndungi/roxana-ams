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

      <div>
        <label>Date: </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Status</th>
            <th>Reason (if Excused)</th>
          </tr>
        </thead>
        <tbody>
          {students.map((enrollment) => (
            <tr key={enrollment.id}>
              <td>{enrollment.student_name}</td>
              <td>
                <select
                  value={records[enrollment.id]?.status || "PRESENT"}
                  onChange={(e) =>
                    updateRecord(enrollment.id, "status", e.target.value)
                  }
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="EXCUSED">Excused</option>
                </select>
              </td>
              <td>
                {records[enrollment.id]?.status === "EXCUSED" && (
                  <input
                    type="text"
                    placeholder="Reason"
                    value={records[enrollment.id]?.reason || ""}
                    onChange={(e) =>
                      updateRecord(enrollment.id, "reason", e.target.value)
                    }
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button disabled={saving}>
        {saving ? "Saving..." : "Save Attendance"}
      </button>

      {saveMessage && <p>{saveMessage}</p>}
    </div>
  </>
);
}

export default Attendance;