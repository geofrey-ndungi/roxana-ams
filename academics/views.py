from rest_framework import viewsets
from .models import AcademicYear, Term,  SchoolClass, Subject, Enrollment, Attendance
from .serializers import (AcademicYearSerializer,
                          TermSerializer, 
                          EnrollmentSerializer, 
                          SubjectSerializer, 
                          SchoolClassSerializer,
                          AttendanceSerializer)
from .permissions import IsAdminOrReadOnly, IsClassTeacherOrAdmin
from django.db.models import Count
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
import datetime
from django.db import transaction
from rest_framework.decorators import action
from accounts.models import User







class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()  # Usig all AcademicYear rows
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAdminOrReadOnly]



class TermViewSet(viewsets.ModelViewSet):
    queryset  = Term.objects.all()   # Using all Term rows(objects created)
    serializer_class = TermSerializer
    permission_classes = [IsAdminOrReadOnly]



class SchoolClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all() # default: returns for all Classes
    serializer_class = SchoolClassSerializer
    permission_classes = [IsAdminOrReadOnly]


    # This runs instead of the plain `queryset` line above, whenever
    # DRF needs to decide what to return for a request. It lets us
    # change the result based on things like the URL's query params.
    def get_queryset(self):
        queryset = SchoolClass.objects.all()
        mine = self.request.query_params.get("mine")

        if mine == "true":
            queryset = queryset.filter(class_teacher=self.request.user)

        return queryset


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAdminOrReadOnly]



class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        queryset = Enrollment.objects.select_related("student", "school_class")

        # Who is allowed to see which enrollments
        if user.role == "TEACHER":
            queryset = queryset.filter(school_class__class_teacher=user)
        elif user.role == "STUDENT":
            queryset = queryset.filter(student=user)
        elif user.role != "ADMIN":
            queryset = queryset.none()  # any other role sees nothing

        # Optional filters: /api/enrollments/?school_class=1&academic_year=2
        school_class = self.request.query_params.get("school_class")
        academic_year = self.request.query_params.get("academic_year")

        if school_class:
            queryset = queryset.filter(school_class_id=school_class)
        if academic_year:
            queryset = queryset.filter(academic_year_id=academic_year)

        return queryset


    

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsClassTeacherOrAdmin]

    def get_queryset(self):
        user = self.request.user
        queryset = Attendance.objects.select_related("enrollment")

        # Who is allowed to see which records
        if user.role == "TEACHER":
            queryset = queryset.filter(enrollment__school_class__class_teacher=user)
        elif user.role == "STUDENT":
            queryset = queryset.filter(enrollment__student=user)
        # An admin sees everything.

        # Optional filters: /api/attendance/?date=2026-10-16&school_class=1
        date = self.request.query_params.get("date")
        school_class = self.request.query_params.get("school_class")

        if date:
            queryset = queryset.filter(date=date)
        if school_class:
            queryset = queryset.filter(enrollment__school_class_id=school_class)

        return queryset

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request):
        """Saves a whole day's attendance at once: new rows are created,
        rows that already exist are updated."""
        user = request.user
        raw_date = request.data.get("date")
        records = request.data.get("records")

        if not raw_date or not isinstance(records, list) or not records:
            return Response(
                {"detail": "A date and a list of records are required."},
                status=400,
            )

        try:
            day = datetime.date.fromisoformat(raw_date)
        except (TypeError, ValueError):
            return Response({"detail": "The date must look like 2026-10-16."}, status=400)

        if day > timezone.localdate():
            return Response(
                {"detail": "You can't record attendance for a future date."},
                status=400,
            )

        # Check every record before saving anything
        valid_statuses = {value for value, _ in Attendance.Status.choices}
        for record in records:
            if not isinstance(record, dict) or record.get("status") not in valid_statuses:
                return Response(
                    {"detail": "Every record needs an enrollment and a valid status."},
                    status=400,
                )

        enrollments = Enrollment.objects.select_related("school_class").in_bulk(
            [record.get("enrollment") for record in records]
        )

        for record in records:
            enrollment = enrollments.get(record.get("enrollment"))
            if enrollment is None:
                return Response({"detail": "One of the students was not found."}, status=400)

            # A teacher can only save attendance for their own class
            if user.role == "TEACHER" and enrollment.school_class.class_teacher_id != user.id:
                return Response(
                    {"detail": "You can only record attendance for your own class."},
                    status=403,
                )

        # All or nothing: if anything fails, none of it is saved
        with transaction.atomic():
            for record in records:
                Attendance.objects.update_or_create(
                    enrollment_id=record["enrollment"],
                    date=day,
                    defaults={
                        "status": record["status"],
                        "reason": (
                            (record.get("reason") or "")[:255]
                            if record["status"] == "EXCUSED"
                            else ""
                        ),
                        "recorded_by": user,
                    },
                )

        return Response({"saved": len(records)}) 



