import os

from django.core.wsgi import get_wsgi_application
from courses.models import Course

try:
    Course.objects.delete()
    print("All demo courses cleared on startup")
except Exception as e:
    print(f"Skipping demo cleanup: {e}")


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

application = get_wsgi_application()



