import os
import subprocess
import sys


def debug_for(env_value):
    env = {**os.environ, 'DJANGO_SETTINGS_MODULE': 'core.settings'}
    env.pop('DEBUG', None)
    if env_value is not None:
        env['DEBUG'] = env_value
    # stub load_dotenv so a developer's local .env cannot influence the result
    code = 'import dotenv; dotenv.load_dotenv = lambda *a, **k: None; '\
           'from django.conf import settings; print(settings.DEBUG)'
    return subprocess.run([sys.executable, '-c', code], env=env, capture_output=True, text=True,
                          cwd=os.path.dirname(os.path.dirname(__file__))).stdout.strip().splitlines()[-1]


def test_debug_is_off_unless_explicitly_enabled():
    assert debug_for(None) == 'False'
    assert debug_for('True') == 'True'
    assert debug_for('False') == 'False'
