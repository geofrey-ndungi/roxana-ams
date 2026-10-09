import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone, faEnvelope, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import Header from "../components/Header";
import "./StudentProfile.css";




// The ring is an SVG circle with radius 40. Its edge length
// (circumference) is 2 * pi * 40, about 251. We "draw" part of
// that edge to show a percentage.
const RING_CIRCUMFERENCE = 2 * Math.PI * 40;

// Below this attendance rate the ring turns rust instead of navy.
const LOW_RATE_THRESHOLD = 75;

const statTiles = [
  { key: "PRESENT", label: "Present", dot: "dot-present" },
  { key: "ABSENT", label: "Absent", dot: "dot-absent" },
  { key: "LATE", label: "Late", dot: "dot-late" },
  { key: "EXCUSED", label: "Excused", dot: "dot-excused" },
];

function ProfileSkeleton() {
  return (
    <>
      <div className="profile-card skeleton-card">
        <div className="profile-hero">
          <div className="skeleton-circle"></div>
          <div style={{ flex: 1 }}>
            <div
              className="skeleton-bar"
              style={{ width: "50%", height: 22 }}
            ></div>
            <div
              className="skeleton-bar"
              style={{ width: "30%", marginTop: 12 }}
            ></div>
          </div>
        </div>
      </div>

      <div className="profile-card skeleton-card">
        <div
          className="skeleton-bar"
          style={{ width: "30%", height: 18, marginBottom: 20 }}
        ></div>
        <div className="attendance-layout">
          <div className="skeleton-block" style={{ height: 170 }}></div>
          <div className="stat-tiles">
            <div className="skeleton-block"></div>
            <div className="skeleton-block"></div>
            <div className="skeleton-block"></div>
            <div className="skeleton-block"></div>
          </div>
        </div>
      </div>

      <div className="profile-card skeleton-card">
        <div
          className="skeleton-bar"
          style={{ width: "25%", height: 18, marginBottom: 20 }}
        ></div>
        <div className="skeleton-block"></div>
      </div>
    </>
  );
}

