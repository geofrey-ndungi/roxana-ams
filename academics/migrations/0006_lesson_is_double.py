from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academics", "0005_period_lesson"),
    ]

    operations = [
        migrations.AddField(
            model_name="lesson",
            name="is_double",
            field=models.BooleanField(default=False),
        ),
    ]