class MyProfileView(APIView):
    """Everything the student profile page needs, for the logged-in user."""

    def get(self, request):
        user = request.user

        # The student's most recent enrollment (latest academic year first)
        enrollment = (
            Enrollment.objects.select_related("school_class", "academic_year")
            .filter(student=user)
            .order_by("-academic_year__year")
            .first()
        )

        # Start every status at 0, then fill in the real counts
        attendance = {"PRESENT": 0, "ABSENT": 0, "LATE": 0, "EXCUSED": 0}
        if enrollment:
            rows = (
                enrollment.attendance_records.values("status")
                .annotate(total=Count("id"))
            )
            for row in rows:
                attendance[row["status"]] = row["total"]

        guardians = [
            {
                "name": g.name,
                "relationship": g.relationship,
                "phone_number": g.phone_number,
                "email": g.email,
            }
            for g in user.guardians.all()
        ]

        photo_url = request.build_absolute_uri(user.photo.url) if user.photo else None

        return Response({
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "full_name": user.get_full_name() or user.username,
            "photo": photo_url,
            "school_class": enrollment.school_class.name if enrollment else None,
            "academic_year": enrollment.academic_year.year if enrollment else None,
            "admission_number": user.admission_number,
            "gender": user.get_gender_display() if user.gender else None,
            "residence": user.residence,
            "date_of_birth": user.date_of_birth,
            "attendance": attendance,
            "guardians": guardians,
            
        })


def count_by_status(queryset):
    """Turns attendance rows into {"PRESENT": 28, "ABSENT": 2, ...}."""
    counts = {"PRESENT": 0, "ABSENT": 0, "LATE": 0, "EXCUSED": 0}
    for row in queryset.values("status").annotate(total=Count("id")):
        counts[row["status"]] = row["total"]
    return counts


