import copy
import sys
from pathlib import Path
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

# Ensure src directory is on the path so we can import the app module.
sys.path.append(str(Path(__file__).resolve().parent.parent / "src"))

from app import app, activities  # noqa: E402


@pytest.fixture(autouse=True)
def reset_activities():
    """
    Fixture that resets the in-memory activities dictionary before each test.
    This ensures tests are isolated and can freely mutate the global state.
    """
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(original)


client = TestClient(app)


def test_get_activities_initial():
    # Arrange / Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "Chess Club" in data
    assert len(data["Chess Club"]["participants"]) == 2


def test_signup_new_participant():
    # Arrange
    new_email = "newstudent@mergington.edu"
    club = quote("Chess Club", safe="")

    # Act
    response = client.post(f"/activities/{club}/signup", params={"email": new_email})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {new_email} for Chess Club"}

    # verify participant was added
    resp2 = client.get("/activities")
    assert new_email in resp2.json()["Chess Club"]["participants"]


def test_signup_existing_participant():
    # Arrange
    existing = "michael@mergington.edu"
    club = quote("Chess Club", safe="")

    # Act
    response = client.post(f"/activities/{club}/signup", params={"email": existing})

    # Assert
    assert response.status_code == 400


def test_remove_participant_and_verify():
    # Arrange
    email = "removeme@mergington.edu"
    club = quote("Chess Club", safe="")
    # sign up first so there is someone to remove
    client.post(f"/activities/{club}/signup", params={"email": email})

    # Act
    response = client.delete(f"/activities/{club}/participants", params={"email": email})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Removed {email} from Chess Club"}

    # verify removal
    resp2 = client.get("/activities")
    assert email not in resp2.json()["Chess Club"]["participants"]


def test_remove_nonexistent_participant():
    # Arrange / Act
    club = quote("Chess Club", safe="")
    response = client.delete(f"/activities/{club}/participants", params={"email": "absent@mergington.edu"})

    # Assert
    assert response.status_code == 404


def test_root_redirects_to_index():
    # Act
    response = client.get("/")

    # Assert
    # TestClient follows redirects by default, so we expect the final URL
    assert response.status_code == 200
    assert response.url.endswith("/static/index.html")
