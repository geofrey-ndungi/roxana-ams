import re
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Enrollment,
    Examination,
    ExaminationMark,
    ExaminationSubject,
    Lesson,
    SchoolClass,
    Subject,
    Term,
)


def grade_for_percentage(school_class_name, percentage):
    match = re.search(r"\bgrade\s*([4-9])\b", school_class_name, re.IGNORECASE)
    if not match:
        return None, None

    grade = int(match.group(1))
    bands = (
        [
            (80, "EE", 4),
            (65, "ME", 3),
            (50, "AE", 2),
            (0, "BE", 1),
        ]
        if grade <= 6
        else [
            (90, "EE1", 8),
            (75, "EE2", 7),
            (58, "ME1", 6),
            (41, "ME2", 5),
            (31, "AE1", 4),
            (21, "AE2", 3),
            (11, "BE1", 2),
            (0, "BE2", 1),
        ]
    )
    for minimum, label, points in bands:
        if percentage >= minimum:
            return label, points
    return bands[-1][1], bands[-1][2]


def _name(user):
    return user.get_full_name() or user.username


def _exam_data(examination, user):
    subjects = examination.exam_subjects.select_related("subject", "teacher")
    if user.role == "TEACHER":
        subjects = subjects.filter(teacher=user)

    data = {
        "id": examination.id,
        "title": examination.title,
        "term": examination.term_id,
        "term_label": (
            f"{examination.term.get_name_display()} "
            f"{examination.term.academic_year.year}"
        ),
        "school_class": examination.school_class_id,
        "class_name": examination.school_class.name,
        "released_at": examination.released_at,
        "subjects": [
            {
                "id": item.id,
                "subject": item.subject_id,
                "subject_name": item.subject.name,
                "teacher": item.teacher_id,
                "teacher_name": _name(item.teacher),
                "submitted": item.submitted_at is not None,
                "student_count": item.marks.count(),
            }
            for item in subjects
        ],
    }
    if user.role != "STUDENT":
        all_subjects = examination.exam_subjects.all()
        data["submitted_count"] = all_subjects.filter(
            submitted_at__isnull=False
        ).count()
        data["subject_count"] = all_subjects.count()
        data["include_rankings"] = examination.include_rankings
    return data


