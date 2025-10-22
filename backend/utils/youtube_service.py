import requests
import logging
from django.conf import settings
from .redis_client import redis_client

logger = logging.getLogger(__name__)

class YouTubeService:
    def __init__(self):
        self.api_key = settings.YOUTUBE_API_KEY
        self.base_url = "https://www.googleapis.com/youtube/v3/search"
        self.cache_ttl = settings.YOUTUBE_CACHE_TTL
        self.cache_prefix = "youtube:"

    def search_video(self, search_term, max_results=1):
        if not self.api_key:
            logger.warning("YOUTUBE_API_KEY not set. Returning search term.")
            return f"search:{search_term}"

        cache_key = f"{self.cache_prefix}{search_term.lower().strip()}"

        if redis_client:
            try:
                cached_url = redis_client.get(cache_key)
                if cached_url:
                    logger.info(f"Cache hit: {search_term}")
                    return cached_url
                logger.info(f"Cache miss: {search_term}")
            except Exception as e:
                logger.warning(f"Redis get error: {e}")

        try:
            params = {
                'part': 'snippet',
                'q': search_term,
                'type': 'video',
                'maxResults': max_results,
                'key': self.api_key,
                'videoEmbeddable': 'true',
                'videoSyndicated': 'true',
                'relevanceLanguage': 'en',
                'safeSearch': 'strict',
                'order': 'relevance'
            }

            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if 'items' in data and len(data['items']) > 0:
                video_id = data['items'][0]['id']['videoId']
                video_url = f"https://www.youtube.com/watch?v={video_id}"

                if redis_client:
                    try:
                        redis_client.setex(cache_key, self.cache_ttl, video_url)
                        logger.info(f"Cached: {search_term} -> {video_url} (TTL: {self.cache_ttl}s)")
                    except Exception as e:
                        logger.warning(f"Redis set error: {e}")

                return video_url
            else:
                logger.warning(f"No videos found for: {search_term}")
                return f"search:{search_term}"

        except requests.exceptions.RequestException as e:
            logger.error(f"YouTube API error: {e}")
            return f"search:{search_term}"
        except Exception as e:
            logger.error(f"Error searching YouTube: {e}")
            return f"search:{search_term}"


youtube_service = YouTubeService()
