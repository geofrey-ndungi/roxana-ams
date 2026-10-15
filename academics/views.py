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
        queryset = Enrollment.objects.select_related("student", "school_class")
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
    permission_classes= [IsClassTeacherOrAdmin] 



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
            "students": students,
        })