class ExaminationListCreateView(APIView):
    def get(self, request):
        user = request.user
        examinations = Examination.objects.select_related(
            "term__academic_year", "school_class"
        ).prefetch_related("exam_subjects__subject", "exam_subjects__teacher")

        if user.role == "TEACHER":
            examinations = examinations.filter(
                Q(exam_subjects__teacher=user)
                | Q(school_class__class_teacher=user)
            ).distinct()
        elif user.role == "STUDENT":
            examinations = examinations.filter(
                school_class__enrollments__student=user,
                school_class__enrollments__academic_year=F("term__academic_year"),
                released_at__isnull=False,
            ).distinct()
        elif user.role != "ADMIN":
            return Response({"detail": "You can't view examinations."}, status=403)

        term_id = request.query_params.get("term")
        class_id = request.query_params.get("school_class")
        if term_id:
            if not term_id.isdigit():
                return Response({"detail": "Choose a valid term."}, status=400)
            examinations = examinations.filter(term_id=term_id)
        if class_id:
            if not class_id.isdigit():
                return Response({"detail": "Choose a valid class."}, status=400)
            examinations = examinations.filter(school_class_id=class_id)

        return Response([_exam_data(exam, user) for exam in examinations])

    def post(self, request):
        if request.user.role != "ADMIN":
            return Response(
                {"detail": "Only administrators can create examinations."},
                status=403,
            )

        raw_title = request.data.get("title", "")
        if not isinstance(raw_title, str):
            return Response(
                {"detail": "Enter an examination title (up to 100 characters)."},
                status=400,
            )
        title = raw_title.strip()
        if not title or len(title) > 100:
            return Response(
                {"detail": "Enter an examination title (up to 100 characters)."},
                status=400,
            )

        try:
            term = Term.objects.select_related("academic_year").get(
                pk=request.data.get("term")
            )
            school_class = SchoolClass.objects.get(pk=request.data.get("school_class"))
        except (Term.DoesNotExist, SchoolClass.DoesNotExist, ValueError, TypeError):
            return Response(
                {"detail": "Choose a valid term and class."}, status=400
            )

        if not re.search(r"\bgrade\s*[4-9]\b", school_class.name, re.IGNORECASE):
            return Response(
                {"detail": "Examinations are currently available for Grades 4 to 9."},
                status=400,
            )

        assignments = list(
            Lesson.objects.filter(term=term, school_class=school_class)
            .values_list("subject_id", "teacher_id")
            .distinct()
        )
        teachers_by_subject = defaultdict(set)
        for subject_id, teacher_id in assignments:
            teachers_by_subject[subject_id].add(teacher_id)
        if not teachers_by_subject:
            return Response(
                {
                    "detail": (
                        "Add this class's subject and teacher assignments to the "
                        "timetable before creating an examination."
                    )
                },
                status=400,
            )
        if any(len(teachers) != 1 for teachers in teachers_by_subject.values()):
            return Response(
                {
                    "detail": (
                        "Each subject must have exactly one assigned teacher in "
                        "the timetable before an examination can be created."
                    )
                },
                status=400,
            )

        try:
            with transaction.atomic():
                examination = Examination.objects.create(
                    title=title,
                    term=term,
                    school_class=school_class,
                    created_by=request.user,
                )
                ExaminationSubject.objects.bulk_create(
                    [
                        ExaminationSubject(
                            examination=examination,
                            subject_id=subject_id,
                            teacher_id=next(iter(teachers)),
                        )
                        for subject_id, teachers in teachers_by_subject.items()
                    ]
                )
        except IntegrityError:
            return Response(
                {"detail": "An examination with that title already exists for this class and term."},
                status=400,
            )

        return Response(
            _exam_data(examination, request.user), status=status.HTTP_201_CREATED
        )


class ExaminationReleaseView(APIView):
    def post(self, request, pk):
        if request.user.role != "ADMIN":
            return Response(
                {"detail": "Only administrators can release results."}, status=403
            )

        include_rankings = request.data.get("include_rankings", False)
        if not isinstance(include_rankings, bool):
            return Response(
                {"detail": "Include rankings must be true or false."}, status=400
            )

        with transaction.atomic():
            examination = get_object_or_404(
                Examination.objects.select_for_update()
                .select_related("term__academic_year", "school_class"),
                pk=pk,
            )
            if examination.released_at:
                return Response(
                    {"detail": "This examination's results have already been released."},
                    status=400,
                )

            exam_subjects = examination.exam_subjects.all()
            missing = exam_subjects.filter(submitted_at__isnull=True)
            if not exam_subjects.exists() or missing.exists():
                return Response(
                    {
                        "detail": (
                            "Add subject assignments and collect every teacher's "
                            "marks before releasing results."
                        ),
                        "pending_subjects": [
                            {
                                "subject": row.subject.name,
                                "teacher": _name(row.teacher),
                            }
                            for row in missing.select_related("subject", "teacher")
                        ],
                    },
                    status=400,
                )

            examination.include_rankings = include_rankings
            examination.released_at = timezone.now()
            examination.save(update_fields=["include_rankings", "released_at"])
        return Response(_exam_data(examination, request.user))


