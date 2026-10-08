import pytest

pytestmark = pytest.mark.django_db

REG = {'email': 'a@b.com', 'name': 'A', 'password': 'S3cure-pass!9', 'password_confirm': 'S3cure-pass!9'}


def test_register_login_refresh(client):
    r = client.post('/api/users/register/', REG, format='json')
    assert r.status_code == 201, r.data
    assert {'access', 'refresh'} <= set(r.data['tokens'])

    r = client.post('/api/users/login/', {'email': REG['email'], 'password': REG['password']}, format='json')
    assert r.status_code == 200
    refresh = r.data['tokens']['refresh']

    r = client.post('/api/users/token/refresh/', {'refresh': refresh}, format='json')
    assert r.status_code == 200 and 'access' in r.data


def test_login_wrong_password(client):
    client.post('/api/users/register/', REG, format='json')
    r = client.post('/api/users/login/', {'email': REG['email'], 'password': 'nope'}, format='json')
    assert r.status_code == 401


def test_register_password_mismatch(client):
    r = client.post('/api/users/register/', {**REG, 'password_confirm': 'different'}, format='json')
    assert r.status_code == 400


def test_profile_requires_auth(client):
    assert client.get('/api/users/profile/').status_code == 401
    tokens = client.post('/api/users/register/', REG, format='json').data['tokens']
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    r = client.get('/api/users/profile/')
    assert r.status_code == 200 and r.data['email'] == REG['email']


def test_logout_blacklists_refresh_token(client):
    tokens = client.post('/api/users/register/', REG, format='json').data['tokens']
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    r = client.post('/api/users/logout/', {'refresh_token': tokens['refresh']}, format='json')
    assert r.status_code == 200, r.data
    client.credentials()
    assert client.post('/api/users/token/refresh/', {'refresh': tokens['refresh']}, format='json').status_code == 401


def test_refresh_rotates_and_rejects_old_token(client):
    tokens = client.post('/api/users/register/', REG, format='json').data['tokens']
    r = client.post('/api/users/token/refresh/', {'refresh': tokens['refresh']}, format='json')
    assert r.status_code == 200 and r.data['refresh'] != tokens['refresh']
    assert client.post('/api/users/token/refresh/', {'refresh': tokens['refresh']}, format='json').status_code == 401
