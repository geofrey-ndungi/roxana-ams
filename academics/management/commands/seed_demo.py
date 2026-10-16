import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User, Guardian
from academics.models import AcademicYear, SchoolClass, Enrollment, Attendance

FEMALE_NAMES = [
    "Amani", "Wanjiru", "Njeri", "Achieng", "Akinyi", "Zawadi", "Mwende",
    "Nyambura", "Wairimu", "Atieno", "Chebet", "Naserian", "Halima",
    "Fatuma", "Amina", "Faith", "Grace", "Joy", "Mercy", "Esther", "Ivy",
    "Brenda", "Cynthia", "Purity", "Lilian",
]
MALE_NAMES = [
    "Brian", "Kevin", "Dennis", "Collins", "Victor", "Felix", "Samuel",
    "Daniel", "Michael", "Joseph", "Peter", "Elvis", "Allan", "Duncan",
    "Evans", "Gideon", "Moses", "Nelson", "Patrick", "Wilson", "Ian",
    "Ivan", "Brighton", "Kelvin", "Edwin",
]
LAST_NAMES = [
    "Kamau", "Otieno", "Wanjiku", "Mutua", "Kiplagat", "Ochieng", "Njoroge",
    "Mwangi", "Odhiambo", "Kariuki", "Maina", "Wekesa", "Chebet", "Abdi",
    "Hassan", "Nyongesa", "Kimani", "Wafula", "Korir", "Mburu",
]
RESIDENCES = [
    "Kasarani", "Embakasi", "Ruaka", "Kahawa West", "Rongai", "Syokimau",
    "Ngong", "Juja", "Githurai", "Zimmerman", "Donholm", "Umoja",
    "Kilimani", "Lang'ata", "Roysambu",
]

# Every demo student gets an admission number starting with this.
# It is how we find them again to skip them or clear them.
PREFIX = "RX-2026-"


class Command(BaseCommand):
    help = "Creates demo students in Grade 7 for 2026 (for testing only)."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=35,
                            help="How many demo students to create")
        parser.add_argument("--days", type=int, default=0,
                            help="Also create attendance for this many past school days")
        parser.add_argument("--password", default="Student@123",
                            help="Password given to every demo student")
        parser.add_argument("--clear", action="store_true",
                            help="Delete all demo students and their data")

    @transaction.atomic
    def handle(self, *args, **options):
        # --clear: remove the demo data and stop
        if options["clear"]:
            demo = User.objects.filter(admission_number__startswith=PREFIX)
            total = demo.count()
            demo.delete()  # enrollments, guardians and attendance go with them
            self.stdout.write(self.style.SUCCESS(f"Deleted {total} demo students."))
            return

        count = options["count"]
        days = options["days"]
        password = options["password"]

        school_class, _ = SchoolClass.objects.get_or_create(name="Grade 7")

        year = AcademicYear.objects.filter(year=2026).first()
        if not year:
            year = AcademicYear.objects.create(
                year=2026,
                start_date=date(2026, 1, 1),
                end_date=date(2026, 12, 31),
                is_active=True,
            )

        created = 0
        skipped = 0
        first_username = None

        for i in range(1, count + 1):
            admission = f"{PREFIX}{i:03d}"
            student = User.objects.filter(admission_number=admission).first()

            if student:
                skipped += 1  # already there from an earlier run
            else:
                # Each student has their own random generator seeded with i,
                # so student number 7 is the same person every run.
                r = random.Random(i)
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

                # Grade 7 pupils are about 12 to 13 years old
                birth = date(r.choice([2013, 2014]), r.randint(1, 12), r.randint(1, 28))

                student = User.objects.create_user(
                    username=username,
                    password=password,  # create_user stores it hashed
                    first_name=first,
                    last_name=last,
                    role="STUDENT",
                    admission_number=admission,
                    gender=gender,
                    residence=r.choice(RESIDENCES),
                    date_of_birth=birth,
                )

                relationship = r.choice(["Mother", "Father"])
                guardian_first = r.choice(
                    FEMALE_NAMES if relationship == "Mother" else MALE_NAMES
                )
                Guardian.objects.create(
                    student=student,
                    name=f"{guardian_first} {last}",
                    relationship=relationship,
                    phone_number="07" + "".join(str(r.randint(0, 9)) for _ in range(8)),
                    email=f"{username}.parent@example.com",
                )

                created += 1
                if first_username is None:
                    first_username = username

            Enrollment.objects.get_or_create(
                student=student,
                academic_year=year,
                defaults={"school_class": school_class},
            )

        self.stdout.write(self.style.SUCCESS(
            f"Students: {created} created, {skipped} already existed."
        ))

        # Optional: attendance for past school days (never for today,
        # so the dashboard still shows the "Not marked yet" state)
        if days > 0:
            today = timezone.localdate()

            school_days = []
            day = today - timedelta(days=1)
            while len(school_days) < days:
                if day.weekday() < 5:  # Monday to Friday only
                    school_days.append(day)
                day -= timedelta(days=1)

            enrollments = Enrollment.objects.filter(
                school_class=school_class,
                academic_year=year,
                student__admission_number__startswith=PREFIX,  # demo students only
            )

            made = 0
            for enrollment in enrollments:
                for day in school_days:
                    r = random.Random(f"{enrollment.id}-{day.isoformat()}")
                    status = r.choices(
                        ["PRESENT", "ABSENT", "LATE", "EXCUSED"],
                        weights=[85, 6, 5, 4],  # mostly present
                    )[0]

                    _, was_new = Attendance.objects.get_or_create(
                        enrollment=enrollment,
                        date=day,
                        defaults={
                            "status": status,
                            "reason": "Medical appointment" if status == "EXCUSED" else "",
                            "recorded_by": school_class.class_teacher,
                        },
                    )
                    if was_new:
                        made += 1

            self.stdout.write(self.style.SUCCESS(
                f"Attendance: {made} records created for {len(school_days)} school days."
            ))

        if first_username:
            self.stdout.write(f"Example login: {first_username} / {password}")