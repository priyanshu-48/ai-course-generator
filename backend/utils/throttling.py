import logging

from rest_framework.throttling import SimpleRateThrottle

logger = logging.getLogger(__name__)


class FailOpenThrottle:
    """If the throttle store (Redis) is unreachable, allow the request instead of erroring."""

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except Exception as e:
            logger.warning(f"Throttle store unavailable, allowing request: {e}")
            return True


class GenerateIPThrottle(FailOpenThrottle, SimpleRateThrottle):
    """Per client IP. Behind a proxy set NUM_PROXIES so the real client IP is used."""
    scope = 'generate_ip'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class GenerateGlobalThrottle(FailOpenThrottle, SimpleRateThrottle):
    """One shared bucket for all clients, so many IPs together cannot exhaust the API quotas."""
    scope = 'generate_global'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': 'all'}
