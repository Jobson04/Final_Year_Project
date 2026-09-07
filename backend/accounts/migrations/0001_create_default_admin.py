from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.db import migrations


def create_default_admin(apps, schema_editor):
    User = get_user_model()
    user, _ = User.objects.get_or_create(username="admin")
    user.email = "admin@example.com"
    user.password = make_password("admin123")
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.save()


def preserve_existing_admin(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [("auth", "0012_alter_user_first_name_max_length")]
    operations = [migrations.RunPython(create_default_admin, preserve_existing_admin)]