class TeacherDashboardView(APIView):
    """Everything the teacher dashboard page needs, in one request."""

    def get(self, request):
        user = request.user

        if user.role != "TEACHER":
            return Response(
                {"detail": "Only teachers can view this dashboard."},
                status=403,
            )

        today = timezone.localdate()

        # The parts of the answer that don't depend on having a class
        base = {
            "first_name": user.first_name or user.username,
            "full_name": user.get_full_name() or user.username,
            "photo": request.build_absolute_uri(user.photo.url) if user.photo else None,
            "today": today,
        }

        # The class this teacher is in charge of
        school_class = user.classes_taught.first()
        if not school_class:
            return Response({**base, "school_class": None})

        # The academic year that today falls inside. If the dates aren't
        # filled in properly, fall back to the active one, then the newest.
        year = (
            AcademicYear.objects.filter(start_date__lte=today, end_date__gte=today).first()
            or AcademicYear.objects.filter(is_active=True).first()
            or AcademicYear.objects.first()
        )

        enrollments = (
            Enrollment.objects.filter(school_class=school_class, academic_year=year)
            .select_related("student")
            .order_by("student__first_name", "student__username")
        )

        # Today's attendance
        todays_records = Attendance.objects.filter(
            enrollment__in=enrollments, date=today
        )
        status_by_enrollment = {r.enrollment_id: r.status for r in todays_records}
        today_counts = count_by_status(todays_records)
        marked_count = len(status_by_enrollment)

        # Late students did come to school, so they count as attended.
        attended = today_counts["PRESENT"] + today_counts["LATE"]
        rate = round(attended / marked_count * 100, 1) if marked_count else None

        # The last day BEFORE today that has any attendance records.
        # (So Monday compares with Friday, not with an empty Sunday.)
        previous_date = (
            Attendance.objects.filter(enrollment__in=enrollments, date__lt=today)
            .order_by("-date")
            .values_list("date", flat=True)
            .first()
        )

        previous = None
        if previous_date:
            previous = {
                "date": previous_date,
                "weekday": previous_date.strftime("%A"),
                "counts": count_by_status(
                    Attendance.objects.filter(
                        enrollment__in=enrollments, date=previous_date
                    )
                ),
            }


        # The last 7 days that have attendance (including today, if recorded)
        recent_dates = list(
            Attendance.objects.filter(enrollment__in=enrollments, date__lte=today)
            .order_by("-date")
            .values_list("date", flat=True)
            .distinct()[:7]
        )

        # Start every day at zero for each status, then fill in the real counts
        history_by_date = {
            d: {"PRESENT": 0, "ABSENT": 0, "LATE": 0, "EXCUSED": 0}
            for d in recent_dates
        }
        rows = (
            Attendance.objects.filter(
                enrollment__in=enrollments, date__in=recent_dates
            )
            .values("date", "status")
            .annotate(total=Count("id"))
        )
        for row in rows:
            history_by_date[row["date"]][row["status"]] = row["total"]

        history = [
            {"date": d, "weekday": d.strftime("%A"), "counts": history_by_date[d]}
            for d in sorted(recent_dates)  # oldest first, so the chart reads left to right
        ]

        students = [
            {
                "enrollment_id": e.id,
                "name": e.student.get_full_name() or e.student.username,
                "photo": (
                    request.build_absolute_uri(e.student.photo.url)
                    if e.student.photo
                    else None
                ),
                "status": status_by_enrollment.get(e.id),  # None = not marked
            }
            for e in enrollments
        ]

        return Response({
            **base,
            "school_class": school_class.name,
            "academic_year": year.year if year else None,
            "student_count": len(students),
            "marked": marked_count > 0,
            "marked_count": marked_count,
            "counts": today_counts,
            "rate": rate,
            "previous": previous,
            "history": history,
            "students": students,
        })



def empty_counts():
    return {"PRESENT": 0, "ABSENT": 0, "LATE": 0, "EXCUSED": 0}


