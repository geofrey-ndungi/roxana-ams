import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User, Guardian
from academics.models import AcademicYear, SchoolClass, Enrollment, Attendance

# Reuse the name lists from the first seed command
from academics.management.commands.seed_demo import (
    FEMALE_NAMES,
    MALE_NAMES,
    LAST_NAMES,
    RESIDENCES,
)

# "today" decides what the class looks like right now:
# NOT_MARKED = nothing saved, PARTLY = about 60% saved, RECORDED = everyone saved.
CLASS_PLAN = [
    {"name": "Grade 5", "teacher": ("Grace", "Wambui"), "students": 24,
     "today": "NOT_MARKED", "present": 90},
    {"name": "Grade 6", "teacher": ("Peter", "Otieno"), "students": 28,
     "today": "RECORDED", "present": 94},
    {"name": "Grade 8", "teacher": ("Mary", "Achieng"), "students": 26,
     "today": "PARTLY", "present": 80},
    {"name": "Grade 9", "teacher": None, "students": 22,
     "today": "RECORDED", "present": 88},
]

# These start with "RX-2026-", so `seed_demo --clear` removes these students too.
STUDENT_PREFIX = "RX-2026-X"
TEACHER_PREFIX = "demo.teacher."


def make_student(r, admission, password):
    """Creates one student with a guardian. `r` is a seeded random generator."""
    gender = r.choice(["MALE", "FEMALE"])
    first = r.choice(FEMALE_NAMES if gender == "FEMALE" else MALE_NAMES)
    last = r.choice(LAST_NAMES)

    # Make the username unique: amani.kamau, amani.kamau2, ...
    base = f"{first}.{last}".lower()
    username = base
    n = 2
    while User.objects.filter(username=username).exists():
        username = f"{base}{n}"
        n += 1

    student = User.objects.create_user(
        username=username,
        password=password,  # create_user stores it hashed
        first_name=first,
        last_name=last,
        role="STUDENT",
        admission_number=admission,
        gender=gender,
        residence=r.choice(RESIDENCES),
        date_of_birth=date(
            r.choice([2010, 2011, 2012, 2013]), r.randint(1, 12), r.randint(1, 28)
        ),
    )

    relationship = r.choice(["Mother", "Father"])
    guardian_first = r.choice(FEMALE_NAMES if relationship == "Mother" else MALE_NAMES)
    Guardian.objects.create(
        student=student,
        name=f"{guardian_first} {last}",
        relationship=relationship,
        phone_number="07" + "".join(str(r.randint(0, 9)) for _ in range(8)),
        email=f"{username}.parent@example.com",
    )
    return student


def pick_status(r, present_weight):
    """Mostly Present. The rest is split between Absent, Late and Excused."""
    rest = 100 - present_weight
    return r.choices(
        ["PRESENT", "ABSENT", "LATE", "EXCUSED"],
        weights=[present_weight, rest * 0.45, rest * 0.30, rest * 0.25],
    )[0]


class Command(BaseCommand):
    help = "Creates extra demo classes, teachers, students and attendance (testing only)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7,
                            help="How many past school days of attendance to create")
        parser.add_argument("--password", default="Student@123",
                            help="Password given to every demo account")
        parser.add_argument("--clear", action="store_true",
                            help="Delete the demo students and teachers made by this command")

    @transaction.atomic
    def handle(self, *args, **options):
        # --clear: remove the demo accounts and stop
        if options["clear"]:
            students = User.objects.filter(admission_number__startswith=STUDENT_PREFIX)
            student_total = students.count()
            students.delete()  # enrollments, guardians and attendance go with them

            teachers = User.objects.filter(username__startswith=TEACHER_PREFIX)
            teacher_total = teachers.count()
            teachers.delete()  # their classes become "no class teacher"

            self.stdout.write(self.style.SUCCESS(
                f"Deleted {student_total} students and {teacher_total} teachers. "
                "The classes themselves are kept; delete them in /admin/ if you want."
            ))
            return

        password = options["password"]
        today = timezone.localdate()

        year = AcademicYear.objects.filter(year=2026).first()
        if not year:
            year = AcademicYear.objects.create(
                year=2026,
                start_date=date(2026, 1, 1),
                end_date=date(2026, 12, 31),
                is_active=True,
            )

        # The last N weekdays before today
        school_days = []
        day = today - timedelta(days=1)
        while len(school_days) < options["days"]:
            if day.weekday() < 5:
                school_days.append(day)
            day -= timedelta(days=1)

        for class_number, plan in enumerate(CLASS_PLAN, start=1):
            school_class, _ = SchoolClass.objects.get_or_create(name=plan["name"])

            # The class teacher (only if this class is meant to have one)
            if plan["teacher"]:
                first, last = plan["teacher"]
                username = f"{TEACHER_PREFIX}{first.lower()}"
                teacher = User.objects.filter(username=username).first()
                if not teacher:
                    teacher = User.objects.create_user(
                        username=username,
                        password=password,
                        first_name=first,
                        last_name=last,
                        role="TEACHER",
                    )
                # Never replace a teacher who is already assigned
                if school_class.class_teacher_id is None:
                    school_class.class_teacher = teacher
                    school_class.save()

            # The students
            for n in range(1, plan["students"] + 1):
                admission = f"{STUDENT_PREFIX}{class_number}{n:03d}"
                student = User.objects.filter(admission_number=admission).first()

                if not student:
                    r = random.Random(f"{class_number}-{n}")
                    student = make_student(r, admission, password)

                Enrollment.objects.get_or_create(
                    student=student,
                    academic_year=year,
                    defaults={"school_class": school_class},
                )

            # Attendance, for the demo students only (never real ones)
            enrollments = list(
                Enrollment.objects.filter(
                    school_class=school_class,
                    academic_year=year,
                    student__admission_number__startswith=STUDENT_PREFIX,
                ).order_by("id")
            )

            # Today: depends on the state this class is meant to be in
            if plan["today"] == "RECORDED":
                today_group = enrollments
            elif plan["today"] == "PARTLY":
                today_group = enrollments[: int(len(enrollments) * 0.6)]
            else:
                today_group = []

            work = [(e, d) for e in enrollments for d in school_days]
            work += [(e, today) for e in today_group]

            made = 0
            for enrollment, day in work:
                r = random.Random(f"{enrollment.id}-{day.isoformat()}")
                status = pick_status(r, plan["present"])

                _, was_new = Attendance.objects.get_or_create(
                    enrollment=enrollment,
                    date=day,
                    defaults={
                        "status": status,
                        "reason": "Family matter" if status == "EXCUSED" else "",
                        "recorded_by": school_class.class_teacher,
                    },
                )
                if was_new:
                    made += 1

            self.stdout.write(
                f"{plan['name']}: {len(enrollments)} students, {made} attendance records"
            )

        self.stdout.write(self.style.SUCCESS("Done."))
        self.stdout.write(f"Teacher logins: demo.teacher.grace / peter / mary, password {password}")