class ExaminationSubjectListView(APIView):
    def get(self, request):
        if request.user.role not in ("ADMIN", "TEACHER"):
            return Response({"detail": "You can't view mark-entry assignments."}, status=403)

        subjects = ExaminationSubject.objects.select_related(
            "examination__term__academic_year",
            "examination__school_class",
            "subject",
            "teacher",
        )
        if request.user.role == "TEACHER":
            subjects = subjects.filter(teacher=request.user)

        exam_id = request.query_params.get("examination")
        if exam_id:
            if not exam_id.isdigit():
                return Response({"detail": "Choose a valid examination."}, status=400)
            subjects = subjects.filter(examination_id=exam_id)

        return Response(
            [
                {
                    "id": row.id,
                    "examination": row.examination_id,
                    "examination_title": row.examination.title,
                    "class_name": row.examination.school_class.name,
                    "term_label": (
                        f"{row.examination.term.get_name_display()} "
                        f"{row.examination.term.academic_year.year}"
                    ),
                    "subject": row.subject_id,
                    "subject_name": row.subject.name,
                    "teacher": row.teacher_id,
                    "teacher_name": _name(row.teacher),
                    "max_score": str(row.max_score),
                    "submitted": row.submitted_at is not None,
                    "released": row.examination.released_at is not None,
                    "student_count": row.examination.school_class.enrollments.filter(
                        academic_year=row.examination.term.academic_year
                    ).count(),
                }
                for row in subjects
            ]
        )


def _subject_for_user(request, pk):
    queryset = ExaminationSubject.objects.select_related(
        "examination__school_class",
        "examination__term__academic_year",
        "subject",
        "teacher",
    )
    if request.user.role == "TEACHER":
        queryset = queryset.filter(teacher=request.user)
    elif request.user.role != "ADMIN":
        return None
    return queryset.filter(pk=pk).first()


def _roster(exam_subject):
    enrollments = (
        Enrollment.objects.filter(
            school_class=exam_subject.examination.school_class,
            academic_year=exam_subject.examination.term.academic_year,
        )
        .select_related("student")
        .order_by("student__last_name", "student__first_name", "student__username")
    )
    saved_marks = {
        mark.enrollment_id: mark
        for mark in ExaminationMark.objects.filter(examination_subject=exam_subject)
    }
    return [
        {
            "enrollment": enrollment.id,
            "student_id": enrollment.student_id,
            "student_name": _name(enrollment.student),
            "score": (
                str(saved_marks[enrollment.id].score)
                if enrollment.id in saved_marks
                else ""
            ),
        }
        for enrollment in enrollments
    ]


class ExaminationSubjectMarksView(APIView):
    def get(self, request, pk):
        exam_subject = _subject_for_user(request, pk)
        if exam_subject is None:
            return Response({"detail": "That subject assignment was not found."}, status=404)
        return Response(
            {
                "id": exam_subject.id,
                "subject_name": exam_subject.subject.name,
                "class_name": exam_subject.examination.school_class.name,
                "max_score": str(exam_subject.max_score),
                "submitted": exam_subject.submitted_at is not None,
                "released": exam_subject.examination.released_at is not None,
                "students": _roster(exam_subject),
            }
        )

    def put(self, request, pk):
        if request.user.role != "TEACHER":
            return Response({"detail": "Only assigned teachers can enter marks."}, status=403)
        exam_subject = _subject_for_user(request, pk)
        if exam_subject is None:
            return Response({"detail": "That subject assignment was not found."}, status=404)

        marks = request.data.get("marks")
        if not isinstance(marks, list):
            return Response({"detail": "Marks must be provided as a list."}, status=400)

        validated = []
        seen = set()
        with transaction.atomic():
            examination = Examination.objects.select_for_update().get(
                pk=exam_subject.examination_id
            )
            exam_subject = ExaminationSubject.objects.get(pk=pk)
            if examination.released_at:
                return Response({"detail": "Released marks can no longer be changed."}, status=400)
            if exam_subject.submitted_at:
                return Response({"detail": "Submitted marks can no longer be changed."}, status=400)

            valid_enrollments = set(
                Enrollment.objects.filter(
                    school_class=examination.school_class,
                    academic_year=examination.term.academic_year,
                ).values_list("id", flat=True)
            )
            for row in marks:
                if not isinstance(row, dict):
                    return Response({"detail": "Each mark needs a student and score."}, status=400)
                enrollment_id = row.get("enrollment")
                try:
                    enrollment_id = int(enrollment_id)
                    score = Decimal(str(row.get("score")))
                except (TypeError, ValueError, InvalidOperation):
                    return Response({"detail": "Enter a valid numeric mark for each student."}, status=400)
                if enrollment_id not in valid_enrollments or enrollment_id in seen:
                    return Response({"detail": "A student was duplicated or is not in this class."}, status=400)
                if not score.is_finite() or score < 0 or score > exam_subject.max_score:
                    return Response(
                        {"detail": f"Marks must be between 0 and {exam_subject.max_score}."},
                        status=400,
                    )
                seen.add(enrollment_id)
                validated.append((enrollment_id, score))

            for enrollment_id, score in validated:
                ExaminationMark.objects.update_or_create(
                    examination_subject=exam_subject,
                    enrollment_id=enrollment_id,
                    defaults={"score": score},
                )
        return Response({"saved": len(validated)})


