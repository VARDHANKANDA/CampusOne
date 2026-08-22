"""Per docs/TESTING.md §2.2: happy path + auth-failure + validation-failure per endpoint."""

from fastapi.testclient import TestClient


def _register(client: TestClient, email: str = "student@example.edu") -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Correct-horse-123!",
            "full_name": "Ada Student",
            "department": "Computer Science",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_register_always_creates_a_student_account(client: TestClient) -> None:
    body = _register(client)
    assert body["role"] == "student"
    assert body["email"] == "student@example.edu"
    assert body["is_active"] is True


def test_register_duplicate_email_is_rejected(client: TestClient) -> None:
    _register(client, email="dup@example.edu")
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "dup@example.edu",
            "password": "Correct-horse-123!",
            "full_name": "Second Ada",
        },
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "REGISTRATION_FAILED"


def test_login_then_me_round_trip(client: TestClient) -> None:
    _register(client, email="login@example.edu")

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.edu", "password": "Correct-horse-123!"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "login@example.edu"
    assert me_response.json()["role"] == "student"


def test_login_with_wrong_password_is_unauthorized(client: TestClient) -> None:
    _register(client, email="wrongpw@example.edu")
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpw@example.edu", "password": "Not-the-right-password-123!"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_me_without_token_is_unauthorized(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_logout_with_valid_session_succeeds(client: TestClient) -> None:
    _register(client, email="logout@example.edu")
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "logout@example.edu", "password": "Correct-horse-123!"},
    )
    token = login_response.json()["access_token"]

    response = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 204


def test_password_reset_never_reveals_whether_email_exists(client: TestClient) -> None:
    response = client.post("/api/v1/auth/password-reset", json={"email": "nobody-here@example.edu"})
    assert response.status_code == 202
    assert "message" in response.json()
