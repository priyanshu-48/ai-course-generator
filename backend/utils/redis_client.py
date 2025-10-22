import redis
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def get_redis_client():
    try:
        client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2
        )
        client.ping()
        logger.info("Redis connected successfully.")
        return client
    except (redis.ConnectionError, redis.TimeoutError) as e:
        logger.warning(f"Redis not available: {e}. Caching disabled.")
        return None
    except Exception as e:
        logger.error(f"Redis error: {e}")
        return None


redis_client = get_redis_client()