class AdminDashboardView(APIView):
    """Whole-school numbers for the admin dashboard.

    "Present rate" everywhere means (present + late) divided by the
    students recorded, the same rule as the teacher dashboard."""

    def get(self, request):
        user = request.user

        if user.role != "ADMIN":
            return Response(
                {"detail": "Only administrators can view this dashboard."},
                status=403,
            )

        today = timezone.localdate()

        # Same year rule as the teacher dashboard
        year = (
            AcademicYear.objects.filter(start_date__lte=today, end_date__gte=today).first()
            or AcademicYear.objects.filter(is_active=True).first()
            or AcademicYear.objects.first()
        )

        enrollments = (
            Enrollment.objects.filter(academic_year=year)
            if year
            else Enrollment.objects.none()
        )

        classes = list(
            SchoolClass.objects.select_related("class_teacher").order_by("name")
        )

        # How many students each class has this year: {class id: number}
        students_per_class = {
            row["school_class"]: row["total"]
            for row in enrollments.values("school_class").annotate(total=Count("id"))
        }

        # Today's attendance, counted per class and per status
        today_by_class = {}
        today_rows = (
            Attendance.objects.filter(enrollment__in=enrollments, date=today)
            .values("enrollment__school_class", "status")
            .annotate(total=Count("id"))
        )
        for row in today_rows:
            counts = today_by_class.setdefault(
                row["enrollment__school_class"], empty_counts()
            )
            counts[row["status"]] = row["total"]

        # One row per class for the table, and running totals for the school
        school_counts = empty_counts()
        class_rows = []

        for school_class in classes:
            student_count = students_per_class.get(school_class.id, 0)
            counts = today_by_class.get(school_class.id, empty_counts())
            recorded = sum(counts.values())

            if student_count == 0:
                status = "NO_STUDENTS"
            elif recorded == 0:
                status = "NOT_MARKED"
            elif recorded < student_count:
                status = "PARTLY_RECORDED"
            else:
                status = "RECORDED"

            attended = counts["PRESENT"] + counts["LATE"]
            teacher = school_class.class_teacher

            class_rows.append({
                "id": school_class.id,
                "name": school_class.name,
                "teacher": (teacher.get_full_name() or teacher.username) if teacher else None,
                "student_count": student_count,
                "recorded": recorded,
                "status": status,
                "rate": round(attended / recorded * 100, 1) if recorded else None,
            })

            for key, value in counts.items():
                school_counts[key] += value

        total_students = sum(students_per_class.values())
        total_recorded = sum(school_counts.values())
        school_attended = school_counts["PRESENT"] + school_counts["LATE"]

        # A class with no students can't record attendance, so it is left out
        classes_with_students = [c for c in class_rows if c["student_count"] > 0]
        classes_started = [c for c in classes_with_students if c["recorded"] > 0]
        classes_missing = [c for c in classes_with_students if c["recorded"] == 0]
        classes_without_teacher = [c for c in class_rows if c["teacher"] is None]

        # The school's last 7 days that have attendance, for the trend chart
        recent_dates = list(
            Attendance.objects.filter(enrollment__in=enrollments, date__lte=today)
            .order_by("-date")
            .values_list("date", flat=True)
            .distinct()[:7]
        )

        per_day = {d: empty_counts() for d in recent_dates}
        day_rows = (
            Attendance.objects.filter(enrollment__in=enrollments, date__in=recent_dates)
            .values("date", "status")
            .annotate(total=Count("id"))
        )
        for row in day_rows:
            per_day[row["date"]][row["status"]] = row["total"]

        trend = []
        for day in sorted(recent_dates):  # oldest first
            counts = per_day[day]
            recorded = sum(counts.values())
            attended = counts["PRESENT"] + counts["LATE"]
            trend.append({
                "date": day,
                "weekday": day.strftime("%A"),
                "recorded": recorded,
                "rate": round(attended / recorded * 100, 1) if recorded else None,
            })

        return Response({
            "today": today,
            "academic_year": year.year if year else None,
            "totals": {
                "students": total_students,
                "teachers": User.objects.filter(role="TEACHER", is_active=True).count(),
                "classes": len(classes),
                "subjects": Subject.objects.count(),
            },
            "attendance": {
                "counts": school_counts,
                "recorded": total_recorded,
                "not_marked": total_students - total_recorded,
                "rate": round(school_attended / total_recorded * 100, 1) if total_recorded else None,
                "classes_total": len(classes_with_students),
                "classes_recorded": len(classes_started),
            },
            "trend": trend,
            "classes": class_rows,
            "attention": {
                "missing_attendance": [
                    {"id": c["id"], "name": c["name"], "teacher": c["teacher"]}
                    for c in classes_missing
                ],
                "no_teacher": [
                    {"id": c["id"], "name": c["name"], "student_count": c["student_count"]}
                    for c in classes_without_teacher
                ],
            },
        })