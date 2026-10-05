import "./SubjectCard.css";

function SubjectCard({ subject, imageSrc }) {
  return (
    <div className="subject-card">
      <img src={imageSrc} alt={subject.name} className="subject-card-banner" />
      <div className="subject-card-body">
        <h3>{subject.name}</h3>
        {subject.code && (
          <span className="subject-code-pill">{subject.code}</span>
        )}
      </div>
    </div>
  );
}

export default SubjectCard;