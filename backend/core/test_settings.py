from .settings import *  # noqa: F401,F403

GEMINI_API_KEY = 'test-gemini'
YOUTUBE_API_KEY = 'test-youtube'
REDIS_URL = 'redis://localhost:1/0'  # unreachable on purpose; tests inject fakeredis
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
