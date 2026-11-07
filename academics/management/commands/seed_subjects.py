from django.core.management.base import BaseCommand

from academics.models import Subject

SUBJECTS = [
    ("Mathematics", "MATH101"),
    ("English", "ENG101"),
    ("Kiswahili", "KIS101"),
    ("Science", "SCI101"),
    ("Social Studies", "SST101"),
    ("CRE", "CRE101"),
    ("Creative Arts", "ART101"),
    ("Physical Education", "PE101"),
]


class Command(BaseCommand):
    help = "Creates common school subjects (skips ones that already exist)."

    def handle(self, *args, **options):
        made = 0
        for name, code in SUBJECTS:
            if Subject.objects.filter(name__iexact=name).exists():
                continue
            # Codes must be unique, so leave it empty if it is already taken
            if Subject.objects.filter(code=code).exists():
                code = None
            Subject.objects.create(name=name, code=code)
            made += 1

        self.stdout.write(self.style.SUCCESS(f"{made} subjects created."))