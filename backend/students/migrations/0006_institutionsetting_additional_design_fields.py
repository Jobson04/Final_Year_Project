from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0005_course_lecturer_courseassignment_attendancesession_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="institutionsetting",
            name="card_size",
            field=models.CharField(default="CR80", max_length=20),
        ),
        migrations.AddField(
            model_name="institutionsetting",
            name="field_order",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="institutionsetting",
            name="layout_template",
            field=models.CharField(default="student", max_length=40),
        ),
        migrations.AddField(
            model_name="institutionsetting",
            name="logo_image",
            field=models.ImageField(blank=True, null=True, upload_to="institution/logos/"),
        ),
        migrations.AddField(
            model_name="institutionsetting",
            name="orientation",
            field=models.CharField(default="portrait", max_length=20),
        ),
        migrations.AddField(
            model_name="institutionsetting",
            name="signature_image",
            field=models.ImageField(blank=True, null=True, upload_to="institution/signatures/"),
        ),
        migrations.AddField(
            model_name="institutionsetting",
            name="visible_fields",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
