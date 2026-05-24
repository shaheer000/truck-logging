from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("trips", "0002_trip_driver_trip_status_driverprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="logsheet",
            name="header",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
