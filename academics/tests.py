from datetime import date, time

from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from accounts.models import User
from .examination_views import grade_for_percentage
from .models import (
    AcademicYear,
    Enrollment,
    Lesson,
    Period,
    SchoolClass,
    Subject,
    Term,
)


class RoxanaGradeScaleTests(SimpleTestCase):
    def test_grade_4_to_6_boundaries(self):
        self.assertEqual(grade_for_percentage("Grade 4", 80), ("EE", 4))
        self.assertEqual(grade_for_percentage("Grade 6", 65), ("ME", 3))
        self.assertEqual(grade_for_percentage("Grade 5", 50), ("AE", 2))
        self.assertEqual(grade_for_percentage("Grade 4", 49.99), ("BE", 1))

    def test_grade_7_to_9_boundaries(self):
        self.assertEqual(grade_for_percentage("Grade 7", 90), ("EE1", 8))
        self.assertEqual(grade_for_percentage("Grade 8", 75), ("EE2", 7))
        self.assertEqual(grade_for_percentage("Grade 9", 58), ("ME1", 6))
        self.assertEqual(grade_for_percentage("Grade 7", 41), ("ME2", 5))
        self.assertEqual(grade_for_percentage("Grade 8", 31), ("AE1", 4))
        self.assertEqual(grade_for_percentage("Grade 9", 21), ("AE2", 3))
        self.assertEqual(grade_for_percentage("Grade 7", 11), ("BE1", 2))
        self.assertEqual(grade_for_percentage("Grade 9", 10), ("BE2", 1))


class ExaminationReleaseWorkflowTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="exam-admin", password="test-password", role="ADMIN"
        )
        self.math_teacher = User.objects.create_user(
            username="math-teacher", password="test-password", role="TEACHER"
        )
        self.science_teacher = User.objects.create_user(
            username="science-teacher", password="test-password", role="TEACHER"
        )
        self.student_one = User.objects.create_user(
            username="student-one", password="test-password", role="STUDENT"
        )
        self.student_two = User.objects.create_user(
            username="student-two", password="test-password", role="STUDENT"
        )

        self.year = AcademicYear.objects.create(
            year=2026,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            is_active=True,
        )
        self.term = Term.objects.create(
            academic_year=self.year,
            name=Term.TermName.TERM_1,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 4, 30),
        )
        self.school_class = SchoolClass.objects.create(
            name="Grade 4", class_teacher=self.math_teacher
        )
        self.math = Subject.objects.create(name="Mathematics", code="MATH")
        self.science = Subject.objects.create(name="Science", code="SCI")
        self.math_period = Period.objects.create(
            name="Period 1",
            start_time=time(8, 0),
            end_time=time(8, 35),
        )
        self.science_period = Period.objects.create(
            name="Period 2",
            start_time=time(8, 35),
            end_time=time(9, 10),
        )
        Lesson.objects.create(
            term=self.term,
            school_class=self.school_class,
            day=Lesson.Day.MONDAY,
            period=self.math_period,
            subject=self.math,
            teacher=self.math_teacher,
        )
        Lesson.objects.create(
            term=self.term,
            school_class=self.school_class,
            day=Lesson.Day.MONDAY,
            period=self.science_period,
            subject=self.science,
            teacher=self.science_teacher,
        )
        self.enrollment_one = Enrollment.objects.create(
            student=self.student_one,
            school_class=self.school_class,
            academic_year=self.year,
        )
        self.enrollment_two = Enrollment.objects.create(
            student=self.student_two,
            school_class=self.school_class,
            academic_year=self.year,
        )
        self.client = APIClient()

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/examinations/",
            {
                "title": "Term 1 Assessment",
                "term": self.term.id,
                "school_class": self.school_class.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.examination_id = response.data["id"]

    def _submit_subject(self, teacher, subject_name, first_score, second_score):
        self.client.force_authenticate(teacher)
        assignments = self.client.get(
            "/api/examination-subjects/",
            {"examination": self.examination_id},
        )
        self.assertEqual(assignments.status_code, 200)
        assignment = next(
            row for row in assignments.data if row["subject_name"] == subject_name
        )
        saved = self.client.put(
            f"/api/examination-subjects/{assignment['id']}/marks/",
            {
                "marks": [
                    {"enrollment": self.enrollment_one.id, "score": first_score},
                    {"enrollment": self.enrollment_two.id, "score": second_score},
                ]
            },
            format="json",
        )
        self.assertEqual(saved.status_code, 200)
        submitted = self.client.post(
            f"/api/examination-subjects/{assignment['id']}/submit/"
        )
        self.assertEqual(submitted.status_code, 200)

    def test_admin_release_waits_for_every_teacher_and_rank_access_is_scoped(self):
        early_release = self.client.post(
            f"/api/examinations/{self.examination_id}/release/",
            {"include_rankings": True},
            format="json",
        )
        self.assertEqual(early_release.status_code, 400)

        self.client.force_authenticate(self.math_teacher)
        assignments = self.client.get(
            "/api/examination-subjects/",
            {"examination": self.examination_id},
        )
        math_assignment = next(
            row for row in assignments.data if row["subject_name"] == "Mathematics"
        )
        self.client.put(
            f"/api/examination-subjects/{math_assignment['id']}/marks/",
            {
                "marks": [
                    {"enrollment": self.enrollment_one.id, "score": 90},
                ]
            },
            format="json",
        )
        incomplete = self.client.post(
            f"/api/examination-subjects/{math_assignment['id']}/submit/"
        )
        self.assertEqual(incomplete.status_code, 400)

        self._submit_subject(self.math_teacher, "Mathematics", 90, 75)
        self.client.force_authenticate(self.admin)
        still_missing = self.client.post(
            f"/api/examinations/{self.examination_id}/release/",
            {"include_rankings": True},
            format="json",
        )
        self.assertEqual(still_missing.status_code, 400)

        self._submit_subject(self.science_teacher, "Science", 80, 95)
        self.client.force_authenticate(self.admin)
        released = self.client.post(
            f"/api/examinations/{self.examination_id}/release/",
            {"include_rankings": True},
            format="json",
        )
        self.assertEqual(released.status_code, 200)

        self.client.force_authenticate(self.student_one)
        student_exams = self.client.get("/api/examinations/")
        self.assertEqual(student_exams.status_code, 200)
        self.assertEqual(
            [row["id"] for row in student_exams.data],
            [self.examination_id],
        )
        student_results = self.client.get(
            "/api/examination-results/",
            {"examination": self.examination_id},
        )
        self.assertEqual(student_results.status_code, 200)
        self.assertNotIn("rankings", student_results.data)
        self.assertTrue(all("subject_rank" not in row for row in student_results.data["marks"]))

        self.client.force_authenticate(self.math_teacher)
        teacher_results = self.client.get(
            "/api/examination-results/",
            {"examination": self.examination_id},
        )
        self.assertEqual(teacher_results.status_code, 200)
        self.assertEqual(
            {row["subject_name"] for row in teacher_results.data["marks"]},
            {"Mathematics"},
        )
        ranking_types = {row["type"] for row in teacher_results.data["rankings"]}
        self.assertEqual(ranking_types, {"SUBJECT", "CLASS"})
        self.assertTrue(
            all(
                row["subject_name"] == "Mathematics"
                for row in teacher_results.data["rankings"]
                if row["type"] == "SUBJECT"
            )
        )

        self.client.force_authenticate(self.science_teacher)
        science_results = self.client.get(
            "/api/examination-results/",
            {"examination": self.examination_id},
        )
        self.assertEqual(science_results.status_code, 200)
        self.assertEqual(
            {row["subject_name"] for row in science_results.data["marks"]},
            {"Science"},
        )
        self.assertTrue(
            all(row["type"] == "SUBJECT" for row in science_results.data["rankings"])
        )