class ExaminationSubjectSubmitView(APIView):
    def post(self, request, pk):
        if request.user.role != "TEACHER":
            return Response({"detail": "Only the assigned teacher can submit marks."}, status=403)
        exam_subject = _subject_for_user(request, pk)
        if exam_subject is None:
            return Response({"detail": "That subject assignment was not found."}, status=404)
        with transaction.atomic():
            examination = Examination.objects.select_for_update().get(
                pk=exam_subject.examination_id
            )
            exam_subject = ExaminationSubject.objects.get(pk=pk)
            if examination.released_at:
                return Response({"detail": "Results have already been released."}, status=400)
            if exam_subject.submitted_at:
                return Response({"detail": "These marks have already been submitted."}, status=400)

            expected = set(
                Enrollment.objects.filter(
                    school_class=examination.school_class,
                    academic_year=examination.term.academic_year,
                ).values_list("id", flat=True)
            )
            submitted = set(
                ExaminationMark.objects.filter(examination_subject=exam_subject)
                .values_list("enrollment_id", flat=True)
            )
            if not expected:
                return Response({"detail": "There are no enrolled students in this class."}, status=400)
            if submitted != expected:
                return Response(
                    {
                        "detail": "Enter a mark for every student before submitting.",
                        "entered": len(submitted),
                        "required": len(expected),
                    },
                    status=400,
                )

            exam_subject.submitted_at = timezone.now()
            exam_subject.save(update_fields=["submitted_at"])
        return Response({"submitted": True, "submitted_at": exam_subject.submitted_at})


def _ranked(values):
    ordered = sorted(values, key=lambda row: (-row["percentage"], row["student_name"].casefold()))
    previous_percentage = None
    rank = 0
    for position, row in enumerate(ordered, start=1):
        if row["percentage"] != previous_percentage:
            rank = position
            previous_percentage = row["percentage"]
        row["rank"] = rank
    return ordered


