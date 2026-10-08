from django.http import JsonResponse

from utils.mongo import ensure_connected


def ping(request):
    return JsonResponse({"status": "ok"})


def health(request):
    """Reports MongoDB reachability (503 if down). /ping/ stays dependency-free for wake-up probes."""
    try:
        if not ensure_connected():
            raise ConnectionError("not connected")
        import mongoengine
        mongoengine.get_connection().admin.command('ping')
        return JsonResponse({"status": "ok", "mongo": "up"})
    except Exception:
        return JsonResponse({"status": "degraded", "mongo": "down"}, status=503)
