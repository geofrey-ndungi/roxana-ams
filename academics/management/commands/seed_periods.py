from datetime import time

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from academics.models import Period

# (name, start, end, is it an editable lesson?)
PERIODS = [
    ("Assembly", time(7, 50), time(8, 20), False),
    ("Period 2", time(8, 20), time(8, 55), True),
    ("Period 3", time(8, 55), time(9, 30), True),
    ("Short Break", time(9, 30), time(9, 50), False),
    ("Period 4", time(9, 50), time(10, 25), True),
    ("Period 5", time(10, 25), time(11, 0), True),
    ("Tea Break", time(11, 0), time(11, 30), False),
    ("Period 6", time(11, 30), time(12, 5), True),
    ("Period 7", time(12, 5), time(12, 40), True),
    ("Lunch", time(12, 40), time(14, 0), False),
    ("Period 8", time(14, 0), time(14, 35), True),
    ("Period 9", time(14, 35), time(15, 10), True),
    ("Games", time(15, 10), time(16, 0), False),
]


class Command(BaseCommand):
    help = "Creates or updates the school's standard timetable periods."

    def handle(self, *args, **options):
        created_count = 0
        with transaction.atomic():
            old_lesson_periods = [
                (period, int(period.name.split()[-1]))
                for period in Period.objects.filter(
                    name__in=[f"Period {number}" for number in range(1, 9)]
                )
            ]
            if old_lesson_periods and any(
                old_number == 1 for _, old_number in old_lesson_periods
            ):
                if Period.objects.filter(name="Period 9").exists():
                    raise CommandError(
                        "Cannot shift the existing period numbers: Period 9 already exists."
                    )

                for period, _ in old_lesson_periods:
                    period.name = f"__old_period_{period.pk}"
                    period.save(update_fields=["name"])

                for period, old_number in old_lesson_periods:
                    period.name = f"Period {old_number + 1}"
                    period.save(update_fields=["name"])

            for old_name, new_name in (
                ("Break", "Short Break"),
                ("Break 2", "Tea Break"),
            ):
                old_period = Period.objects.filter(name=old_name).first()
                if old_period and not Period.objects.filter(name=new_name).exists():
                    old_period.name = new_name
                    old_period.save(update_fields=["name"])

            for name, start, end, is_lesson in PERIODS:
                _, created = Period.objects.update_or_create(
                    name=name,
                    defaults={
                        "start_time": start,
                        "end_time": end,
                        "is_lesson": is_lesson,
                    },
                )
                created_count += created

        self.stdout.write(
            self.style.SUCCESS(
                f"Standard timetable periods are ready ({created_count} newly created)."
            )
        )