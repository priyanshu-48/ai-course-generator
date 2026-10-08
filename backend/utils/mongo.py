import logging
import threading
import time

import mongoengine
from django.conf import settings
from mongoengine.connection import _connections

logger = logging.getLogger(__name__)

RETRY_SECONDS = 5
_lock = threading.Lock()
_last_attempt = 0.0


def ensure_connected():
    """Connect to MongoDB on first use, and keep retrying (rate-limited) if it was unreachable.

    Atlas free clusters pause when idle; connecting once at import time made the app permanently
    broken until restarted if the cluster was down at that moment.
    """
    global _last_attempt
    if 'default' in _connections:
        return True
    if not settings.MONGODB_URI:
        return False
    with _lock:
        if 'default' in _connections:
            return True
        if time.monotonic() - _last_attempt < RETRY_SECONDS:
            return False
        _last_attempt = time.monotonic()
        try:
            mongoengine.connect(host=settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
            logger.info("MongoDB connected")
            return True
        except Exception as e:
            logger.error(f"MongoDB connection failed (will retry): {e}")
            return False


class MongoConnectionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/'):
            ensure_connected()
        return self.get_response(request)