class ExaminationResultsView(APIView):
    def get(self, request):
        exam_id = request.query_params.get("examination")
        if not exam_id:
            return Response({"detail": "Choose an examination."}, status=400)
        if not exam_id.isdigit():
            return Response({"detail": "Choose a valid examination."}, status=400)

        examination = get_object_or_404(
            Examination.objects.select_related(
                "school_class", "term__academic_year"
            ).prefetch_related("exam_subjects__subject", "exam_subjects__teacher"),
            pk=exam_id,
        )
        user = request.user
        if user.role not in ("ADMIN", "TEACHER", "STUDENT"):
            return Response({"detail": "You can't view examination results."}, status=403)
        if user.role != "ADMIN" and examination.released_at is None:
            return Response({"detail": "Results have not been released."}, status=403)

        enrollment = None
        if user.role == "STUDENT":
            enrollment = Enrollment.objects.filter(
                student=user,
                school_class=examination.school_class,
                academic_year=examination.term.academic_year,
            ).first()
            if enrollment is None:
                return Response({"detail": "This examination is not for your class."}, status=403)

        teacher_assignments = ExaminationSubject.objects.none()
        if user.role == "TEACHER":
            teacher_assignments = ExaminationSubject.objects.filter(
                examination=examination, teacher=user
            )
            is_class_teacher = examination.school_class.class_teacher_id == user.id
            if not teacher_assignments.exists() and not is_class_teacher:
                return Response({"detail": "This examination is not assigned to you."}, status=403)

        marks = ExaminationMark.objects.filter(
            examination_subject__examination=examination
        ).select_related(
            "enrollment__student",
            "examination_subject__subject",
        )
        if user.role == "STUDENT":
            marks = marks.filter(enrollment=enrollment)
        elif user.role == "TEACHER":
            marks = marks.filter(examination_subject__in=teacher_assignments)

        subject_rankings = {}
        overall_rankings = []
        if examination.include_rankings:
            all_marks = list(
                ExaminationMark.objects.filter(
                    examination_subject__examination=examination
                ).select_related(
                    "enrollment__student",
                    "examination_subject__subject",
                    "examination_subject",
                )
            )
            by_subject = defaultdict(list)
            totals = defaultdict(list)
            enrollment_names = {}
            enrollment_student_ids = {}
            for mark in all_marks:
                enrollment_id = mark.enrollment_id
                percentage = (mark.score / mark.examination_subject.max_score * 100).quantize(
                    Decimal("0.01")
                )
                name = _name(mark.enrollment.student)
                enrollment_names[enrollment_id] = name
                enrollment_student_ids[enrollment_id] = mark.enrollment.student_id
                subject_id = mark.examination_subject.subject_id
                by_subject[subject_id].append(
                    {
                        "student_id": mark.enrollment.student_id,
                        "student_name": name,
                        "percentage": percentage,
                    }
                )
                totals[enrollment_id].append(percentage)
            for subject_id, values in by_subject.items():
                subject_rankings[subject_id] = _ranked(values)

            if len(all_marks) and examination.include_rankings:
                total_subjects = examination.exam_subjects.count()
                complete_rows = [
                    {
                        "enrollment_id": enrollment_id,
                        "student_id": enrollment_student_ids[enrollment_id],
                        "student_name": enrollment_names[enrollment_id],
                        "percentage": (sum(scores) / len(scores)).quantize(Decimal("0.01")),
                    }
                    for enrollment_id, scores in totals.items()
                    if len(scores) == total_subjects
                ]
                overall_rankings = _ranked(complete_rows)

        results = []
        for mark in marks:
            exam_subject = mark.examination_subject
            percentage = (mark.score / exam_subject.max_score * 100).quantize(
                Decimal("0.01")
            )
            grade, points = grade_for_percentage(
                examination.school_class.name, percentage
            )
            row = {
                "enrollment": mark.enrollment_id,
                "student_id": mark.enrollment.student_id,
                "student_name": _name(mark.enrollment.student),
                "subject": exam_subject.subject_id,
                "subject_name": exam_subject.subject.name,
                "score": str(mark.score),
                "max_score": str(exam_subject.max_score),
                "percentage": str(percentage),
                "grade": grade,
                "points": points,
            }
            if user.role == "ADMIN":
                subject_rank = next(
                    (
                        item["rank"]
                        for item in subject_rankings.get(exam_subject.subject_id, [])
                        if item["student_id"] == mark.enrollment.student_id
                    ),
                    None,
                )
                overall_rank = next(
                    (
                        item["rank"]
                        for item in overall_rankings
                        if item["enrollment_id"] == mark.enrollment_id
                    ),
                    None,
                )
                if examination.include_rankings:
                    row["subject_rank"] = subject_rank
                    row["overall_rank"] = overall_rank
            elif user.role == "TEACHER" and examination.include_rankings:
                row["subject_rank"] = next(
                    (
                        item["rank"]
                        for item in subject_rankings.get(exam_subject.subject_id, [])
                        if item["student_id"] == mark.enrollment.student_id
                    ),
                    None,
                )
            results.append(row)

        response = {
            "examination": _exam_data(examination, user),
            "marks": results,
        }
        if user.role != "STUDENT" and examination.include_rankings:
            visible_rankings = []
            if user.role == "ADMIN":
                allowed_subjects = set(subject_rankings)
                show_overall = True
            else:
                allowed_subjects = set(
                    teacher_assignments.values_list("subject_id", flat=True)
                )
                show_overall = examination.school_class.class_teacher_id == user.id

            for subject_id in allowed_subjects:
                subject = Subject.objects.get(pk=subject_id)
                visible_rankings.extend(
                    {
                        "type": "SUBJECT",
                        "subject": subject_id,
                        "subject_name": subject.name,
                        "student_id": row["student_id"],
                        "student_name": row["student_name"],
                        "rank": row["rank"],
                        "percentage": str(row["percentage"]),
                    }
                    for row in subject_rankings.get(subject_id, [])
                )
            if show_overall:
                visible_rankings.extend(
                    {
                        "type": "CLASS",
                        "student_id": row["student_id"],
                        "student_name": row["student_name"],
                        "rank": row["rank"],
                        "percentage": str(row["percentage"]),
                    }
                    for row in overall_rankings
                )
            response["rankings"] = visible_rankings

        return Response(response)