function StudentProfile({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get("/profile/me/");
        setProfile(response.data);
      } catch (err) {
        setError("Failed to load your profile.");
        console.error(err);
      }
    };

    loadProfile();
  }, []);

  // Turns "Ian Mwangi" into "IM", used when there is no photo.
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  // Attendance maths. Until the data arrives we use zeros, so these
  // lines never crash on a null profile.
  const counts = profile?.attendance || {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    EXCUSED: 0,
  };
  const totalRecorded = Object.values(counts).reduce((sum, n) => sum + n, 0);

  // We count Late as "attended", since the student did come to school.
  const attended = counts.PRESENT + counts.LATE;
  const rate = totalRecorded ? (attended / totalRecorded) * 100 : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - rate / 100);
  const rateIsLow = totalRecorded > 0 && rate < LOW_RATE_THRESHOLD;

  // Turns "2012-03-05" into "5 March 2012". UTC is set so the day
  // can't shift by one depending on the browser's time zone.
  const formatDate = (isoDate) => {
    if (!isoDate) return null;
    return new Date(isoDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  };


   // One entry per row in the Personal Information card.
  const infoRows = profile
    ? [
        { label: "Name", value: profile.full_name },
        { label: "Admission number", value: profile.admission_number },
        { label: "Gender", value: profile.gender },
        { label: "Residence", value: profile.residence },
        { label: "Date of birth", value: formatDate(profile.date_of_birth) },
      ]
    : [];

  return (
    <>
      <Header isLoggedIn={true} onLogout={onLogout} />

      <div className="profile-bg">
        <div className="profile-page">
          {error && <p className="profile-error">{error}</p>}
          {!error && !profile && <ProfileSkeleton />}

          {profile && (
            <>
              {/* Hero */}
              <div className="profile-card">
                <div className="profile-hero">
                  {profile.photo ? (
                    <img
                      src={profile.photo}
                      alt={profile.full_name}
                      className="profile-avatar"
                    />
                  ) : (
                    <div className="profile-avatar profile-avatar-fallback">
                      {getInitials(profile.full_name)}
                    </div>
                  )}

                  <div className="profile-details">
                    <div className="profile-name-row">
                      <h1 className="profile-name">{profile.full_name}</h1>
                      {profile.school_class && (
                        <span className="profile-pill">
                          {profile.school_class} · {profile.academic_year}
                        </span>
                      )}
                    </div>
                    <div className="profile-username">@{profile.username}</div>
                    {!profile.school_class && (
                      <div className="profile-username">
                        Not enrolled in a class yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Personal Information (dropdown) */}
            <div className="profile-card">
              <button
                type="button"
                className="info-toggle"
                onClick={() => setInfoOpen(!infoOpen)}
                aria-expanded={infoOpen}
              >
                <span className="profile-card-title">Personal Information</span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`info-chevron ${infoOpen ? "open" : ""}`}
                />
              </button>

              {infoOpen && (
                <div className="info-grid">
                  {infoRows.map((row) => (
                    <div key={row.label}>
                      <div className="info-label">{row.label}</div>
                      <div
                        className={`info-value ${row.value ? "" : "info-empty"}`}
                      >
                        {row.value || "Not provided"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
              </div>

              {/* Attendance */}
              <div className="profile-card">
                <div className="profile-card-head">
                  <div>
                    <h2 className="profile-card-title">Attendance</h2>
                    <div className="profile-caption">
                      {totalRecorded} {totalRecorded === 1 ? "day" : "days"}{" "}
                      recorded
                    </div>
                  </div>
                </div>

                <div className="attendance-layout">
<div className="ring-panel">
  <div className="ring-wrap">
    <svg viewBox="0 0 100 100">
      <circle
        className="ring-track"
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        strokeWidth="7"
      />
      <circle
        className={`ring-fill ${rateIsLow ? "ring-low" : ""}`}
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        style={{ '--stroke-offset': `${ringOffset}px` }} 
      />
    </svg>
    <div className="ring-center">
      <span className="ring-value">
        {totalRecorded ? `${rate.toFixed(1)}%` : "--"}
      </span>
      <span className="ring-label">Rate</span>
    </div>
  </div>
</div>


                  <div className="stat-tiles">
                    {statTiles.map((tile) => (
                      <div className="stat-tile" key={tile.key}>
                        <div className="stat-tile-top">
                          <span>{tile.label}</span>
                          <span className={`stat-dot ${tile.dot}`}></span>
                        </div>
                        <div>
                          <span className="stat-number">
                            {counts[tile.key]}
                          </span>
                          <span className="stat-unit">
                            {counts[tile.key] === 1 ? "day" : "days"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Guardians */}
              <div className="profile-card">
                <div className="profile-card-head">
                  <h2 className="profile-card-title">Guardians</h2>
                  <span className="profile-pill">
                    {profile.guardians.length}{" "}
                    {profile.guardians.length === 1 ? "contact" : "contacts"}
                  </span>
                </div>

                {profile.guardians.length === 0 ? (
                  <div className="guardian-empty">
                    No guardian details added yet.
                  </div>
                ) : (
                  profile.guardians.map((guardian, index) => (
                    <div className="guardian-row" key={index}>
                      <div className="guardian-info">
                        <div className="guardian-name-line">
                          <span className="guardian-name">{guardian.name}</span>
                          <span className="profile-pill">
                            {guardian.relationship}
                          </span>
                        </div>
                        <div className="guardian-contact">
                          <span>{guardian.phone_number}</span>
                          {guardian.email && <span>{guardian.email}</span>}
                        </div>
                      </div>

                      <div className="guardian-actions">
                        <a
                          className="icon-btn"
                          href={`tel:${guardian.phone_number}`}
                          aria-label={`Call ${guardian.name}`}
                        >
                          <FontAwesomeIcon icon={faPhone} />
                        </a>
                        {guardian.email && (
                          <a
                            className="icon-btn"
                            href={`mailto:${guardian.email}`}
                            aria-label={`Email ${guardian.name}`}
                          >
                            <FontAwesomeIcon icon={faEnvelope} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default StudentProfile;
