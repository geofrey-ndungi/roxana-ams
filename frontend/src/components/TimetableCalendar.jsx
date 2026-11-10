import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import {
  DAYS,
  PX_PER_MINUTE,
  LESSON_DURATION_MINUTES,
  COLORS,
  toMinutes,
  timeLabel,
} from "../utils/timetable";
import "./TimetableCalendar.css";

// The week view. It is used twice:
//  - the admin editor passes onSlotClick, so boxes can be clicked
//  - the teacher and student pages leave it out, so it is read-only
// metaFor(lesson) gives the small line under the time (teacher, class, room...)
function TimetableCalendar({ periods, lessons, metaFor, onSlotClick }) {
  // The current time, refreshed every minute, for the red "now" line
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer); // stop the timer when leaving the page
  }, []);

  if (periods.length === 0) return null;

  const clickable = typeof onSlotClick === "function";
  const lessonPeriods = periods.filter((p) => p.is_lesson);
  const lessonAt = (day, periodId) =>
    lessons.find((l) => l.day === day && l.period === periodId);

  // Keep the calendar bounds on the school's actual first and last times.
  const firstMinute = Math.min(...periods.map((p) => toMinutes(p.start_time)));
  const lastMinute = Math.max(...periods.map((p) => toMinutes(p.end_time)));

  const hourHeight = 60 * PX_PER_MINUTE;
  const gridHeight = (lastMinute - firstMinute) * PX_PER_MINUTE;

  const hours = [firstMinute];
  for (
    let minute = (Math.floor(firstMinute / 60) + 1) * 60;
    minute <= lastMinute;
    minute += 60
  ) {
    hours.push(minute);
  }
  const hourOffset =
    ((60 - (firstMinute % 60)) % 60) * PX_PER_MINUTE;

  // How far down the grid a time sits, in pixels
  const topOf = (minute) => (minute - firstMinute) * PX_PER_MINUTE;

  // Today's column, and where the red line goes.
  // getDay() gives 1 for Monday up to 5 for Friday, like our own day numbers.
  const todayDay = now.getDay();
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const showNowLine = nowMinute >= firstMinute && nowMinute <= lastMinute;

  return (
    <div className="cal-wrap">
      <div className="cal">
        {/* Day names */}
        <div className="cal-head">
          <div></div>
          {DAYS.map((day) => (
            <div
              className={`cal-dayhead ${day.value === todayDay ? "cal-today" : ""}`}
              key={day.value}
            >
              <span className="cal-dayname">{day.label.slice(0, 3)}</span>
              {day.value === todayDay && (
                <span className="cal-today-badge">Today</span>
              )}
            </div>
          ))}
        </div>

        {/* The hours, and the five day columns */}
        <div
          className="cal-body"
          style={{
            "--hour": `${hourHeight}px`,
            "--hour-offset": `${hourOffset}px`,
            height: gridHeight,
          }}
        >
          <div className="cal-axis">
            {hours.map((minute) => (
              <span className="cal-hour" key={minute} style={{ top: topOf(minute) }}>
                {`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(
                  minute % 60
                ).padStart(2, "0")}`}
              </span>
            ))}
          </div>

          {DAYS.map((day) => (
            <div className="cal-col" key={day.value}>
              {/* Break and lunch, as shaded bands */}
              {periods
                .filter((p) => !p.is_lesson)
                .map((period) => {
                  const start = toMinutes(period.start_time);
                  const end = toMinutes(period.end_time);

                  return (
                    <div
                      className="cal-band"
                      key={period.id}
                      style={{
                        top: topOf(start),
                        height: (end - start) * PX_PER_MINUTE,
                      }}
                    >
                      <span>{period.name}</span>
                    </div>
                  );
                })}

              {/* Lessons, and empty periods */}
              {lessonPeriods.map((period) => {
                const lesson = lessonAt(day.value, period.id);
                const start = toMinutes(period.start_time);

                // The 1px and 2px leave a thin gap between blocks
                const position = {
                  top: topOf(start) + 1,
                  height: LESSON_DURATION_MINUTES * PX_PER_MINUTE - 2,
                };

                // Buttons in the editor, plain boxes when read-only
                const Tag = clickable ? "button" : "div";
                const buttonProps = clickable
                  ? {
                      type: "button",
                      onClick: () => onSlotClick(day.value, period, lesson),
                    }
                  : {};

                if (!lesson) {
                  return (
                    <Tag
                      key={period.id}
                      className="cal-slot"
                      style={position}
                      {...buttonProps}
                      {...(clickable
                        ? { "aria-label": `${day.label} ${period.name}: empty. Add a lesson` }
                        : {})}
                    >
                      <span className="cal-slot-name">{period.name}</span>
                      {clickable && (
                        <Plus className="cal-slot-plus" size={16} strokeWidth={1.75} />
                      )}
                    </Tag>
                  );
                }

                return (
                  <Tag
                    key={period.id}
                    className="cal-event"
                    style={{
                      ...position,
                      background: COLORS[lesson.subject % COLORS.length],
                    }}
                    {...buttonProps}
                    {...(clickable
                      ? { "aria-label": `${day.label} ${period.name}: ${lesson.subject_name}. Edit` }
                      : {})}
                  >
                    <span className="cal-event-subject">{lesson.subject_name}</span>
                    <span className="cal-event-time">
                      {timeLabel(period.start_time)} – {timeLabel(period.end_time)}
                    </span>
                    <span className="cal-event-meta">{metaFor(lesson)}</span>
                  </Tag>
                );
              })}

              {/* The red "now" line, on today's column only */}
              {day.value === todayDay && showNowLine && (
                <div className="cal-now" style={{ top: topOf(nowMinute) }}></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TimetableCalendar;