class ExaminationAnalyticsView(APIView):
    def get(self, request):
        user = request.user
        if user.role not in ("ADMIN", "TEACHER"):
            return Response({"detail": "Exam analytics are for school staff."}, status=403)

        exam_id = request.query_params.get("examination")
        if not exam_id:
            return Response({"detail": "Choose an examination."}, status=400)
        if not exam_id.isdigit():
            return Response({"detail": "Choose a valid examination."}, status=400)
        examination = get_object_or_404(
            Examination.objects.select_related(
                "school_class", "term__academic_year"
            ),
            pk=exam_id,
        )
        if user.role == "TEACHER":
            if examination.released_at is None:
                return Response({"detail": "Results have not been released."}, status=403)
            assigned = ExaminationSubject.objects.filter(
                examination=examination, teacher=user
            )
            is_class_teacher = examination.school_class.class_teacher_id == user.id
            if not assigned.exists() and not is_class_teacher:
                return Response({"detail": "This examination is not assigned to you."}, status=403)
            if is_class_teacher:
                assigned = ExaminationSubject.objects.filter(examination=examination)
        else:
            assigned = ExaminationSubject.objects.filter(examination=examination)

        marks = ExaminationMark.objects.filter(
            examination_subject__in=assigned
        ).select_related("examination_subject__subject")
        if user.role == "TEACHER" and examination.school_class.class_teacher_id != user.id:
            marks = marks.filter(examination_subject__teacher=user)

        percentages = []
        by_subject = defaultdict(list)
        grades_by_subject = defaultdict(Counter)
        for mark in marks:
            exact_percentage = (
                mark.score / mark.examination_subject.max_score * 100
            )
            percentage = float(exact_percentage)
            percentages.append(percentage)
            subject_name = mark.examination_subject.subject.name
            by_subject[subject_name].append(percentage)
            grade, points = grade_for_percentage(
                examination.school_class.name, exact_percentage
            )
            if grade:
                grades_by_subject[subject_name][(points, grade)] += 1

        return Response(
            {
                "examination": examination.title,
                "class_name": examination.school_class.name,
                "student_count": examination.school_class.enrollments.filter(
                    academic_year=examination.term.academic_year
                ).count(),
                "marks_recorded": len(percentages),
                "average_percentage": (
                    round(sum(percentages) / len(percentages), 2)
                    if percentages
                    else None
                ),
                "subjects": [
                    {
                        "name": name,
                        "marks_recorded": len(values),
                        "average_percentage": round(sum(values) / len(values), 2),
                        "highest_percentage": round(max(values), 2),
                        "lowest_percentage": round(min(values), 2),
                        "grade_distribution": [
                            {"grade": grade, "students": count}
                            for (points, grade), count in sorted(
                                grades_by_subject[name].items(), reverse=True
                            )
                        ],
                    }
                    for name, values in sorted(by_subject.items())
                ],
            }
        )
