from datetime import time

from django.core.management.base import BaseCommand

from academics.models import Period

# (name, start, end, is it a lesson?)
PERIODS = [
    ("Period 1", time(8, 0), time(8, 40), True),
    ("Period 2", time(8, 40), time(9, 20), True),
    ("Period 3", time(9, 20), time(10, 0), True),
    ("Break", time(10, 0), time(10, 30), False),
    ("Period 4", time(10, 30), time(11, 10), True),
    ("Period 5", time(11, 10), time(11, 50), True),
    ("Period 6", time(11, 50), time(12, 30), True),
    ("Lunch", time(12, 30), time(14, 0), False),
    ("Period 7", time(14, 0), time(14, 40), True),
    ("Period 8", time(14, 40), time(15, 20), True),
]


class Command(BaseCommand):
    help = "Creates a sample school day of periods (edit the times to match your school)."

    def handle(self, *args, **options):
        made = 0
        for name, start, end, is_lesson in PERIODS:
            _, created = Period.objects.get_or_create(
                name=name,
                defaults={
                    "start_time": start,
                    "end_time": end,
                    "is_lesson": is_lesson,
                },
            )
            made += created  # True counts as 1

        self.stdout.write(self.style.SUCCESS(f"{made} periods created."))